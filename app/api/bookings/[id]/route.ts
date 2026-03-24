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
    const body = await req.json();
    const { photoBeforeUrl, photoAfterUrl, status } = body;

    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id }
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Only allow actual user or Admin to modify (Wait, we'll just check userId here)
    // To allow admin, we would need to fetch user role. 
    // For now, if user is not the owner, assume they might not have permission unless admin.
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = currentUser?.role === "ADMIN";

    if (booking.userId !== userId && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        ...(photoBeforeUrl !== undefined && { photoBeforeUrl }),
        ...(photoAfterUrl !== undefined && { photoAfterUrl }),
        ...(photoBeforeUrl && { status: "IN_USE" }), // Transition status when before photo changes
        ...(photoAfterUrl && { status: "COMPLETED" }), // Transition status when after photo changes
        ...(status && { status }), // manual status override
      }
    });

    return NextResponse.json(updatedBooking);

  } catch (error) {
    console.error("PATCH booking error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
