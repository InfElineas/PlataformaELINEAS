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
            <button onClick={() => setSidebarOpen(!sidebarOpen)}>
              <h1 className="text-xl font-bold text-primary">ELÍNEAS</h1>
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
            <p className="mt-4 text-xs text-muted-foreground">v1.0 • ELÍNEAS</p>
          </div>
        </div>
      }
      open={sidebarOpen}
      onSetOpen={setSidebarOpen}
    >
      <button onClick={() => setSidebarOpen(!sidebarOpen)}>
        Abrir barra lateral
      </button>
    </Sidebar>
  );
}
