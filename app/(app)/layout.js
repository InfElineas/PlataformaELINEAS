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
      <SidebarHandler>{children}</SidebarHandler>
    </AuthSessionProvider>
  );
}
