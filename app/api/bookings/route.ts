import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    const whereClause: any = {
      status: { not: "CANCELLED" },
    };

    if (dateStr) {
      // Assuming dateStr is in YYYY-MM-DD format
      const startOfDay = new Date(dateStr);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setUTCHours(23, 59, 59, 999);

      whereClause.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true, studentId: true, faculty: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("GET bookings error:", error);
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
    const { date, startTime, endTime, faculty, studentId } = body;

    // 1. Calculate duration
    const startHour = parseInt(startTime.split(":")[0], 10);
    const endHour = parseInt(endTime.split(":")[0], 10);
    if (startHour < 9 || endHour > 21 || endHour <= startHour) {
      return NextResponse.json({ error: "เวลาที่เลือกไม่ถูกต้อง (ต้องอยู่ระหว่าง 09:00 - 21:00)" }, { status: 400 });
    }

    const duration = endHour - startHour;

    // 2. Check maximum 3 hrs per user per day
    const requestedDate = new Date(date);
    requestedDate.setUTCHours(0,0,0,0);
    const nextDate = new Date(requestedDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const userBookingsToday = await prisma.booking.findMany({
      where: {
        userId: userId,
        date: {
          gte: requestedDate,
          lt: nextDate,
        },
        status: { not: "CANCELLED" }
      }
    });

    let totalHoursToday = 0;
    for (const b of userBookingsToday) {
      const bhStart = parseInt(b.startTime.split(":")[0], 10);
      const bhEnd = parseInt(b.endTime.split(":")[0], 10);
      totalHoursToday += (bhEnd - bhStart);
    }

    if (totalHoursToday + duration > 3) {
      return NextResponse.json({ error: "คุณสามารถจองได้สูงสุด 3 ชั่วโมงต่อวันเท่านั้น" }, { status: 400 });
    }

    // 3. Check overlaps
    const overlaps = await prisma.booking.findMany({
      where: {
        date: {
          gte: requestedDate,
          lt: nextDate,
        },
        status: { not: "CANCELLED" },
        OR: [
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gt: startTime } }
            ]
          }
        ]
      }
    });

    if (overlaps.length > 0) {
      return NextResponse.json({ error: "เวลานี้มีคนจองไปแล้ว กรุณาเลือกเวลาอื่น" }, { status: 400 });
    }

    // Update user profile if faculty/studentId is provided
    if (faculty || studentId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(faculty && { faculty }),
          ...(studentId && { studentId }),
        }
      });
    }

    const booking = await prisma.booking.create({
      data: {
        userId: userId,
        date: requestedDate,
        startTime,
        endTime,
        status: "CONFIRMED",
      }
    });

    return NextResponse.json(booking, { status: 201 });

  } catch (error) {
    console.error("POST booking error:", error);
    return NextResponse.json({ error: "ระบบขัดข้องชั่วคราว ไม่สามารถจองได้ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
