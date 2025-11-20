'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  RefreshCw,
  ShoppingCart,
  UserCircle,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthSession } from '@/components/providers/AuthSessionProvider';
import { swalLoading, swalSuccess, swalError, swalClose } from '@/lib/swal';

const navigation = [
  { name: 'Panel de Control', href: '/', icon: LayoutDashboard },
  { name: 'Productos', href: '/products', icon: Package },
  { name: 'Inventario', href: '/inventory', icon: Warehouse },
  { name: 'Reabastecimiento', href: '/replenishment', icon: RefreshCw },
  { name: 'Orden de compra', href: '/purchase-orders', icon: ShoppingCart },
  { name: 'Importaciones', href: '/imports', icon: FileSpreadsheet },
  { name: 'Perfil', href: '/profile', icon: UserCircle }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthSession();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return; // evitar doble click
    setSigningOut(true);

    swalLoading('Cerrando sesión...', 'Limpiando sesión actual');

    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data.error || 'No se pudo cerrar sesión correctamente.';
        swalClose();
        await swalError('Error al cerrar sesión', msg);
        setSigningOut(false);
        return;
      }

      swalClose();
      await swalSuccess('Sesión cerrada', 'Hasta pronto.');

      // Redirigir al login
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error(err);
      swalClose();
      await swalError('Error al cerrar sesión', err.message || 'No se pudo cerrar sesión.');
      setSigningOut(false);
    }
  }

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex h-16 items-center px-6 border-b">
        <h1 className="text-xl font-bold text-primary">StockFlow</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Button
              key={item.name}
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn('w-full justify-start', isActive && 'bg-secondary')}
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
          {user?.full_name || 'Usuario'}
        </div>
        <div className="mb-4 text-xs text-muted-foreground">
          {user?.email}
        </div>
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="w-full"
          disabled={signingOut}
        >
          {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">v1.0 • ELINEAS</p>
      </div>
    </div>
  );
}
