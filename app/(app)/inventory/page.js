"use client";

import { useEffect, useMemo, useState } from "react";

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

// ===== Helpers de inventario =====

function toSafeNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getEF(item) {
  return toSafeNumber(
    item.existencia_fisica ??
      item.physical_stock ??
      item.exist_fisica ??
      item.ef
  );
}

function getA(item) {
  return toSafeNumber(
    item.reserva ?? item.reserve_qty ?? item.A ?? item.almacen
  );
}

function getT(item) {
  return toSafeNumber(
    item.disponible_tienda ??
      item.store_qty ??
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
    item.no_almacen ??
    item.warehouse_name ??
    item.warehouse_code ??
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
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  // filtros globales
  const [pExistencia, setPExistencia] = useState(ALL);
  const [pAlmacen, setPAlmacen] = useState(ALL);
  const [pSuministrador, setPSuministrador] = useState(ALL);

  // filtros de análisis
  const [segmentId, setSegmentId] = useState("no_store"); // por defecto: T = 0
  const [maxRows, setMaxRows] = useState(50);

  // ajustes en edición: { [snapshotId]: { existencia_fisica, reserva, disponible_tienda, reason, note } }
  const [adjustments, setAdjustments] = useState({});

  // ================= Efectos =================

  useEffect(() => {
    const id = setTimeout(() => {
      loadInventory();
      setAdjustments({});
    }, 200);
    return () => clearTimeout(id);
  }, [pExistencia, pAlmacen, pSuministrador]);

  // ================= Fetch inventory =================

  async function loadInventory() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("perPage", "500");
      if (pExistencia !== ALL) params.set("existencia", pExistencia);
      if (pAlmacen !== ALL) params.set("almacen", pAlmacen);
      if (pSuministrador !== ALL)
        params.set("suministrador", pSuministrador);

      const res = await fetch(`/api/products?${params.toString()}`, {
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

  // ================= Opciones de filtros globales =================

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
    // 1) segmento de análisis (prioridades)
    let base = [...inventory];
    const segment =
      ANALYSIS_SEGMENTS.find((s) => s.id === segmentId) ||
      ANALYSIS_SEGMENTS[0];

    base = base.filter((item) => segment.predicate(item));

    // 2) orden simple: primero los de mayor EF, luego por nombre
    base.sort((a, b) => {
      const efDiff = getEF(b) - getEF(a);
      if (efDiff !== 0) return efDiff;
      const nameA = (a.product_name || "").toString();
      const nameB = (b.product_name || "").toString();
      return nameA.localeCompare(nameB, "es");
    });

    // 3) limitar cantidad de productos a analizar
    const limit = Number(maxRows);
    if (!Number.isFinite(limit) || limit <= 0) return base;
    return base.slice(0, limit);
  }, [inventory, segmentId, maxRows]);

  function resetFilters() {
    setPExistencia(ALL);
    setPAlmacen(ALL);
    setPSuministrador(ALL);
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
        adj.existencia_fisica !== undefined ||
        adj.reserva !== undefined ||
        adj.disponible_tienda !== undefined ||
        (adj.reason && adj.reason !== "") ||
        (adj.note && adj.note.trim() !== "");

      if (!hasData) continue;

      const existencia_fisica =
        adj.existencia_fisica !== undefined && adj.existencia_fisica !== ""
          ? toSafeNumber(adj.existencia_fisica, getEF(item))
          : getEF(item);

      const reserva =
        adj.reserva !== undefined && adj.reserva !== ""
          ? toSafeNumber(adj.reserva, getA(item))
          : getA(item);

      const disponible_tienda =
        adj.disponible_tienda !== undefined &&
        adj.disponible_tienda !== ""
          ? toSafeNumber(adj.disponible_tienda, getT(item))
          : getT(item);

      payload.push({
        snapshot_id: item._id,
        product_id: item.product_id || item.product_code || item._id,
        physical_stock: existencia_fisica,
        reserve_qty: reserva,
        store_qty: disponible_tienda,
        existencia_fisica,
        reserva,
        disponible_tienda,
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
          Ver niveles de inventario con filtros globales de existencias y
          suministradores.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventario</CardTitle>

          {/* Filtros globales */}
          <div className="mt-4 grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Existencia Física
              </label>
              <Select
                value={pExistencia}
                onValueChange={setPExistencia}
              >
                <SelectTrigger>
                  <SelectValue placeholder="(Todas)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>(Todas)</SelectItem>
                  <SelectItem value="con">Con existencia (&gt; 0)</SelectItem>
                  <SelectItem value="sin">Sin existencia (= 0)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Almacén
              </label>
              <Select value={pAlmacen} onValueChange={setPAlmacen}>
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
                value={pSuministrador}
                onValueChange={setPSuministrador}
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
                      adj.existencia_fisica ??
                      (getEF(item) !== 0 ? getEF(item) : "");
                    const aValue =
                      adj.reserva ?? (getA(item) !== 0 ? getA(item) : "");
                    const tValue =
                      adj.disponible_tienda ??
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
                                "existencia_fisica",
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
                                "reserva",
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
                                "disponible_tienda",
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
