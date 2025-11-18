import Sidebar from '@/components/Sidebar';
import { AuthSessionProvider } from '@/components/providers/AuthSessionProvider';
import { getSessionFromCookies } from '@/lib/auth/session';

export default async function AppLayout({ children }) {
  // El middleware ya garantiza que aquí solo entra gente autenticada.
  // Si por alguna razón no hay sesión, simplemente no rompemos la app.
  const session = await getSessionFromCookies();

  return (
    <AuthSessionProvider initialSession={session}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </AuthSessionProvider>
  );
}
