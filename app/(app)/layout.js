import SidebarHandler from "@/components/Sidebar";
import { AuthSessionProvider } from "@/components/providers/AuthSessionProvider";
import { getSessionFromCookies } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }) {
  const session = await getSessionFromCookies();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AuthSessionProvider initialSession={session}>
      <div className="md:flex md:h-screen overflow-hidden">
        <SidebarHandler />
        <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      </div>
    </AuthSessionProvider>
  );
}
