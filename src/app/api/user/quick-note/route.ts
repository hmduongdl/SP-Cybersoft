import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { quick_note: true },
    });

    return NextResponse.json({ quick_note: user?.quick_note || "" });
  } catch (error) {
    console.error("Error getting quick note:", error);
    return NextResponse.json({ error: "Failed to get quick note" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { quick_note } = body;

    const user = await db.user.update({
      where: { id: session.user.id },
      data: { quick_note: quick_note ?? "" },
      select: { quick_note: true },
    });

    return NextResponse.json({ quick_note: user.quick_note });
  } catch (error) {
    console.error("Error updating quick note:", error);
    return NextResponse.json({ error: "Failed to update quick note" }, { status: 500 });
  }
}
