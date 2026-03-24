import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await req.json();
    const { postId, reason } = body;

    if (!postId || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        userId,
        postId,
        reason,
      }
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("POST report error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
