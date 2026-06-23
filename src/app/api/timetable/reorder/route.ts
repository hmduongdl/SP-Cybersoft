import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/timetable/reorder
 * Body: { orderedIds: string[] }  — IDs of FREE rows in their new order.
 *
 * The server re-fetches the user's locked rows (anchors) and merges them
 * back at their fixed positions, so the client cannot accidentally move them.
 *
 * Anchor positions (by row_type):
 *   anchor_start → always order = 0        (first row of morning)
 *   anchor_mid   → always order = MAX_AM    (last row before afternoon)
 *   anchor_end   → always order = TOTAL - 1 (absolute last row)
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { orderedIds: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { orderedIds } = body;
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: "orderedIds must be a non-empty array" }, { status: 400 });
  }

  // ── 1. Fetch all rows to verify ownership and extract anchors ────────────
  const allRows = await prisma.timetableRow.findMany({
    where: { user_id: userId },
    select: { id: true, row_type: true, is_locked: true, order: true },
  });

  const ownedIds = new Set(allRows.map((r: { id: string }) => r.id));

  // Security: reject any IDs that don't belong to this user
  const invalidId = orderedIds.find((id) => !ownedIds.has(id));
  if (invalidId) {
    return NextResponse.json(
      { error: `Row ${invalidId} does not belong to this user.` },
      { status: 403 },
    );
  }

  // Security: reject if caller tries to reorder a locked row
  const lockedRows = allRows.filter((r: { is_locked: boolean }) => r.is_locked);
  const lockedIds = new Set(lockedRows.map((r: { id: string }) => r.id));
  const attemptedLockedMove = orderedIds.find((id) => lockedIds.has(id));
  if (attemptedLockedMove) {
    return NextResponse.json(
      { error: "Cannot reorder locked (anchor) rows." },
      { status: 403 },
    );
  }

  // ── 2. Find anchor rows by type ──────────────────────────────────────────
  const anchorStart = allRows.find((r: { row_type: string }) => r.row_type === "anchor_start");
  const anchorMid   = allRows.find((r: { row_type: string }) => r.row_type === "anchor_mid");
  const anchorEnd   = allRows.find((r: { row_type: string }) => r.row_type === "anchor_end");

  // ── 3. Build the full ordered list by re-inserting anchors ───────────────
  //
  // Layout invariant:
  //   [0]           anchor_start   (Khởi động)
  //   [1..N-2]      free rows (morning + afternoon mixed, user-defined order)
  //   [N-1]         anchor_mid     (Tổng kết buổi sáng) — sits between sessions
  //   ... more free rows ...
  //   [LAST-1]      anchor_end     (Tổng kết cuối ngày)
  //
  // We trust the client's free-row ordering and simply pin anchors at their
  // canonical positions.

  const freeRows = orderedIds; // client-supplied order of free rows

  // Split free rows into morning and afternoon groups based on their
  // current order relative to anchor_mid's original position.
  const anchorMidCurrentOrder = anchorMid?.order ?? 99;
  const morningFreeRows = freeRows.filter((id) => {
    const row = allRows.find((r: { id: string }) => r.id === id);
    return row && row.order < anchorMidCurrentOrder;
  });
  const afternoonFreeRows = freeRows.filter((id) => {
    const row = allRows.find((r: { id: string }) => r.id === id);
    return row && row.order > anchorMidCurrentOrder;
  });

  // Compose final order:
  // anchor_start → morning free → anchor_mid → afternoon free → anchor_end
  const finalOrder: string[] = [];
  if (anchorStart) finalOrder.push(anchorStart.id);
  finalOrder.push(...morningFreeRows);
  if (anchorMid) finalOrder.push(anchorMid.id);
  finalOrder.push(...afternoonFreeRows);
  if (anchorEnd) finalOrder.push(anchorEnd.id);

  // ── 4. Persist in a transaction ──────────────────────────────────────────
  const updates = finalOrder.map((id, index) =>
    prisma.timetableRow.update({
      where: { id },
      data: { order: index },
    }),
  );

  await prisma.$transaction(updates);

  return NextResponse.json({
    message: "Thứ tự hàng đã được cập nhật.",
    order: finalOrder,
  });
}
