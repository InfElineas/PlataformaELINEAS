"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ShoppingCart } from "lucide-react";

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPOs();
  }, []);

  async function loadPOs() {
    setLoading(true);
    const res = await fetch("/api/purchase-orders");
    const data = await res.json();
    setPos(data.data || []);
    setLoading(false);
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-8 w-8" />
          Órdenes de compra
        </h1>
        <p className="text-muted-foreground">
          Administra órdenes de compra generadas por planes de reabastecimiento
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de órdenes de compra</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número de OC</TableHead>
                  <TableHead>Suministrador</TableHead>
                  <TableHead>Objetos</TableHead>
                  <TableHead className="text-right">Cantidad total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Aún no hay órdenes de compra. Genera y aprueba un plan de
                      reabastecimiento primero.
                    </TableCell>
                  </TableRow>
                ) : (
                  pos.map((po) => (
                    <TableRow key={po._id}>
                      <TableCell className="font-mono font-medium">
                        {po.po_number}
                      </TableCell>
                      <TableCell>{po.supplier_name}</TableCell>
                      <TableCell>{po.lines?.length || 0} objetos</TableCell>
                      <TableCell className="text-right">
                        ${po.total_amount?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            po.status === "draft"
                              ? "outline"
                              : po.status === "submitted"
                                ? "default"
                                : po.status === "received"
                                  ? "secondary"
                                  : "destructive"
                          }
                        >
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(po.created_at), "dd MMM, yyyy")}
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
