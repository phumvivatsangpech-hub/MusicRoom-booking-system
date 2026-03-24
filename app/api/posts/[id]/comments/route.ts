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

    const body = await req.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }

    const { id } = await params;
    
    const comment = await prisma.comment.create({
      data: {
        userId,
        postId: id,
        content,
      }
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("POST comment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
