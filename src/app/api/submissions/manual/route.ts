import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId, base64Image } = await request.json();

    if (!postId || !base64Image) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upsert checkin for MANUAL
    const existing = await db.checkin.findFirst({
      where: {
        user_id: session.user.id,
        post_id: postId,
      },
    });

    let checkin;
    if (existing) {
      checkin = await db.checkin.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          image_url: base64Image,
        },
      });
    } else {
      checkin = await db.checkin.create({
        data: {
          user_id: session.user.id,
          post_id: postId,
          status: "PENDING",
          image_url: base64Image,
        },
      });
    }

    return NextResponse.json({ success: true, submission: checkin });

  } catch (error: any) {
    console.error("Manual upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
