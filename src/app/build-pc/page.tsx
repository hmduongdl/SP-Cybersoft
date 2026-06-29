import { auth } from "@/auth";
import { redirect } from "next/navigation";
import BuildPcClient from "./build-pc-client";

export const dynamic = "force-dynamic";

export default async function BuildPcPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="w-full">
      <BuildPcClient />
    </div>
  );
}
