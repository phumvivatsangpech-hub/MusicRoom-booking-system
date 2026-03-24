import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, commentId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    
    const { id, commentId } = await params;
    
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });

    if (!comment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (currentUser?.role !== "ADMIN" && comment.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete comment
    await prisma.comment.update({ where: { id: commentId }, data: { isDeleted: true } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE comment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string, commentId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { commentId } = await params;
    
    const body = await req.json();
    const { content } = body;

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (comment.userId !== userId && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content }
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error("PATCH comment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
