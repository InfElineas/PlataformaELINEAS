"use client";

import { useEffect, useMemo, useState } from "react";
import { useGlobalProductFilters } from "@/components/providers/ProductFiltersProvider";
import { ALL } from "@/hooks/useProductFilters";

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

const NO_REASON = "__NONE__";

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
  { id: "sin_reserva", label: "Sin reserva", priority: 0 },
  { id: "no_tienda", label: "No en tienda", priority: 1 },
  { id: "ultimas", label: "Ultimas piezas", priority: 2 },
  { id: "proximo", label: "Proximo", priority: 3 },
  { id: "sin_id", label: "Sin ID", priority: 4 },
];

const PRIORITY_BADGES = {
  sin_reserva: { variant: "destructive" },
  no_tienda: { variant: "destructive" },
  ultimas: { variant: "secondary" },
  proximo: { variant: "secondary" },
  sin_id: { variant: "destructive" },
  disponible: { variant: "default" },
};

// ===== Helpers de inventario =====

function parseInventoryNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  let cleaned = String(value).trim();
  if (!cleaned) return fallback;

  cleaned = cleaned.replace(/[^0-9,.-]/g, "");
  if (!cleaned) return fallback;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(",") < cleaned.lastIndexOf(".")) {
      cleaned = cleaned.replace(/,/g, "");
    } else {
      cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
    }
  } else if (hasComma && !hasDot) {
    cleaned = cleaned.replace(/,/g, ".");
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const INVENTORY_KEYS = {
  existencia: [
    "existencia_fisica",
    "physical_stock",
    "exist_fisica",
    "stock",
    "existencia",
    "ef",
    "metadata.existencia_fisica",
    "metadata.physical_stock",
    "metadata.exist_fisica",
    "metadata.stock",
    "metadata.existencia",
    "metadata.ef",
  ],
  reserva: [
    "reserva",
    "reserve_qty",
    "reserved",
    "reserved_qty",
    "A",
    "almacen",
    "metadata.reserva",
    "metadata.reserve_qty",
    "metadata.reserved",
    "metadata.reserved_qty",
    "metadata.A",
    "metadata.almacen",
  ],
  tienda: [
    "disponible_tienda",
    "store_qty",
    "disponible",
    "available_store",
    "available",
    "tienda",
    "T",
    "metadata.disponible_tienda",
    "metadata.store_qty",
    "metadata.disponible",
    "metadata.available_store",
    "metadata.available",
    "metadata.tienda",
    "metadata.T",
  ],
};

function pickInventory(item, keys) {
  const resolve = (target, path) => {
    if (!target || !path) return undefined;
    if (!path.includes(".")) return target?.[path];
    return path.split(".").reduce((acc, part) => acc?.[part], target);
  };

  for (const key of keys) {
    const direct = parseInventoryNumber(resolve(item, key), null);
    if (direct !== null) return direct;

    const meta = parseInventoryNumber(resolve(item?.metadata, key), null);
    if (meta !== null) return meta;
  }
  return 0;
}

function toSafeNumber(value, fallback = 0) {
  const parsed = parseInventoryNumber(value, fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatQty(value) {
  const num = toSafeNumber(value, 0);
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(num);
}

function getEF(item) {
  return pickInventory(item, INVENTORY_KEYS.existencia);
}

function getA(item) {
  return pickInventory(item, INVENTORY_KEYS.reserva);
}

function getT(item) {
  return pickInventory(item, INVENTORY_KEYS.tienda);
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
  const candidates = [
    item.no_almacen,
    item.warehouse_name,
    item.warehouse_code,
    item?.metadata?.no_almacen,
    item?.metadata?.warehouse_name,
    item?.metadata?.warehouse_code,
  ];

  for (const value of candidates) {
    if (value === null || value === undefined) continue;
    const text = value.toString().trim();
    if (text) return text;
  }

  return "";
}

function getSupplierLabel(item) {
  return (
    item.supplier_name ??
    item.provider_name ??
    item.supplier ??
    ""
  ).toString();
}

function getProductName(item) {
  return (
    item.name ??
      item.product_name ??
      item.product ??
      item.title ??
      ""
  ).toString();
}

function normalizeOption(value) {
  if (value === null || value === undefined) return "";
  return value.toString().trim();
}

function mergeOptions(...lists) {
  const set = new Set();
  lists.flat().forEach((item) => {
    const val = normalizeOption(item);
    if (val) set.add(val);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
}

function deriveOptionsFromInventory(inventory) {
  const warehouses = new Set();
  const suppliers = new Set();
  const storeStatuses = new Set();

  inventory.forEach((item) => {
    const wh = normalizeOption(getWarehouseLabel(item));
    const sup = normalizeOption(getSupplierLabel(item));
    const tienda = normalizeOption(getEstadoTienda(item)?.label);
    if (wh) warehouses.add(wh);
    if (sup) suppliers.add(sup);
    if (tienda) storeStatuses.add(tienda);
  });

  return {
    warehouses: Array.from(warehouses),
    suppliers: Array.from(suppliers),
    storeStatuses: Array.from(storeStatuses),
  };
}

// ===== Estado tienda (mismo criterio que en Products) =====

function getEstadoTienda(item) {
  const ID = getProductCode(item);
  const EF = getEF(item);
  const A = getA(item);
  const T = getT(item);

  if (!ID) {
    return { id: "sin_id", label: "Sin ID" };
  }

  if (A === 0 && (T > 0 || EF > 0)) {
    return { id: "sin_reserva", label: "Sin reserva" };
  }

  if (T === 0) {
    return { id: "no_tienda", label: "No en tienda" };
  }

  if (T <= 10) {
    return { id: "proximo", label: "Proximo" };
  }

  if (T > 1 && T <= A) {
    return { id: "ultimas", label: "Ultimas piezas" };
  }

  return { id: "disponible", label: "Disponible" };
}

function badgeVariantEstadoTienda(label) {
  const match = Object.entries(PRIORITY_BADGES).find(([key]) =>
    label.toLowerCase().includes(key.replace("_", " ")),
  );
  return match ? match[1].variant : "default";
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  // filtros globales compartidos con productos
  const {
    appliedFilters,
    setPendingFilter,
    applyFilters,
    resetFilters,
  } = useGlobalProductFilters();
  const [filterOptions, setFilterOptions] = useState({
    warehouses: [],
    suppliers: [],
    storeStatuses: [],
  });

  // filtros de análisis
  const [segmentId, setSegmentId] = useState("sin_reserva");
  const [maxRows, setMaxRows] = useState(20);

  // ajustes en edición: { [snapshotId]: { real_qty, upload_qty, download_qty, reason, note } }
  const [adjustments, setAdjustments] = useState({});

  // ================= Efectos =================

  useEffect(() => {
    const id = setTimeout(() => {
      loadInventory();
      setAdjustments({});
    }, 200);
    return () => clearTimeout(id);
  }, [
    appliedFilters.existencia,
    appliedFilters.almacen,
    appliedFilters.suministrador,
    appliedFilters.estado_tienda,
  ]);

  // ================= Fetch inventory =================

  async function loadInventory() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("perPage", "500");
      params.set("includeFilters", "1");
      if (appliedFilters.existencia !== ALL)
        params.set("existencia", appliedFilters.existencia);
      if (appliedFilters.almacen !== ALL)
        params.set("almacen", appliedFilters.almacen);
      if (appliedFilters.suministrador !== ALL)
        params.set("suministrador", appliedFilters.suministrador);
      if (appliedFilters.estado_tienda !== ALL)
        params.set("estado_tienda", appliedFilters.estado_tienda);

      const res = await fetch(`/api/products?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("Inventory API error", res.status);
        setInventory([]);
        return;
      }

      const data = await res.json();
      const rows = Array.isArray(data.data) ? data.data : [];
      const derived = deriveOptionsFromInventory(rows);

      setInventory(rows);
      setFilterOptions({
        warehouses: mergeOptions(data.meta?.warehouses || [], derived.warehouses),
        suppliers: mergeOptions(data.meta?.suppliers || [], derived.suppliers),
        storeStatuses: mergeOptions(
          data.meta?.storeStatuses || [],
          derived.storeStatuses,
        ),
      });
    } catch (err) {
      console.error("loadInventory failed", err);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }

  const setFilterAndApply = (key) => (value) => {
    setPendingFilter(key, value);
    setTimeout(() => applyFilters(), 0);
  };

  // ================= Opciones de filtros globales =================

  const globalFilterOptions = useMemo(
    () => ({
      warehouses: Array.isArray(filterOptions?.warehouses)
        ? filterOptions.warehouses
        : [],
      suppliers: Array.isArray(filterOptions?.suppliers)
        ? filterOptions.suppliers
        : [],
      storeStatuses: Array.isArray(filterOptions?.storeStatuses)
        ? filterOptions.storeStatuses
        : [],
    }),
    [filterOptions],
  );

  // ================= Inventario filtrado + segmentado =================

  const prioritizedInventory = useMemo(() => {
    const order = Object.fromEntries(
      ANALYSIS_SEGMENTS.map((s, idx) => [s.id, idx]),
    );

    return [...inventory]
      .map((item) => ({ item, estado: getEstadoTienda(item) }))
      .sort((a, b) => {
        const pa = order[a.estado?.id] ?? 99;
        const pb = order[b.estado?.id] ?? 99;
        if (pa !== pb) return pa - pb;
        const efDiff = getEF(b.item) - getEF(a.item);
        if (efDiff !== 0) return efDiff;
        return getProductName(a.item).localeCompare(
          getProductName(b.item),
          "es",
        );
      })
      .map(({ item }) => item);
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const segment =
      ANALYSIS_SEGMENTS.find((s) => s.id === segmentId) || ANALYSIS_SEGMENTS[0];

    const base = prioritizedInventory.filter(
      (item) => getEstadoTienda(item)?.id === segment.id,
    );

    const limit = Number(maxRows);
    if (!Number.isFinite(limit) || limit <= 0) return base;
    return base.slice(0, limit);
  }, [prioritizedInventory, segmentId, maxRows]);

  const handleResetFilters = () => {
    resetFilters();
      setSegmentId("sin_reserva");
      setMaxRows(20);
  };

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

  function resolveRealQty(item, adj) {
    if (adj.real_qty === undefined || adj.real_qty === null || adj.real_qty === "") {
      return null;
    }
    const parsed = Number(adj.real_qty);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function resolveAdjustmentState(item, adj) {
    const realQty = resolveRealQty(item, adj);
    if (realQty === null) return { state: "pendiente", difference: 0 };

    const diff = realQty - getEF(item);
    if (diff === 0) return { state: "ok", difference: 0 };
    if (diff > 0) return { state: "sobrante", difference: diff };
    return { state: "faltante", difference: diff };
  }

  async function handleSaveAdjustments() {
    // construir payload sólo con las filas que tienen cambios
    const payload = [];

    for (const item of inventory) {
      const adj = adjustments[item._id];
      if (!adj) continue;

      const hasData =
        adj.real_qty !== undefined ||
        adj.upload_qty !== undefined ||
        adj.download_qty !== undefined ||
        (adj.reason && adj.reason !== NO_REASON) ||
        (adj.note && adj.note.trim() !== "");

      if (!hasData) continue;

      const existencia_fisica = getEF(item);
      const reserva = getA(item);
      const disponible_tienda = getT(item);

      const real_qty = resolveRealQty(item, adj);
      const { state, difference } = resolveAdjustmentState(item, adj);

      const real_qty = resolveRealQty(item, adj);
      const { state, difference } = resolveAdjustmentState(item, adj);

      payload.push({
        snapshot_id: item._id,
        product_id: item.product_id || item.product_code || item._id,
        physical_stock: existencia_fisica,
        reserve_qty: reserva,
        store_qty: disponible_tienda,
        existencia_fisica,
        reserva,
        disponible_tienda,
        real_qty,
        difference,
        state,
        upload_qty:
          adj.upload_qty !== undefined && adj.upload_qty !== ""
            ? toSafeNumber(adj.upload_qty, 0)
            : 0,
        download_qty:
          adj.download_qty !== undefined && adj.download_qty !== ""
            ? toSafeNumber(adj.download_qty, 0)
            : 0,
        reason: adj.reason && adj.reason !== NO_REASON ? adj.reason : null,
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

  function handleExportCSV() {
    const header = [
      "No",
      "Nombre",
      "Código",
      "Estado tienda",
      "EF plataforma",
      "Real",
      "Diferencia",
      "Estado ajuste",
      "Subir tienda",
      "Bajar tienda",
    ];

    const rows = filteredInventory.map((item, idx) => {
      const adj = adjustments[item._id] || {};
      const { state, difference } = resolveAdjustmentState(item, adj);
      const realQty = resolveRealQty(item, adj) ?? getEF(item);
      const estado = getEstadoTienda(item)?.label || "";

      return [
        idx + 1,
        getProductName(item).replace(/,/g, " "),
        getProductCode(item),
        estado,
        getEF(item),
        realQty,
        difference,
        state,
        adj.upload_qty ?? "",
        adj.download_qty ?? "",
      ];
    });

    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventario-ajustes.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  // ================= Render =================

  return (
    <div className="space-y-6 pb-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Inventario</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Ver niveles de inventario con filtros globales de existencias y
          suministradores.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Inventario</CardTitle>

          {/* Filtros globales */}
          <div className="mt-4 grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Existencia Física
              </label>
              <Select
                value={appliedFilters.existencia}
                onValueChange={setFilterAndApply("existencia")}
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
              <Select
                value={appliedFilters.almacen}
                onValueChange={setFilterAndApply("almacen")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="(Todos)" />
                </SelectTrigger>
                <SelectContent className="max-h-72 overflow-auto">
                  <SelectItem value={ALL}>(Todos)</SelectItem>
                  {globalFilterOptions.warehouses.map((wh) => (
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
                value={appliedFilters.suministrador}
                onValueChange={setFilterAndApply("suministrador")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="(Todos)" />
                </SelectTrigger>
                <SelectContent className="max-h-72 overflow-auto">
                  <SelectItem value={ALL}>(Todos)</SelectItem>
                  {globalFilterOptions.suppliers.map((sup) => (
                    <SelectItem key={sup} value={sup}>
                      {sup}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Estado en tienda
              </label>
              <Select
                value={appliedFilters.estado_tienda}
                onValueChange={setFilterAndApply("estado_tienda")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="(Todos)" />
                </SelectTrigger>
                <SelectContent className="max-h-72 overflow-auto">
                  <SelectItem value={ALL}>(Todos)</SelectItem>
                  {globalFilterOptions.storeStatuses.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={handleResetFilters}>
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
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setMaxRows(20)}
              >
                Usar meta diaria (20)
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 rounded-lg border border-border/60 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground leading-tight">
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
            <Button
              size="sm"
              variant="secondary"
              onClick={handleExportCSV}
              disabled={loading || filteredInventory.length === 0}
            >
              Exportar CSV
            </Button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Cargando...
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No hay datos de inventario para los filtros seleccionados.
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-lg border border-border/60 md:block">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estado tienda</TableHead>
                      <TableHead>Cód. Prod.</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Suministrador</TableHead>
                      <TableHead className="text-right">
                        EF (Existencia física)
                      </TableHead>
                      <TableHead className="text-right">Real</TableHead>
                      <TableHead className="text-right">
                        A (Reserva)
                      </TableHead>
                      <TableHead className="text-right">
                        T (Disp. tienda)
                      </TableHead>
                      <TableHead>Estado ajuste</TableHead>
                      <TableHead className="text-right">Subir T</TableHead>
                      <TableHead className="text-right">Bajar T</TableHead>
                      <TableHead>Clasificación</TableHead>
                      <TableHead>Nota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => {
                      const snapshotId = item._id;
                      const estado = getEstadoTienda(item);
                      const variant = badgeVariantEstadoTienda(estado?.label || "");
                      const adj = adjustments[snapshotId] || {};
                      const { state, difference } = resolveAdjustmentState(
                        item,
                        adj,
                      );

                      return (
                        <TableRow key={snapshotId}>
                          <TableCell>
                            <Badge variant={variant}>{estado?.label}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {getProductCode(item)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {getProductName(item) || "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {getSupplierLabel(item) || "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm tabular-nums">
                            {formatQty(getEF(item))}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              className="h-8 w-24 text-right"
                              value={adj.real_qty ?? ""}
                              onChange={(e) =>
                                updateAdjustment(snapshotId, "real_qty", e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm tabular-nums">
                            {formatQty(getA(item))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm tabular-nums">
                            {formatQty(getT(item))}
                          </TableCell>
                          <TableCell>
                            <Badge variant={state === "ok" ? "default" : "secondary"}>
                              {state.toUpperCase()}
                              {difference !== 0 ? ` (${difference})` : ""}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              className="h-8 w-20 text-right"
                              value={adj.upload_qty ?? ""}
                              onChange={(e) =>
                                updateAdjustment(snapshotId, "upload_qty", e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              className="h-8 w-20 text-right"
                              value={adj.download_qty ?? ""}
                              onChange={(e) =>
                                updateAdjustment(snapshotId, "download_qty", e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={adj.reason || NO_REASON}
                              onValueChange={(v) =>
                                updateAdjustment(
                                  snapshotId,
                                  "reason",
                                  v || NO_REASON
                                )
                              }
                            >
                              <SelectTrigger className="h-8 w-64">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent className="max-h-72 overflow-auto">
                                <SelectItem value={NO_REASON}>
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
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredInventory.map((item) => {
                  const snapshotId = item._id;
                  const estado = getEstadoTienda(item);
                  const variant = badgeVariantEstadoTienda(estado?.label || "");
                  const adj = adjustments[snapshotId] || {};
                  const { state, difference } = resolveAdjustmentState(item, adj);

                  return (
                    <div
                      key={snapshotId}
                      className="space-y-3 rounded-lg border border-border/60 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-mono">
                            {getProductCode(item)}
                          </p>
                          <p className="text-sm font-semibold leading-tight">
                            {getProductName(item) || "Producto sin nombre"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getSupplierLabel(item) || "Suministrador no asignado"}
                          </p>
                        </div>
                        <Badge variant={variant}>{estado?.label}</Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="rounded-md bg-muted/60 p-2 text-center">
                          <p className="text-[11px] text-muted-foreground">EF</p>
                          <p className="mt-1 font-mono text-sm tabular-nums">
                            {formatQty(getEF(item))}
                          </p>
                        </div>
                        <div className="rounded-md bg-muted/60 p-2 text-center">
                          <p className="text-[11px] text-muted-foreground">Real</p>
                          <Input
                            type="number"
                            className="mt-1 h-8 w-full text-center"
                            value={adj.real_qty ?? ""}
                            onChange={(e) =>
                              updateAdjustment(
                                snapshotId,
                                "real_qty",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="rounded-md bg-muted/60 p-2 text-center">
                          <p className="text-[11px] text-muted-foreground">A</p>
                          <p className="mt-1 font-mono text-sm tabular-nums">
                            {formatQty(getA(item))}
                          </p>
                        </div>
                        <div className="rounded-md bg-muted/60 p-2 text-center">
                          <p className="text-[11px] text-muted-foreground">T</p>
                          <p className="mt-1 font-mono text-sm tabular-nums">
                            {formatQty(getT(item))}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md bg-muted/60 p-2 text-center">
                          <p className="text-[11px] text-muted-foreground">Subir T</p>
                          <Input
                            type="number"
                            className="mt-1 h-8 w-full text-center"
                            value={adj.upload_qty ?? ""}
                            onChange={(e) =>
                              updateAdjustment(
                                snapshotId,
                                "upload_qty",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="rounded-md bg-muted/60 p-2 text-center">
                          <p className="text-[11px] text-muted-foreground">Bajar T</p>
                          <Input
                            type="number"
                            className="mt-1 h-8 w-full text-center"
                            value={adj.download_qty ?? ""}
                            onChange={(e) =>
                              updateAdjustment(
                                snapshotId,
                                "download_qty",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs font-semibold">
                        <span>Estado</span>
                        <Badge variant={state === "ok" ? "default" : "secondary"}>
                          {state.toUpperCase()}
                          {difference !== 0 ? ` (${difference})` : ""}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <Select
                          value={adj.reason || NO_REASON}
                          onValueChange={(v) =>
                            updateAdjustment(
                              snapshotId,
                              "reason",
                              v || NO_REASON
                            )
                          }
                        >
                          <SelectTrigger className="h-9 w-full text-left text-xs">
                            <SelectValue placeholder="Clasificación" />
                          </SelectTrigger>
                          <SelectContent className="max-h-56 overflow-auto text-xs">
                            <SelectItem value={NO_REASON}>
                              (Sin clasificación)
                            </SelectItem>
                            {ADJUSTMENT_REASONS.map((reason) => (
                              <SelectItem key={reason} value={reason}>
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          className="h-9 w-full text-sm"
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
