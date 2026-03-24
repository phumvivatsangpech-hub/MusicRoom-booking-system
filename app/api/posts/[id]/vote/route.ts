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
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.banUntil && new Date(user.banUntil) > new Date()) {
      return NextResponse.json({ error: "คุณถูกระงับสิทธิ์" }, { status: 403 });
    }

    const body = await req.json();
    const { pollOptionId } = body;

    if (!pollOptionId) return NextResponse.json({ error: "Missing poll option" }, { status: 400 });

    const existingVote = await prisma.pollVote.findUnique({
      where: {
        userId_postId: {
          userId,
          postId: id
        }
      }
    });

    if (existingVote) {
      return NextResponse.json({ error: "You have already voted" }, { status: 400 });
    }

    const vote = await prisma.pollVote.create({
      data: {
        userId,
        postId: id,
        pollOptionId
      }
    });

    return NextResponse.json(vote, { status: 201 });
  } catch (error) {
    console.error("POST poll vote error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
