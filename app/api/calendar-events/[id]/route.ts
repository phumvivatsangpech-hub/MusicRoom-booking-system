import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // Awaiting params support in Next 15 App router structure
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Need to await params if it's a promise (Next.js 15 breaking change behavior depending on version)
    // As observed previously, if this isn't awaited it might break in v15+ API signatures
    const resolvedParams = await params;
    
    if (!resolvedParams?.id) {
       return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    await prisma.calendarEvent.delete({
      where: { id: resolvedParams.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE calendar event error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
