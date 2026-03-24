import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = (session.user as any)?.role === "ADMIN";
    const userId = (session.user as any)?.id;

    // We must fetch the actual user role from DB to be safe if session lacks it
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    const isActuallyAdmin = currentUser?.role === "ADMIN";

    const posts = await prisma.post.findMany({
      where: { 
        isDeleted: false,
        ...(isActuallyAdmin ? {} : {
          OR: [
            { isApproved: true },
            { userId }
          ]
        })
      },
      include: {
        user: { select: { id: true, name: true, image: true, email: true } },
        comments: {
          where: { isDeleted: false },
          include: {
            user: { select: { id: true, name: true, image: true, email: true } }
          },
          orderBy: { createdAt: "asc" }
        },
        reports: true,
        pollOptions: {
          include: { _count: { select: { votes: true } } }
        },
        pollVotes: true,
        likes: true
      },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" }
      ],
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

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.banUntil && new Date(user.banUntil) > new Date()) {
      return NextResponse.json({ error: `คุณถูกระงับสิทธิ์จนถึง ${new Date(user.banUntil).toLocaleString('th-TH')}` }, { status: 403 });
    }

    const body = await req.json();
    const { content, mediaUrl, mediaType, isPoll, pollOptions } = body;

    if (!content && !mediaUrl && !isPoll) {
      return NextResponse.json({ error: "Post cannot be empty" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        userId,
        content: content || "",
        ...(mediaUrl && { mediaUrl }),
        ...(mediaType && { mediaType }),
        isPoll: isPoll || false,
        isApproved: user?.role === "ADMIN" ? true : !(isPoll),
        ...(isPoll && pollOptions?.length > 0 && {
          pollOptions: {
            create: pollOptions.map((text: string) => ({ text }))
          }
        })
      }
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("POST post error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
