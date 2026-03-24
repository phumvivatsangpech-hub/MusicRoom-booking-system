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
    const userId = (session.user as any).id;

    // Verify Admin
    const currentUser = await prisma.user.findUnique({ where: { id: userId }});
    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { status, adminNote } = body;

    const { id } = await params;

    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(adminNote !== undefined && { adminNote })
      }
    });

    return NextResponse.json(complaint);
  } catch (error) {
    console.error("PATCH complaint error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
