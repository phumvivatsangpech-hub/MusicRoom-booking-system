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
    const userId = (session.user as any).id;

    const complaints = await prisma.complaint.findMany({
      include: {
        user: { select: { name: true, email: true, studentId: true } }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(complaints);
  } catch (error) {
    console.error("GET complaints error:", error);
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
    const { title, content, photoUrl } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const complaint = await prisma.complaint.create({
      data: {
        userId,
        title,
        content,
        photoUrl,
        status: "PENDING",
      }
    });

    return NextResponse.json(complaint, { status: 201 });
  } catch (error) {
    console.error("POST complaint error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
