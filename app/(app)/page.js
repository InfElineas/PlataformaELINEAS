'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Warehouse, AlertCircle, TrendingUp } from 'lucide-react';
import { swalLoading, swalSuccess, swalError, swalClose } from '@/lib/swal';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStores: 0,
    lowStockItems: 0,
    pendingPOs: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      swalLoading('Cargando panel', 'Sincronizando datos...');

      try {
        const [productsRes, storesRes, posRes] = await Promise.all([
          fetch('/api/products?limit=1'),
          fetch('/api/stores'),
          fetch('/api/purchase-orders?status=draft'),
        ]);

        if (!productsRes.ok || !storesRes.ok || !posRes.ok) {
          throw new Error('Error al obtener datos del servidor');
        }

        const [products, stores, pos] = await Promise.all([
          productsRes.json(),
          storesRes.json(),
          posRes.json(),
        ]);

        if (cancelled) return;

        setStats({
          totalProducts: products.total || 0,
          totalStores: stores.data?.length || 0,
          lowStockItems: 0,
          pendingPOs: pos.data?.length || 0,
        });

        swalClose();
        swalSuccess('Datos actualizados', '');
      } catch (err) {
        console.error(err);
        swalClose();
        swalError(
          'Error al cargar datos',
          err.message || 'Revisa el backend o la conexión.',
        );
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    { title: 'Total Productos', value: stats.totalProducts, icon: Package, color: 'text-blue-600' },
    { title: 'Almacenes', value: stats.totalStores, icon: Warehouse, color: 'text-green-600' },
    { title: 'Artículos con bajo stock', value: stats.lowStockItems, icon: AlertCircle, color: 'text-orange-600' },
    { title: 'Pedidos pendientes', value: stats.pendingPOs, icon: TrendingUp, color: 'text-purple-600' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Panel de Control</h1>
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
            <CardTitle>Inicio rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">🎯 Generar plan de reabastecimiento</h3>
              <p className="text-sm text-muted-foreground">
                Acceda a la sección de Reabastecimiento para generar sugerencias inteligentes de
                reposición de existencias basadas en los datos de su inventario.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📦 Gestionar productos</h3>
              <p className="text-sm text-muted-foreground">
                Consulta y edita tu catálogo de productos en la sección Productos.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📊 Consultar inventario</h3>
              <p className="text-sm text-muted-foreground">
                Supervise los niveles de existencias en todas las tiendas en la vista de inventario.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
