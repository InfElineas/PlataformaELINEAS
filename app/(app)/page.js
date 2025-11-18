// app/(app)/page.js  ← sin 'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Warehouse, AlertCircle, TrendingUp } from 'lucide-react';

async function getStats() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  let productsRes, storesRes, posRes;
  try {
    [productsRes, storesRes, posRes] = await Promise.all([
      fetch(`${base}/api/products?limit=1`, { cache: 'no-store' }),
      fetch(`${base}/api/stores`, { cache: 'no-store' }),
      fetch(`${base}/api/purchase-orders?status=draft`, { cache: 'no-store' }),
    ]);
  } catch (e) {
    productsRes = storesRes = posRes = null;
  }

  const products = productsRes && productsRes.ok ? await productsRes.json() : { total: 0 };
  const stores   = storesRes && storesRes.ok   ? await storesRes.json()   : { data: [] };
  const pos      = posRes && posRes.ok         ? await posRes.json()      : { data: [] };

  return {
    totalProducts: Number(products?.total ?? 0),
    totalStores: Array.isArray(stores?.data) ? stores.data.length : 0,
    lowStockItems: 0,
    pendingPOs: Array.isArray(pos?.data) ? pos.data.length : 0,
  };
}

export default async function Dashboard() {
  const stats = await getStats();

  const cards = [
    { title: 'Total Products', value: stats.totalProducts, icon: Package,  color: 'text-blue-600' },
    { title: 'Stores',         value: stats.totalStores,   icon: Warehouse, color: 'text-green-600' },
    { title: 'Low Stock Items',value: stats.lowStockItems, icon: AlertCircle,color: 'text-orange-600' },
    { title: 'Pending POs',    value: stats.pendingPOs,    icon: TrendingUp, color: 'text-purple-600' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your inventory system</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">🎯 Generate Replenishment Plan</h3>
              <p className="text-sm text-muted-foreground">
                Go to Replenishment to generate intelligent restocking suggestions based on your inventory data.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📦 Manage Products</h3>
              <p className="text-sm text-muted-foreground">
                View and edit your product catalog in the Products section.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📊 Check Inventory</h3>
              <p className="text-sm text-muted-foreground">
                Monitor stock levels across all stores in the Inventory view.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
