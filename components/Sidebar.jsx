"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  RefreshCw,
  ShoppingCart,
  UserCircle,
  FileSpreadsheet,
  PanelLeftOpen,
  PanelLeftClose,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import Swal from "sweetalert2";

const navigation = [
  { name: "Tablero general", href: "/", icon: LayoutDashboard },
  { name: "Productos", href: "/products", icon: Package },
  { name: "Inventario", href: "/inventory", icon: Warehouse },
  { name: "Reabastecimiento", href: "/replenishment", icon: RefreshCw },
  { name: "Órdenes de compra", href: "/purchase-orders", icon: ShoppingCart },
  { name: "Importaciones", href: "/imports", icon: FileSpreadsheet },
  { name: "Perfil", href: "/profile", icon: UserCircle },
];

const EXPANDED_WIDTH = 256;
const COLLAPSED_WIDTH = 72;

export default function SidebarHandler({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthSession();

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const contentPadding = useMemo(
    () => ({
      marginLeft: collapsed ? `${COLLAPSED_WIDTH}px` : `${EXPANDED_WIDTH}px`,
    }),
    [collapsed]
  );

  async function handleSignOut() {
    // Mostrar loader
    Swal.fire({
      title: "Cerrando sesión…",
      text: "Por favor espera",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      if (!response.ok) {
        // Cerrar loader antes de mostrar error
        Swal.close();
        await Swal.fire({
          icon: "error",
          title: "Error al cerrar sesión",
          text: "No se pudo cerrar sesión. Intenta nuevamente.",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        return;
      }

      // Logout exitoso
      Swal.close();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed", err);
      Swal.close();
      await Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo cerrar sesión. Intenta nuevamente.",
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-[15px] sm:text-[16px]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 flex h-full flex-col border-r bg-card transition-all duration-300 ease-in-out",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b px-4 transition-all duration-300 ease-in-out",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <button
            className={cn(
              "flex items-center gap-2 text-blue-800 transition-all duration-300 ease-in-out",
              collapsed && "justify-center"
            )}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          >
            <h1 className="text-xl font-bold leading-none">
              {collapsed ? (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-lg text-blue-800 ring-1 ring-inset ring-blue-100">
                  E
                </span>
              ) : (
                <>
                  <span className="text-red-800">E</span>líneas
                </>
              )}
            </h1>
            {collapsed ? (
              <PanelLeftOpen className="h-6 w-6" />
            ) : (
              <PanelLeftClose className="h-6 w-6" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Button
                key={item.name}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full items-center transition-all duration-300 ease-in-out",
                  collapsed
                    ? "justify-center px-0"
                    : "justify-start gap-3 px-4",
                  isActive && "bg-secondary"
                )}
                onClick={() => router.push(item.href)}
                title={item.name}
              >
                <Icon className="h-5 w-5" />
                <span className={collapsed ? "sr-only" : "inline"}>
                  {item.name}
                </span>
              </Button>
            );
          })}
        </nav>

        <div className="border-t p-4 space-y-2">
          {!collapsed && (
            <>
              <div className="text-sm font-medium">
                {user?.full_name || "Usuario"}
              </div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </>
          )}
          <Button
            onClick={handleSignOut}
            variant="outline"
            className={cn(
              "w-full items-center transition-all duration-300 ease-in-out",
              collapsed ? "justify-center px-0" : "justify-start gap-2 px-4"
            )}
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            <span className={collapsed ? "sr-only" : "inline"}>
              Cerrar sesión
            </span>
          </Button>
          <p
            className={cn(
              "text-xs text-muted-foreground transition-opacity",
              collapsed ? "text-center" : "text-left"
            )}
          >
            {collapsed ? "v1.0" : "v1.0 • Elíneas"}
          </p>
        </div>
      </aside>

      <div
        className="flex min-h-screen flex-1 flex-col transition-[margin] duration-300 ease-in-out"
        style={contentPadding}
      >
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </Button>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">Panel</p>
              <p className="text-xs text-muted-foreground">
                Gestiona catálogos e inventario
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-background px-3 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-screen-2xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
