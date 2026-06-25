import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SeoToolsClient from "./seo-tools-client";

export const dynamic = "force-dynamic";

export default async function SeoToolsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="w-full">
      <SeoToolsClient />
    </div>
  );
}
