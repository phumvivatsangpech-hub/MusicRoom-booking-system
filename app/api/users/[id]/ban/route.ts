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

    const body = await req.json();
    const { banUntil, banReason } = body;

    const { id } = await params;

    const user = await prisma.user.update({
      where: { id },
      data: {
        banUntil: banUntil ? new Date(banUntil) : null,
        banReason: banReason || null
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("PATCH ban user error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
