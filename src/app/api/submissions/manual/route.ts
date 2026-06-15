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
    const checkin = await db.checkin.upsert({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: postId,
        },
      },
      update: {
        status: "PENDING",
        evidenceType: "MANUAL_SCREENSHOT",
        evidenceUrl: base64Image, // Storing base64 for mockup purposes
        image_url: base64Image,
      },
      create: {
        userId: session.user.id,
        postId: postId,
        status: "PENDING",
        evidenceType: "MANUAL_SCREENSHOT",
        evidenceUrl: base64Image,
        image_url: base64Image,
      },
    });

    return NextResponse.json({ success: true, submission: checkin });

  } catch (error: any) {
    console.error("Manual upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
