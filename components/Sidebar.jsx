'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  RefreshCw,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Inventory', href: '/inventory', icon: Warehouse },
  { name: 'Replenishment', href: '/replenishment', icon: RefreshCw },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex h-16 items-center px-6 border-b">
        <h1 className="text-xl font-bold text-primary">StockFlow</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Button
              key={item.name}
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start',
                isActive && 'bg-secondary'
              )}
              onClick={() => router.push(item.href)}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Button>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground">v1.0 • ELINEAS</p>
      </div>
    </div>
  );
}