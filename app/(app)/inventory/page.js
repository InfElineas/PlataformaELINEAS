"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const ALL = "__ALL__";

const ADJUSTMENT_REASONS = [
  "Faltante Inventario",
  "Sobrante en inventario",
  "Sustitucion de inventario",
  "Incidencias Picker",
  "Reposicion de inventario",
  "Reposicion productos sobreventa",
  "Robo",
  "Transferencia almacén Externo",
  "Cuenta casa atenciones",
  "Cuenta casa eventos",
  "Devolucion a proveedor",
  "Error contable-Fac NO",
  "Error contable-Fact - o +",
  "Error contable-Inventario",
  "Faltante de origen",
  "Producto incontable",
  "Reclasificacion de calidad",
  "Responsabilidad de materiales",
  "Venta Directa",
  "Venta SP",
  "Merma-Manipulacion",
  "Merma-Ratones",
  "Merma-FV",
  "Mal estado-Sin presencia comercial",
  "Mal estado-sin calidad",
  "Salida de insumos-Medios Basicos",
  "Salida de insumos-Preparacion ordenes",
  "Salida de insumos-Mantenimiento",
  "Cuenta casa administrativa-Eli",
  "Cuenta casa administrativa-Mandy padre",
  "Cuenta casa administrativa-Yanet",
  "Cuenta casa administrativa-Belkis",
  "Cuenta casa administrativa-Pablo",
  "Cuenta casa administrativa-Rene",
  "Transferencia a Thaba no registrada",
  "Transferencia a Latino no registrada",
  "Error antiguo",
  "Sin explicación",
  "No Procesar x Fact",
  "Procesamiento-PP",
  "Procesamiento-Fact",
  "Error contable-VD",
  "Mal estado-solo AC-VD",
  "Fitosanitario e Higiene",
  "Creación de anuncio",
  "Higiene",
  "Reserva Transporte",
  "Vetedinario",
  "Modulo para trabajadores",
];

// Segmentos de análisis (prioridades de trabajo)
const ANALYSIS_SEGMENTS = [
  {
    id: "all",
    label: "Todos los productos",
    predicate: () => true,
  },
  {
    id: "no_store",
    label: "No tienda (T = 0)",
    predicate: (item) => getT(item) === 0,
  },
];

// ===== Helpers de mapeo de tienda / almacén =====

function getStoreWarehouseCode(store) {
  return (
    store.warehouse_code || // ideal
    store.code || // plan B
    store.number || // plan C
    store._id // último recurso
  )?.toString();
}

function getStoreLabel(store) {
  const code =
    store.warehouse_code || store.code || store.number || "";
  const name = store.name || "";
  if (code && name) return `${code} · ${name}`;
  return name || code || "Sin nombre";
}

// ===== Helpers de inventario =====

function toSafeNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getEF(item) {
  return toSafeNumber(
    item.physical_stock ??
      item.existencia_fisica ??
      item.exist_fisica ??
      item.ef
  );
}

function getA(item) {
  return toSafeNumber(
    item.reserve_qty ?? item.reserva ?? item.A ?? item.almacen
  );
}

function getT(item) {
  return toSafeNumber(
    item.store_qty ??
      item.disponible_tienda ??
      item.disponible ??
      item.tienda
  );
}

function getProductCode(item) {
  return (
    item.product_code ??
    item.codigo ??
    item.cod_prod ??
    item.barcode ??
    ""
  ).toString();
}

function getWarehouseLabel(item) {
  return (
    item.warehouse_name ??
    item.warehouse_code ??
    item.no_almacen ??
    ""
  ).toString();
}

function getSupplierLabel(item) {
  return (
    item.supplier_name ??
    item.provider_name ??
    item.supplier ??
    ""
  ).toString();
}

// ===== Estado tienda (mismo criterio que en Products) =====

function getEstadoTienda(item) {
  const ID = getProductCode(item);
  const EF = getEF(item);
  const A = getA(item);
  const T = getT(item);

  if (!ID) {
    return EF === 0
      ? 'SIN ID (ID = "" y EF = 0)'
      : 'SIN ID (ID = "" y EF > 0)';
  }

  if (EF === 0) {
    return 'AGOTADO (ID ≠ "" y EF = 0)';
  }

  if (A === 0 && T > 6) {
    return "SIN RESERVA (A = 0 y T > 6)";
  }

  if (T === 0) {
    return EF > 10
      ? "NO TIENDA (T = 0 y EF > 10)"
      : "NO TIENDA (T = 0 y EF ≤ 10)";
  }

  if (T > 1 && T < A && A <= 10) {
    return "ULTIMAS PIEZAS (1 < T < A ≤ 10)";
  }

  if (A >= 0 && A < T && T <= 10) {
    return "ULTIMAS PIEZAS (0 ≤ A < T ≤ 10)";
  }

  if (T <= 10) {
    return "PROXIMO (T ≤ 10)";
  }

  if (T <= A) {
    return "DISPONIBLE (T ≤ A)";
  }

  return "DISPONIBLE (A < T)";
}

function badgeVariantEstadoTienda(label) {
  if (label.startsWith("DISPONIBLE")) return "default";
  if (
    label.startsWith("PROXIMO") ||
    label.startsWith("ULTIMAS PIEZAS")
  ) {
    return "secondary";
  }
  return "destructive";
}

export default function InventoryPage() {
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  // filtros secundarios sobre el snapshot
  const [warehouseFilter, setWarehouseFilter] = useState(ALL);
  const [supplierFilter, setSupplierFilter] = useState(ALL);

  // filtros de análisis
  const [segmentId, setSegmentId] = useState("no_store"); // por defecto: T = 0
  const [maxRows, setMaxRows] = useState(50);

  // ajustes en edición: { [snapshotId]: { physical_stock, reserve_qty, store_qty, reason, note } }
  const [adjustments, setAdjustments] = useState({});

  // ================= Efectos =================

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (selectedStoreId && selectedDate) {
      loadInventory();
      setWarehouseFilter(ALL);
      setSupplierFilter(ALL);
      setAdjustments({});
    }
  }, [selectedStoreId, selectedDate]);

  // ================= Fetch stores =================

  async function loadStores() {
    try {
      const res = await fetch("/api/stores");
      const data = await res.json();
      const list = data.data || [];
      setStores(list);
      if (list.length > 0) {
        // usamos _id para la API, pero mostramos código+nombre en el label
        setSelectedStoreId(list[0]._id);
      }
    } catch (err) {
      console.error("loadStores failed", err);
      setStores([]);
    }
  }

  // ================= Fetch inventory =================

  async function loadInventory() {
    if (!selectedStoreId || !selectedDate) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("date", selectedDate);
      params.set("store_id", selectedStoreId);

      // sin limit: queremos todo el snapshot para poder priorizar
      const res = await fetch(`/api/inventory?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("Inventory API error", res.status);
        setInventory([]);
        return;
      }

      const data = await res.json();
      setInventory(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error("loadInventory failed", err);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }

  // ================= Opciones de filtros secundarios =================

  const filterOptions = useMemo(() => {
    const warehouses = new Set();
    const suppliers = new Set();

    inventory.forEach((item) => {
      const wh = getWarehouseLabel(item).trim();
      const sup = getSupplierLabel(item).trim();
      if (wh) warehouses.add(wh);
      if (sup) suppliers.add(sup);
    });

    const toArr = (set) =>
      Array.from(set).sort((a, b) => a.localeCompare(b, "es"));

    return {
      warehouses: toArr(warehouses),
      suppliers: toArr(suppliers),
    };
  }, [inventory]);

  // ================= Inventario filtrado + segmentado =================

  const filteredInventory = useMemo(() => {
    // 1) filtros secundarios (snapshot)
    let base = inventory.filter((item) => {
      const wh = getWarehouseLabel(item);
      const sup = getSupplierLabel(item);

      if (warehouseFilter !== ALL && wh !== warehouseFilter) return false;
      if (supplierFilter !== ALL && sup !== supplierFilter) return false;

      return true;
    });

    // 2) segmento de análisis (prioridades)
    const segment =
      ANALYSIS_SEGMENTS.find((s) => s.id === segmentId) ||
      ANALYSIS_SEGMENTS[0];

    base = base.filter((item) => segment.predicate(item));

    // 3) orden simple: primero los de mayor EF, luego por nombre
    base.sort((a, b) => {
      const efDiff = getEF(b) - getEF(a);
      if (efDiff !== 0) return efDiff;
      const nameA = (a.product_name || "").toString();
      const nameB = (b.product_name || "").toString();
      return nameA.localeCompare(nameB, "es");
    });

    // 4) limitar cantidad de productos a analizar
    const limit = Number(maxRows);
    if (!Number.isFinite(limit) || limit <= 0) return base;
    return base.slice(0, limit);
  }, [inventory, warehouseFilter, supplierFilter, segmentId, maxRows]);

  function resetFilters() {
    setWarehouseFilter(ALL);
    setSupplierFilter(ALL);
  }

  // ================= Edición de ajustes =================

  function updateAdjustment(snapshotId, field, value) {
    setAdjustments((prev) => ({
      ...prev,
      [snapshotId]: {
        ...(prev[snapshotId] || {}),
        [field]: value,
      },
    }));
  }

  async function handleSaveAdjustments() {
    // construir payload sólo con las filas que tienen cambios
    const payload = [];

    for (const item of inventory) {
      const adj = adjustments[item._id];
      if (!adj) continue;

      const hasData =
        adj.physical_stock !== undefined ||
        adj.reserve_qty !== undefined ||
        adj.store_qty !== undefined ||
        (adj.reason && adj.reason !== "") ||
        (adj.note && adj.note.trim() !== "");

      if (!hasData) continue;

      const physical_stock =
        adj.physical_stock !== undefined && adj.physical_stock !== ""
          ? toSafeNumber(adj.physical_stock, getEF(item))
          : getEF(item);

      const reserve_qty =
        adj.reserve_qty !== undefined && adj.reserve_qty !== ""
          ? toSafeNumber(adj.reserve_qty, getA(item))
          : getA(item);

      const store_qty =
        adj.store_qty !== undefined && adj.store_qty !== ""
          ? toSafeNumber(adj.store_qty, getT(item))
          : getT(item);

      payload.push({
        snapshot_id: item._id,
        product_id: item.product_id || item.product_code,
        store_id: item.store_id || selectedStoreId,
        date: selectedDate,
        physical_stock,
        reserve_qty,
        store_qty,
        reason: adj.reason || null,
        note: adj.note || "",
      });
    }

    if (payload.length === 0) {
      alert("No hay ajustes pendientes.");
      return;
    }

    try {
      const res = await fetch("/api/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustments: payload }),
      });

      if (!res.ok) {
        console.error("Error guardando ajustes", res.status);
        alert("Error al guardar los ajustes.");
        return;
      }

      // opcional: recargar snapshot para ver valores actualizados
      await loadInventory();
      setAdjustments({});
      alert("Ajustes guardados correctamente.");
    } catch (err) {
      console.error("handleSaveAdjustments failed", err);
      alert("Error al guardar los ajustes.");
    }
  }

  // ================= Render =================

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Inventario</h1>
        <p className="text-muted-foreground">
          Ver niveles de inventario por almacén y fecha.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instantáneas de inventario</CardTitle>

          {/* Filtros principales: almacén / fecha */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Almacén
              </label>
              <Select
                value={selectedStoreId}
                onValueChange={setSelectedStoreId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar almacén" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store._id} value={store._id}>
                      {getStoreLabel(store)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Fecha
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Filtros secundarios: almacén snapshot + suministrador */}
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Almacén (en snapshot)
              </label>
              <Select
                value={warehouseFilter}
                onValueChange={setWarehouseFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="(Todos)" />
                </SelectTrigger>
                <SelectContent className="max-h-72 overflow-auto">
                  <SelectItem value={ALL}>(Todos)</SelectItem>
                  {filterOptions.warehouses.map((wh) => (
                    <SelectItem key={wh} value={wh}>
                      {wh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Suministrador
              </label>
              <Select
                value={supplierFilter}
                onValueChange={setSupplierFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="(Todos)" />
                </SelectTrigger>
                <SelectContent className="max-h-72 overflow-auto">
                  <SelectItem value={ALL}>(Todos)</SelectItem>
                  {filterOptions.suppliers.map((sup) => (
                    <SelectItem key={sup} value={sup}>
                      {sup}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={resetFilters}>
                Limpiar filtros
              </Button>
            </div>
          </div>

          {/* Segmento de análisis + límite */}
          <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Segmento de análisis (Estado tienda)
              </label>
              <Select
                value={segmentId}
                onValueChange={setSegmentId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANALYSIS_SEGMENTS.map((seg) => (
                    <SelectItem key={seg.id} value={seg.id}>
                      {seg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Máx. productos a mostrar
              </label>
              <Input
                type="number"
                min={1}
                value={maxRows}
                onChange={(e) => setMaxRows(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-4 flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {loading
                ? "Cargando inventario…"
                : `${filteredInventory.length} producto(s) en la cola actual`}
            </span>
            <Button
              size="sm"
              onClick={handleSaveAdjustments}
              disabled={loading}
            >
              Guardar ajustes
            </Button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Cargando...
            </div>
          ) : (
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Estado tienda</TableHead>
                  <TableHead>Cód. Prod.</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Suministrador</TableHead>
                  <TableHead className="text-right">
                    EF (Existencia física)
                  </TableHead>
                  <TableHead className="text-right">
                    A (Reserva)
                  </TableHead>
                  <TableHead className="text-right">
                    T (Disp. tienda)
                  </TableHead>
                  <TableHead>Clasificación</TableHead>
                  <TableHead>Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No hay datos de inventario para los filtros
                      seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map((item) => {
                    const snapshotId = item._id;
                    const estado = getEstadoTienda(item);
                    const variant =
                      badgeVariantEstadoTienda(estado);
                    const adj = adjustments[snapshotId] || {};

                    const efValue =
                      adj.physical_stock ??
                      (getEF(item) !== 0 ? getEF(item) : "");
                    const aValue =
                      adj.reserve_qty ??
                      (getA(item) !== 0 ? getA(item) : "");
                    const tValue =
                      adj.store_qty ??
                      (getT(item) !== 0 ? getT(item) : "");

                    return (
                      <TableRow key={snapshotId}>
                        <TableCell>
                          <Badge variant={variant}>{estado}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {getProductCode(item)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.product_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getSupplierLabel(item) || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            className="h-8 w-24 text-right"
                            value={efValue}
                            onChange={(e) =>
                              updateAdjustment(
                                snapshotId,
                                "physical_stock",
                                e.target.value
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            className="h-8 w-24 text-right"
                            value={aValue}
                            onChange={(e) =>
                              updateAdjustment(
                                snapshotId,
                                "reserve_qty",
                                e.target.value
                              )
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            className="h-8 w-24 text-right"
                            value={tValue}
                            onChange={(e) =>
                              updateAdjustment(
                                snapshotId,
                                "store_qty",
                                e.target.value
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={adj.reason || ""}
                            onValueChange={(v) =>
                              updateAdjustment(
                                snapshotId,
                                "reason",
                                v
                              )
                            }
                          >
                            <SelectTrigger className="h-8 w-64">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-72 overflow-auto">
                              <SelectItem value="">
                                (Sin clasificación)
                              </SelectItem>
                              {ADJUSTMENT_REASONS.map((reason) => (
                                <SelectItem
                                  key={reason}
                                  value={reason}
                                >
                                  {reason}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 w-64"
                            placeholder="Nota..."
                            value={adj.note || ""}
                            onChange={(e) =>
                              updateAdjustment(
                                snapshotId,
                                "note",
                                e.target.value
                              )
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
