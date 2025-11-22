"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Warehouse, AlertCircle, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStores: 0,
    lowStockItems: 0,
    pendingPOs: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const [productsRes, storesRes, posRes] = await Promise.all([
        fetch("/api/products?limit=1"),
        fetch("/api/stores"),
        fetch("/api/purchase-orders?status=draft"),
      ]);

      const products = await productsRes.json();
      const stores = await storesRes.json();
      const pos = await posRes.json();

      setStats({
        totalProducts: products.total || 0,
        totalStores: stores.data?.length || 0,
        lowStockItems: 0,
        pendingPOs: pos.data?.length || 0,
      });
    }

    loadStats();
  }, []);

  const cards = [
    {
      title: "Total Products",
      value: stats.totalProducts,
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "Stores",
      value: stats.totalStores,
      icon: Warehouse,
      color: "text-green-600",
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockItems,
      icon: AlertCircle,
      color: "text-orange-600",
    },
    {
      title: "Pending POs",
      value: stats.pendingPOs,
      icon: TrendingUp,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your inventory system
        </p>
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
              <h3 className="font-semibold mb-2">
                🎯 Generate Replenishment Plan
              </h3>
              <p className="text-sm text-muted-foreground">
                Go to Replenishment to generate intelligent restocking
                suggestions based on your inventory data.
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
