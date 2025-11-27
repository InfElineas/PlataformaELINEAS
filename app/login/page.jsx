import LoginForm from "@/components/auth/LoginForm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }) {
  const session = await getSessionFromCookies();
  const redirectTo =
    typeof searchParams?.next === "string" ? searchParams.next : "/";

  if (session?.user) {
    redirect(redirectTo);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-background/60 p-8 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Plataforma{" "}
            <span className="text-blue-800">
              <span className="text-red-800">E</span>líneas
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ingresa tus credenciales para continuar
          </p>
        </div>
        <LoginForm redirectTo={redirectTo} />
      </div>
      <p className="mt-6 text-xs text-white/70">
        © {new Date().getFullYear()} Plataforma Elíneas
      </p>
    </div>
  );
}
