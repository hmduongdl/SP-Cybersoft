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
    <div className="flex flex-col h-full w-full overflow-hidden">
      <SessionProvider session={session}>
        {children}
      </SessionProvider>
    </div>
  );
}
