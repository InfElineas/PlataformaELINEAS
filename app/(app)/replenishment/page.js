"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Sparkles, CheckCircle, ShoppingCart, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export default function ReplenishmentPage() {
  const [stores, setStores] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [planDate, setPlanDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({
    storeId: "",
    product: "",
    supplierId: "all",
    minRecommendedQty: "",
    maxDaysOfCover: "",
    reason: "all",
  });
  const formatStoreLabel = (store) => {
    const warehouseName = store.warehouse_name || store.name || "—";
    const warehouseNumber =
      store.no_almacen || store.warehouse_number || store.tkc_code;
    const warehouseCode = store.warehouse_code;
    const meta = [warehouseNumber, warehouseCode].filter(Boolean);
    const uniqueMeta = Array.from(new Set(meta));

    return uniqueMeta.length > 0
      ? `${warehouseName} (${uniqueMeta.join(" · ")})`
      : warehouseName;
  };

  useEffect(() => {
    loadStores();
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (filters.storeId && planDate) {
      loadExistingPlan();
    }
  }, [filters.storeId, planDate]);

  async function loadStores() {
    const res = await fetch("/api/stores");
    const data = await res.json();
    setStores(data.data || []);
    if (data.data?.length > 0) {
      setFilters((prev) => ({
        ...prev,
        storeId: prev.storeId || data.data[0]._id,
      }));
    }
  }

  async function loadSuppliers() {
    const res = await fetch("/api/suppliers");
    const data = await res.json();
    setSuppliers(data.data || []);
  }

  async function loadExistingPlan() {
    setLoading(true);
    const res = await fetch(
      `/api/replenishment/plans?store_id=${filters.storeId}&plan_date=${planDate}`,
    );
    const data = await res.json();
    setPlan(data.data || []);
    setLoading(false);
  }

  async function generatePlan() {
    if (!filters.storeId || !planDate) {
      toast.error("Please select store and date");
      return;
    }

    setGenerating(true);
    try {
      const selectedSupplier = suppliers.find(
        (supplier) => supplier._id === filters.supplierId,
      );
      const res = await fetch("/api/replenishment/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_date: planDate,
          store_id: filters.storeId,
          supplier_id: filters.supplierId === "all" ? null : filters.supplierId,
          supplier_name: selectedSupplier?.name || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          `Generated ${data.summary.items_to_restock} items to restock!`,
        );
        loadExistingPlan();
      } else {
        toast.error(data.error || "Failed to generate plan");
      }
    } catch (err) {
      toast.error("Error generating plan");
    } finally {
      setGenerating(false);
    }
  }

  async function approvePlan() {
    if (plan.length === 0) {
      toast.error("No plan to approve");
      return;
    }

    try {
      const res = await fetch(
        `/api/replenishment/plans/${plan[0]._id}/approve`,
        {
          method: "POST",
        },
      );

      if (res.ok) {
        toast.success("Plan approved successfully!");
        loadExistingPlan();
      } else {
        toast.error("Failed to approve plan");
      }
    } catch (err) {
      toast.error("Error approving plan");
    }
  }

  async function createPOs() {
    if (plan.length === 0 || plan[0].status !== "approved") {
      toast.error("Please approve plan first");
      return;
    }

    try {
      const res = await fetch("/api/purchase-orders/from-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_date: planDate,
          store_id: filters.storeId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Created ${data.data.length} purchase orders!`);
        loadExistingPlan();
      } else {
        toast.error(data.error || "Failed to create POs");
      }
    } catch (err) {
      toast.error("Error creating POs");
    }
  }

  const planStatus = plan.length > 0 ? plan[0].status : null;
  const selectedSupplier = suppliers.find(
    (supplier) => supplier._id === filters.supplierId,
  );
  const availableReasons = Array.from(
    new Set(plan.map((item) => item.reason).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const filteredPlan = plan.filter((item) => {
    const storeMatch = filters.storeId
      ? item.store_id === filters.storeId
      : true;
    const supplierMatch =
      filters.supplierId === "all"
        ? true
        : item.supplier_id === filters.supplierId ||
          (selectedSupplier?.name &&
            item.supplier_name === selectedSupplier.name);
    const productMatch = filters.product
      ? item.product_name?.toLowerCase().includes(filters.product.toLowerCase())
      : true;
    const minQtyMatch =
      filters.minRecommendedQty === ""
        ? true
        : item.recommended_qty >= Number(filters.minRecommendedQty);
    const maxDaysMatch =
      filters.maxDaysOfCover === ""
        ? true
        : (item.days_of_cover || 7) <= Number(filters.maxDaysOfCover);
    const reasonMatch =
      filters.reason === "all" ? true : item.reason === filters.reason;

    return (
      storeMatch &&
      supplierMatch &&
      productMatch &&
      minQtyMatch &&
      maxDaysMatch &&
      reasonMatch
    );
  });
  const itemsToRestock = filteredPlan.filter((p) => p.recommended_qty > 0);
  const totalRecommendedQty = filteredPlan.reduce(
    (sum, p) => sum + p.recommended_qty,
    0,
  );

  return (
    <>
      <Toaster />
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Planeador de reabastecimiento
          </h1>
          <p className="text-muted-foreground">
            Genera recomendaciones de reabastecimiento
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configuración del plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="lg:flex max-lg:grid gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Fecha del plan
                </label>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button
                onClick={generatePlan}
                disabled={
                  generating ||
                  !filters.storeId ||
                  planStatus === "approved" ||
                  planStatus === "converted_to_po"
                }
                className="gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${generating ? "animate-spin" : ""}`}
                />
                {generating ? "Generando..." : "Generar plan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros globales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Almacén
                </label>
                <Select
                  value={filters.storeId}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, storeId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar almacén" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store._id} value={store._id}>
                        {formatStoreLabel(store)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Suministrador
                </label>
                <Select
                  value={filters.supplierId}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, supplierId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar suministrador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Buscar producto
                </label>
                <input
                  type="text"
                  value={filters.product}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      product: event.target.value,
                    }))
                  }
                  placeholder="Nombre o SKU"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Cantidad mínima recomendada
                </label>
                <input
                  type="number"
                  min="0"
                  value={filters.minRecommendedQty}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      minRecommendedQty: event.target.value,
                    }))
                  }
                  placeholder="Ej. 5"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Máximo de días de cobertura
                </label>
                <input
                  type="number"
                  min="0"
                  value={filters.maxDaysOfCover}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      maxDaysOfCover: event.target.value,
                    }))
                  }
                  placeholder="Ej. 10"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Razón</label>
                <Select
                  value={filters.reason}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, reason: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar razón" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {availableReasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {plan.length > 0 && (
          <>
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {filteredPlan.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total de objetos
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {itemsToRestock.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Necesitan reabastecimiento
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {totalRecommendedQty}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Cantidad a ordenar
                    </div>
                  </div>
                  <div className="text-center">
                    <Badge
                      variant={
                        planStatus === "approved"
                          ? "default"
                          : planStatus === "converted_to_po"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-lg py-1 px-4"
                    >
                      {planStatus}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Filtros globales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Buscar producto
                    </label>
                    <input
                      type="text"
                      value={filters.product}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          product: event.target.value,
                        }))
                      }
                      placeholder="Nombre o SKU"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Cantidad mínima recomendada
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={filters.minRecommendedQty}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          minRecommendedQty: event.target.value,
                        }))
                      }
                      placeholder="Ej. 5"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Máximo de días de cobertura
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={filters.maxDaysOfCover}
                      onChange={(event) =>
                        setFilters((prev) => ({
                          ...prev,
                          maxDaysOfCover: event.target.value,
                        }))
                      }
                      placeholder="Ej. 10"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Razón
                    </label>
                    <Select
                      value={filters.reason}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, reason: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar razón" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {availableReasons.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recomendaciones de reabastecimiento</CardTitle>
                  <div className="flex gap-2">
                    {planStatus === "draft" && (
                      <Button
                        onClick={approvePlan}
                        variant="default"
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Aprobar plan
                      </Button>
                    )}
                    {planStatus === "approved" && (
                      <Button
                        onClick={createPOs}
                        variant="default"
                        className="gap-2"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Crear órdenes de compra
                      </Button>
                    )}
                  </div>
                </div>
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
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">
                          Existencia actual
                        </TableHead>
                        <TableHead className="text-right">
                          Existencia objetivo
                        </TableHead>
                        <TableHead className="text-right">
                          Demanda diaria promedio
                        </TableHead>
                        <TableHead className="text-right">
                          Días de cobertura
                        </TableHead>
                        <TableHead className="text-right">
                          Estacionalidad
                        </TableHead>
                        <TableHead className="text-right font-bold">
                          Cantidad recomendada
                        </TableHead>
                        <TableHead>Razón</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlan
                        .filter((p) => p.recommended_qty > 0)
                        .map((item) => (
                          <TableRow key={item._id}>
                            <TableCell className="font-medium">
                              {item.product_name}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.current_stock}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.target_stock}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.avg_daily_demand?.toFixed(1) || "0.0"}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.days_of_cover || 7}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.seasonality_factor?.toFixed(2) || "1.00"}x
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              {item.recommended_qty}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.reason}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      {filteredPlan.filter((p) => p.recommended_qty > 0)
                        .length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center py-8 text-muted-foreground"
                          >
                            Ninguna oferta cumple con los filtros actuales.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {plan.length === 0 && !loading && (
          <Card>
            <CardContent className="py-16 text-center">
              <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                Aún no se ha generado ningún plan
              </h3>
              <p className="text-muted-foreground mb-4">
                Selecciona una tienda y una fecha, entonces escoge "Generar
                plan" para crear recomendaciones de reabastecimiento.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
