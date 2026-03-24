import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.banUntil && new Date(user.banUntil) > new Date()) {
      return NextResponse.json({ error: `คุณถูกระงับสิทธิ์จนถึง ${new Date(user.banUntil).toLocaleString('th-TH')}` }, { status: 403 });
    }

    const body = await req.json();
    const { content, parentId, mediaUrl, mediaType } = body;

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }

    const { id } = await params;
    
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parentComment || parentComment.postId !== id) {
        return NextResponse.json({ error: "Invalid parent comment" }, { status: 400 });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        postId: id,
        content: content || "",
        ...(parentId && { parentId }),
        ...(mediaUrl && { mediaUrl }),
        ...(mediaType && { mediaType }),
      }
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("POST comment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
