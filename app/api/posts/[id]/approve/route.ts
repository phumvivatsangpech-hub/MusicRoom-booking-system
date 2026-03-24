import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({ where: { id: (session.user as any).id }});
    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const { id } = await params;

    const post = await prisma.post.update({
      where: { id },
      data: { isApproved: true }
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("PATCH approve poll error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
