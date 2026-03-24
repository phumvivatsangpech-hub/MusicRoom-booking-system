import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // Fetch user role
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    const { id } = await params;
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (currentUser?.role !== "ADMIN" && post.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft Delete post (and comments)
    await prisma.comment.updateMany({ where: { postId: id }, data: { isDeleted: true } });
    await prisma.post.update({ where: { id }, data: { isDeleted: true } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE post error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { id } = await params;
    
    const body = await req.json();
    const { content } = body;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (post.userId !== userId && (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: { content }
    });

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("PATCH post error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
