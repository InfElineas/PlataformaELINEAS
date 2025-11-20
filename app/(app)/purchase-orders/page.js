'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ShoppingCart } from 'lucide-react';
import { swalLoading, swalSuccess, swalError } from '@/lib/swal';


export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPOs();
  }, []);

  async function loadPOs() {
     // Mostrar loading
      swalLoading('Cargando órdenes de compra', '');
    try {
    setLoading(true);
    const res = await fetch('/api/purchase-orders');
    const data = await res.json();
    setPos(data.data || []);
    // Cerrar loading y mostrar success
    swalSuccess('Órdenes de compra cargadas', '');
    setLoading(false);
    } catch (error) {
       console.error(err);
        swalError('Error al cargar órdenes de compra', err.message || 'Revisa el backend o la conexión.');
    }finally {
      setLoading(false);
    }
  
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-8 w-8" />
          Órdenes de compra
        </h1>
        <p className="text-muted-foreground">Administrar órdenes de compra generadas a partir de planes de reabastecimiento</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de órdenes de compra</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número de órden</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Elementos</TableHead>
                  <TableHead className="text-right">Cantidad total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aún no hay órdenes de compra. Genera y aproba un plan de reabastecimiento primero.
                    </TableCell>
                  </TableRow>
                ) : (
                  pos.map((po) => (
                    <TableRow key={po._id}>
                      <TableCell className="font-mono font-medium">{po.po_number}</TableCell>
                      <TableCell>{po.supplier_name}</TableCell>
                      <TableCell>{po.lines?.length || 0} items</TableCell>
                      <TableCell className="text-right">
                        ${po.total_amount?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            po.status === 'draft' ? 'outline' :
                            po.status === 'submitted' ? 'default' :
                            po.status === 'received' ? 'secondary' : 'destructive'
                          }
                        >
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(po.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
