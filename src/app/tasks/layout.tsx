import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";

export default async function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col h-[calc(100vh-128px)] lg:h-[calc(100vh-140px)] w-full">
      <SessionProvider session={session}>
        {children}
      </SessionProvider>
    </div>
  );
}
