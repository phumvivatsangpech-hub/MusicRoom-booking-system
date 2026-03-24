import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const posts = await prisma.post.findMany({
      where: { isDeleted: false },
      include: {
        user: { select: { name: true, image: true, email: true } },
        comments: {
          where: { isDeleted: false },
          include: {
            user: { select: { name: true, image: true, email: true } }
          },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("GET posts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await req.json();
    const { content, mediaUrl, mediaType } = body;

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: "Post cannot be empty" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        userId,
        content: content || "",
        ...(mediaUrl && { mediaUrl }),
        ...(mediaType && { mediaType }),
      }
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("POST post error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
