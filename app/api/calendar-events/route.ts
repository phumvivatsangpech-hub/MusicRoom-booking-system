import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateQuery = searchParams.get("date"); // YYYY-MM-DD
    
    let whereClause: any = {};
    if (dateQuery) {
      const targetDate = new Date(dateQuery);
      whereClause = {
        date: targetDate,
      };
    }

    const events = await prisma.calendarEvent.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("GET calendar events error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { title, type, date, startTime, endTime } = await req.json();

    if (!title || !type || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cDate = new Date(date);

    const newEvent = await prisma.calendarEvent.create({
      data: {
        title,
        type,
        date: cDate,
        startTime: startTime || null,
        endTime: endTime || null
      }
    });

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error("POST calendar events error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
