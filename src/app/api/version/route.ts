import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const id =
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_APP_BUILD_ID ||
    "local-dev";

  return NextResponse.json(
    { id },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}
