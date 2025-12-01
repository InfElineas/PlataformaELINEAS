"use client";

import { useState } from "react";
import Sidebar from "react-sidebar";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  RefreshCw,
  ShoppingCart,
  UserCircle,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";

const navigation = [
  { name: "Tablero general", href: "/", icon: LayoutDashboard },
  { name: "Productos", href: "/products", icon: Package },
  { name: "Inventario", href: "/inventory", icon: Warehouse },
  { name: "Reabastecimiento", href: "/replenishment", icon: RefreshCw },
  { name: "Órdenes de compra", href: "/purchase-orders", icon: ShoppingCart },
  { name: "Importaciones", href: "/imports", icon: FileSpreadsheet },
  { name: "Perfil", href: "/profile", icon: UserCircle },
];

export default function SidebarHandler() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, permissions } = useAuthSession();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar
      sidebar={
        <div className="flex h-full md:w-64 flex-col bg-card border-r overflow-contain">
          <div className="flex h-16 items-center px-6 border-b">
            <button
              className="flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <h1 className="text-xl font-bold text-blue-800 mx-1">
                <span className="text-red-800">E</span>líneas
              </h1>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15"
                />
              </svg>
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
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
                    "w-full justify-start",
                    isActive && "bg-secondary",
                  )}
                  onClick={() => router.push(item.href)}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Button>
              );
            })}
          </nav>
          <div className="border-t p-4">
            <div className="mb-2 text-sm font-medium">
              {user?.full_name || "Usuario"}
            </div>
            <div className="mb-4 text-xs text-muted-foreground">
              {user?.email}
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              Cerrar sesión
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">v1.0 • Elíneas</p>
          </div>
        </div>
      }
      open={sidebarOpen}
      onSetOpen={setSidebarOpen}
    >
      <div className="flex h-16 items-center px-6 bg-card border-b">
        <button className="flex" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <h1 className="text-xl font-bold text-blue-800 mx-1">
            <span className="text-red-800">E</span>líneas
          </h1>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25"
            />
          </svg>
        </button>
      </div>
    </Sidebar>
  );
}
