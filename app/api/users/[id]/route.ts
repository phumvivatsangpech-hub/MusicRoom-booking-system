import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        instruments: true,
        posts: {
          where: { isDeleted: false, isApproved: true },
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, image: true, email: true } },
            comments: {
              where: { isDeleted: false },
              include: { user: { select: { id: true, name: true, image: true, email: true } } },
              orderBy: { createdAt: "asc" }
            },
            pollOptions: { include: { _count: { select: { votes: true } } } },
            pollVotes: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET user error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
