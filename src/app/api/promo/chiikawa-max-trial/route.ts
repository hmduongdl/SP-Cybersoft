import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getEffectivePlan } from "@/lib/plan-utils";
import {
  CHIIKAWA_TRIAL_DAYS,
  canSeeChiikawaPromo,
  getChiikawaTrialExpiresAt,
  isChiikawaPromoEligiblePlan,
  isChiikawaPromoEventActive,
} from "@/lib/chiikawa-promo";

export const dynamic = "force-dynamic";

async function getUserPromoState(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      plan: true,
      plan_expires_at: true,
      chiikawa_promo_claimed_at: true,
    },
  });

  if (!user) return null;

  const effectivePlan = getEffectivePlan(
    user.role,
    user.plan,
    user.plan_expires_at
  );

  return { user, effectivePlan };
}

function buildStatus(
  eventActive: boolean,
  claimed: boolean,
  eligible: boolean,
  effectivePlan: string,
  isAdminPreview = false
) {
  return {
    eventActive,
    claimed,
    eligible,
    effectivePlan,
    trialDays: CHIIKAWA_TRIAL_DAYS,
    isAdminPreview,
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventActive = isChiikawaPromoEventActive();
    const state = await getUserPromoState(session.user.id);

    if (!state) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { user, effectivePlan } = state;
    const claimed = !!user.chiikawa_promo_claimed_at;
    const isAdminPreview = user.role === "ADMIN";
    const eligible =
      eventActive &&
      canSeeChiikawaPromo(user.role, effectivePlan, claimed);

    return NextResponse.json(
      buildStatus(eventActive, claimed, eligible, effectivePlan, isAdminPreview)
    );
  } catch (error) {
    console.error("[ChiikawaPromo/GET]", error);
    return NextResponse.json(
      { error: "Không thể kiểm tra trạng thái ưu đãi." },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isChiikawaPromoEventActive()) {
      return NextResponse.json(
        { error: "Sự kiện ưu đãi Chiikawa đã kết thúc." },
        { status: 410 }
      );
    }

    const state = await getUserPromoState(session.user.id);
    if (!state) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { user, effectivePlan } = state;

    if (user.role === "ADMIN") {
      return NextResponse.json({
        success: true,
        preview: true,
        ...(process.env.NODE_ENV === "development" && {
          message: "Chế độ xem thử Admin — không thay đổi gói thật.",
        }),
      });
    }

    if (!isChiikawaPromoEligiblePlan(effectivePlan)) {
      return NextResponse.json(
        { error: "Ưu đãi chỉ dành cho người dùng gói FREE hoặc PRO." },
        { status: 400 }
      );
    }

    if (user.chiikawa_promo_claimed_at) {
      return NextResponse.json(
        { error: "Bạn đã nhận ưu đãi này rồi." },
        { status: 409 }
      );
    }

    const now = new Date();
    const expiresAt = getChiikawaTrialExpiresAt(now);

    const updatedUser = await db.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: session.user.id },
        data: {
          plan: "MAX",
          plan_expires_at: expiresAt,
          chiikawa_promo_claimed_at: now,
        },
        select: {
          plan: true,
          plan_expires_at: true,
          chiikawa_promo_claimed_at: true,
        },
      });

      await tx.subscription.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          plan: "max",
          expiresAt,
        },
        update: {
          plan: "max",
          expiresAt,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      plan: updatedUser.plan,
      plan_expires_at: updatedUser.plan_expires_at,
      trialDays: CHIIKAWA_TRIAL_DAYS,
    });
  } catch (error) {
    console.error("[ChiikawaPromo/POST]", error);
    return NextResponse.json(
      { error: "Không thể kích hoạt gói MAX dùng thử." },
      { status: 500 }
    );
  }
}
