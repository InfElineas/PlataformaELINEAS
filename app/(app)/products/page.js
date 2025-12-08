"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Settings2 } from "lucide-react";
import { ALL } from "@/hooks/useProductFilters";
import { useGlobalProductFilters } from "@/components/providers/ProductFiltersProvider";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

/* ================= Helpers ================= */

function fmt(val) {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
}

function fmtDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-ES", {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}

const compactNumberCell =
  "text-center text-xs font-semibold tabular-nums whitespace-nowrap px-2";
const compactHeader = "text-center text-xs font-semibold whitespace-nowrap px-2";
const sortableHeader =
  "text-left text-xs font-semibold whitespace-nowrap px-2 select-none";

const STOCK_KEYS = {
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
    "almacen",
    "A",
    "metadata.reserva",
    "metadata.reserve_qty",
    "metadata.reserved",
    "metadata.reserved_qty",
    "metadata.almacen",
    "metadata.A",
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

function fmtMoney(val) {
  const n = Number(val);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("es-ES", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseStockValue(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;

  let cleaned = String(raw).trim();
  if (!cleaned) return null;

  cleaned = cleaned.replace(/[^0-9,.-]/g, "");
  if (!cleaned) return null;

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

  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function getFirstNumber(obj, keys, fallback = 0) {
  const resolve = (target, path) => {
    if (!target || !path) return undefined;
    if (!path.includes(".")) return target?.[path];
    return path.split(".").reduce((acc, part) => acc?.[part], target);
  };

  for (const key of keys) {
    const direct = parseStockValue(resolve(obj, key));
    if (direct !== null) return direct;

    const meta = parseStockValue(resolve(obj?.metadata, key));
    if (meta !== null) return meta;
  }
  return fallback;
}

function toNumber(raw, fallback = 0) {
  const value = parseStockValue(raw);
  return value === null ? fallback : value;
}

function getFirstString(obj, keys, fallback = "") {
  const resolve = (target, path) => {
    if (!target || !path) return undefined;
    if (!path.includes(".")) return target?.[path];
    return path.split(".").reduce((acc, part) => acc?.[part], target);
  };

  for (const key of keys) {
    const value = resolve(obj, key);
    if (value !== undefined && value !== null) {
      const text = String(value).trim();
      if (text) return text;
    }

    const metaVal = resolve(obj?.metadata, key);
    if (metaVal !== undefined && metaVal !== null) {
      const text = String(metaVal).trim();
      if (text) return text;
    }
  }
  return fallback;
}

function mergeOptions(a = [], b = []) {
  return Array.from(new Set([...(a || []), ...(b || [])]));
}

// Truncar a 12 caracteres con tooltip
function TruncatedCell({ value, className }) {
  const raw = fmt(value);
  if (raw === "—") return <span className={className}>—</span>;

  const truncated =
    raw.length > 12 ? `${raw.slice(0, 12)}…` : raw;

  return (
    <span className={className} title={raw}>
      {truncated}
    </span>
  );
}

function SortIndicator({ active, direction }) {
  if (!active) {
    return <span className="text-muted-foreground">↕</span>;
  }
  return (
    <span className="font-semibold text-muted-foreground">
      {direction === "asc" ? "↑" : "↓"}
    </span>
  );
}

function InfoRow({ label, value }) {
  const display = fmt(value);
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-xs font-medium" title={display === "—" ? undefined : display}>
        {display}
      </span>
    </div>
  );
}

function getProductImage(p) {
  return (
    p.image ||
    p.image_url ||
    p.thumbnail ||
    p.thumbnail_url ||
    p.metadata?.image ||
    p.metadata?.image_url ||
    p.metadata?.thumbnail ||
    p.metadata?.thumbnail_url ||
    ""
  );
}

function ProductHoverCard({
  product,
  categoriaOnline,
  idTienda,
  codProducto,
  suministrador,
  marca,
  noAlmacen,
  ef,
  reserva,
  tienda,
  precioCosto,
  children,
}) {
  const description = getFirstString(
    product,
    ["description", "metadata.description", "metadata.descripcion"],
    "",
  );
  const image = getProductImage(product);

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-96 space-y-3">
        <div className="flex gap-3">
          <Avatar className="h-16 w-16 rounded-md border">
            {image ? <AvatarImage src={image} alt={product.name} /> : null}
            <AvatarFallback className="rounded-md bg-primary/10 font-semibold text-primary">
              {(product.name || "P").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold leading-tight" title={product.name}>
              {fmt(product.name)}
            </p>
            {marca ? <p className="text-xs text-muted-foreground">{marca}</p> : null}
            {categoriaOnline ? (
              <p className="text-xs text-muted-foreground truncate" title={categoriaOnline}>
                {categoriaOnline}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <InfoRow label="Cód. Producto" value={codProducto} />
          <InfoRow label="Id Tienda" value={idTienda} />
          <InfoRow label="Suministrador" value={suministrador} />
          <InfoRow label="No. Almacén" value={noAlmacen} />
          <InfoRow label="EF" value={ef} />
          <InfoRow label="Reserva" value={reserva} />
          <InfoRow label="Disp. Tienda" value={tienda} />
          <InfoRow label="Precio costo" value={fmtMoney(precioCosto)} />
        </div>

        {description ? (
          <p
            className="max-h-20 overflow-hidden text-xs leading-snug text-muted-foreground"
            title={description}
          >
            {description}
          </p>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}

/* ===== Map de campos según tu modelo ===== */

function getCategoriaOnline(p) {
  if (Array.isArray(p.category_path) && p.category_path.length > 0) {
    return p.category_path.join(" - ");
  }
  return p.online_category || p.category_name || p.category_id || "—";
}

function getIdTienda(p) {
  return getFirstString(p, ["idTienda", "store_external_id"], "");
}

function getCodProducto(p) {
  return getFirstString(p, ["tkc_code", "product_code", "barcode"], "");
}

function getSuministrador(p) {
  return getFirstString(
    p,
    ["supplier_name", "provider_name", "provider_id", "supplier_id"],
    "",
  );
}

function getEF(p) {
  return getFirstNumber(p, STOCK_KEYS.existencia);
}

function getReserva(p) {
  return getFirstNumber(p, STOCK_KEYS.reserva);
}

function getDisponibleTienda(p) {
  return getFirstNumber(p, STOCK_KEYS.tienda);
}

function getPrecioCosto(p) {
  return toNumber(p.precio_costo ?? p.cost_price ?? p.costo ?? p.price ?? 0);
}

function getNoAlmacen(p) {
  return getFirstString(
    p,
    [
      "no_almacen",
      "warehouse_code",
      "warehouse_name",
      "store_warehouse",
      "metadata.no_almacen",
      "metadata.warehouse_code",
      "metadata.warehouse_name",
    ],
    "",
  );
}

function getMarca(p) {
  return getFirstString(p, ["brand"], "");
}

function getActivado(p) {
  return (p.status ?? "") === "active";
}

/* ===== Estados derivados para badges ===== */

function getEstadoAnuncio(p) {
  const EF = getEF(p);
  const ID = getCodProducto(p);
  const status = p.status || "";

  if (!ID) {
    return EF === 0 ? "SIN ID EF = 0" : "SIN ID EF > 0";
  }

  if (status === "active") {
    return "ACTIVADO";
  }

  if (status === "dead" || status === "muerto") {
    return EF === 0
      ? "DESACTIVADO MUERTO EF = 0"
      : "DESACTIVADO MUERTO EF > 0";
  }

  return EF === 0 ? "DESACTIVADO EF = 0" : "DESACTIVADO EF > 0";
}

function getEstadoTienda(p) {
  const ID = getCodProducto(p);
  const EF = getEF(p);
  const A = getReserva(p);
  const T = getDisponibleTienda(p);

  if (!ID) {
    return EF === 0 ? 'SIN ID (ID = "" y EF = 0)' : 'SIN ID (ID = "" y EF > 0)';
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

function badgeVariantAnuncio(label) {
  if (label.startsWith("ACTIVADO")) return "default";
  if (label.startsWith("SIN ID")) return "secondary";
  if (label.startsWith("DESACTIVADO")) return "destructive";
  return "outline";
}

function badgeVariantTienda(label) {
  if (label.startsWith("DISPONIBLE")) return "default";
  if (label.startsWith("PROXIMO") || label.startsWith("ULTIMAS PIEZAS")) {
    return "secondary";
  }
  return "destructive";
}

/* ================= Página ================= */

export default function ProductsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState({
    almacenes: [],
    suministradores: [],
    categorias: [],
    marcas: [],
    estadosTienda: [],
  });

  const {
    pendingFilters,
    appliedFilters,
    search,
    sort,
    setSearch,
    setPendingFilter,
    setSort,
    applyFilters,
    resetFilters,
  } = useGlobalProductFilters();

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const [total, setTotal] = useState(0);
  const { sortBy, sortDir } = sort;

  // Columnas visibles
  const [cols, setCols] = useState({
    categoria: true,
    idTienda: true,
    codProducto: true,
    nombre: true,
    suministrador: true,
    exist: true,
    reserva: true,
    dispTienda: true,
    precioCosto: true,
    noAlmacen: true,
    estadoAnuncio: true,
    estadoTienda: true,
    creado: true,
    actualizado: true,
    marca: false,
  });

  const setCol = (k, v) => setCols((c) => ({ ...c, [k]: v }));

  const setFilterAndApply = (key) => (value) => {
    setPendingFilter(key, value);
    setTimeout(() => applyFilters(), 0);
  };

  // Carga de datos desde el servidor (global search + filtros + paginación)
  useEffect(() => {
    const id = setTimeout(() => {
      loadProducts();
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    search,
    appliedFilters.existencia,
    appliedFilters.almacen,
    appliedFilters.suministrador,
    appliedFilters.categoria,
    appliedFilters.marca,
    appliedFilters.habilitado,
    appliedFilters.activado,
    appliedFilters.estado_tienda,
    sortBy,
    sortDir,
  ]);

  async function loadProducts() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("perPage", String(perPage));

      if (search.trim()) params.set("search", search.trim());
      params.set("includeFilters", "1");

      if (appliedFilters.existencia !== ALL)
        params.set("existencia", appliedFilters.existencia);
      if (appliedFilters.almacen !== ALL)
        params.set("almacen", appliedFilters.almacen);
      if (appliedFilters.suministrador !== ALL)
        params.set("suministrador", appliedFilters.suministrador);
      if (appliedFilters.categoria !== ALL)
        params.set("categoria", appliedFilters.categoria);
      if (appliedFilters.marca !== ALL) params.set("marca", appliedFilters.marca);
      if (appliedFilters.habilitado !== ALL)
        params.set("habilitado", appliedFilters.habilitado);
      if (appliedFilters.activado !== ALL)
        params.set("activado", appliedFilters.activado);
      if (appliedFilters.estado_tienda !== ALL)
        params.set("estado_tienda", appliedFilters.estado_tienda);
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);

      const res = await fetch(`/api/products?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();

      const nextRows = Array.isArray(data.data) ? data.data : [];
      setRows(nextRows);
      setTotal(Number(data.total || 0));
      setPerPage(Number(data.perPage || data.limit || perPage));

      const derived = {
        almacenes: [],
        suministradores: [],
        categorias: [],
        marcas: [],
        estadosTienda: [],
      };

      nextRows.forEach((p) => {
        const nal = String(getNoAlmacen(p) || "").trim();
        if (nal) derived.almacenes.push(nal);

        const sup = String(getSuministrador(p) || "").trim();
        if (sup) derived.suministradores.push(sup);

        const cat = String(getCategoriaOnline(p) || "").trim();
        if (cat) derived.categorias.push(cat);

        const m = String(getMarca(p) || "").trim();
        if (m) derived.marcas.push(m);

        const et = String(getEstadoTienda(p) || "").trim();
        if (et) derived.estadosTienda.push(et);
      });

      setFilterOptions({
        almacenes: mergeOptions(data.meta?.warehouses, derived.almacenes),
        suministradores: mergeOptions(
          data.meta?.suppliers,
          derived.suministradores,
        ),
        categorias: mergeOptions(data.meta?.categories, derived.categorias),
        marcas: mergeOptions(data.meta?.brands, derived.marcas),
        estadosTienda: mergeOptions(
          data.meta?.storeStatuses,
          derived.estadosTienda,
        ),
      });
    } catch (e) {
      console.error("Load products failed", e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  // Opciones de filtros combinadas (API + derivadas de las filas)
  const opciones = useMemo(
    () => ({
      almacenes: Array.from(new Set(filterOptions.almacenes || [])).sort(
        (a, b) => a.localeCompare(b, "es"),
      ),
      suministradores: Array.from(
        new Set(filterOptions.suministradores || []),
      ).sort((a, b) => a.localeCompare(b, "es")),
      categorias: Array.from(new Set(filterOptions.categorias || [])).sort(
        (a, b) => a.localeCompare(b, "es"),
      ),
      marcas: Array.from(new Set(filterOptions.marcas || [])).sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
      estadosTienda: Array.from(
        new Set(filterOptions.estadosTienda || []),
      ).sort((a, b) => a.localeCompare(b, "es")),
    }),
    [filterOptions],
  );

  const {
    existencia: aExistencia,
    almacen: aAlmacen,
    suministrador: aSuministrador,
    categoria: aCategoria,
    marca: aMarca,
    habilitado: aHabilitado,
    activado: aActivado,
    estado_tienda: aEstadoTienda,
  } = appliedFilters;

  function toggleSort(field) {
    setSort((prev) => {
      if (prev.sortBy === field) {
        return { ...prev, sortDir: prev.sortDir === "asc" ? "desc" : "asc" };
      }
      return { ...prev, sortBy: field, sortDir: "asc" };
    });
    setPage(1);
  }

  const SortableHead = ({ field, label, className = sortableHeader }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => toggleSort(field)}
        className="flex items-center gap-1 w-full"
      >
        <span className="text-left flex-1">{label}</span>
        <SortIndicator active={sortBy === field} direction={sortDir} />
      </button>
    </TableHead>
  );

  // Aplicar filtros → mueve pendientes a aplicados y resetea página
  function aplicarFiltros() {
    applyFilters();
    setPage(1);
  }

  function resetFiltros() {
    resetFilters();
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const firstItem = total === 0 ? 0 : (page - 1) * perPage + 1;
  const lastItem =
    total === 0 ? 0 : firstItem + rows.length - 1;

  const resultsLabel = loading
    ? "Cargando…"
    : `${total} resultado(s) · ${firstItem}-${lastItem} en la página ${page} de ${totalPages}`;

  /* ================= Render ================= */

  return (
    <div className="space-y-6 pb-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Productos</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Vista operativa del inventario por tienda y categoría online.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4 sm:pb-6">
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 lg:flex lg:items-center lg:justify-between">
              <div className="max-lg:pb-1">
                <CardTitle className="text-lg sm:text-xl">Listado de productos</CardTitle>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Busca por nombre, código, código de barras o Id tienda.
                </p>
              </div>

              <div className="grid gap-3 lg:flex lg:items-center">
                <div className="relative w-full min-w-[240px] lg:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar productos..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                  />
                </div>

                {/* Columnas visibles */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 whitespace-nowrap">
                      <Settings2 className="h-4 w-4" />
                      Columnas visibles
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="max-h-80 overflow-auto"
                  >
                    <DropdownMenuCheckboxItem
                      checked={cols.categoria}
                      onCheckedChange={(v) =>
                        setCol("categoria", !!v)
                      }
                    >
                      Categoría Online
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={cols.idTienda}
                      onCheckedChange={(v) =>
                        setCol("idTienda", !!v)
                      }
                    >
                      Id Tienda
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={cols.codProducto}
                      onCheckedChange={(v) =>
                        setCol("codProducto", !!v)
                      }
                    >
                      Cod. Producto
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={cols.nombre}
                      onCheckedChange={(v) =>
                        setCol("nombre", !!v)
                      }
                    >
                      Nombre
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={cols.marca}
                      onCheckedChange={(v) =>
                        setCol("marca", !!v)
                      }
                    >
                      Marca
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={cols.suministrador}
                      onCheckedChange={(v) =>
                        setCol("suministrador", !!v)
                      }
                    >
                      Suministrador
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={cols.exist}
                      onCheckedChange={(v) =>
                        setCol("exist", !!v)
                      }
                    >
                      Existencia Física
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={cols.reserva}
                      onCheckedChange={(v) =>
                        setCol("reserva", !!v)
                      }
                    >
                      Reserva (A)
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={cols.dispTienda}
                      onCheckedChange={(v) =>
                        setCol("dispTienda", !!v)
                      }
                    >
                      Disp. Tienda (T)
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={cols.precioCosto}
                      onCheckedChange={(v) =>
                        setCol("precioCosto", !!v)
                      }
                    >
                      Precio Costo
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={cols.noAlmacen}
                      onCheckedChange={(v) =>
                        setCol("noAlmacen", !!v)
                      }
                    >
                      No. Almacén
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={cols.estadoAnuncio}
                      onCheckedChange={(v) =>
                        setCol("estadoAnuncio", !!v)
                      }
                    >
                      Estado de Anuncio
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={cols.estadoTienda}
                      onCheckedChange={(v) =>
                        setCol("estadoTienda", !!v)
                      }
                    >
                      Estado en tienda
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={cols.creado}
                      onCheckedChange={(v) =>
                        setCol("creado", !!v)
                      }
                    >
                      Creado
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={cols.actualizado}
                      onCheckedChange={(v) =>
                        setCol("actualizado", !!v)
                      }
                    >
                      Actualizado
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>

              </div>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-3 xl:grid-cols-8">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Existencia
                </span>
                <Select
                  value={pendingFilters.existencia}
                  onValueChange={setFilterAndApply("existencia")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Existencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>(Todas)</SelectItem>
                    <SelectItem value="con">
                      Con existencia (&gt; 0)
                    </SelectItem>
                    <SelectItem value="sin">
                      Sin existencia (= 0)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Almacén
                </span>
                <Select
                  value={pendingFilters.almacen}
                  onValueChange={setFilterAndApply("almacen")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Almacén" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-auto">
                    <SelectItem value={ALL}>(Todos)</SelectItem>
                    {opciones.almacenes.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Suministrador
                </span>
                <Select
                  value={pendingFilters.suministrador}
                  onValueChange={setFilterAndApply("suministrador")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Suministrador" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-auto">
                    <SelectItem value={ALL}>(Todos)</SelectItem>
                    {opciones.suministradores.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Categoría Online
                </span>
                <Select
                  value={pendingFilters.categoria}
                  onValueChange={setFilterAndApply("categoria")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Categoría Online" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-auto">
                    <SelectItem value={ALL}>(Todas)</SelectItem>
                    {opciones.categorias.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Marca
                </span>
                <Select
                  value={pendingFilters.marca}
                  onValueChange={setFilterAndApply("marca")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Marca" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-auto">
                    <SelectItem value={ALL}>(Todas)</SelectItem>
                    {opciones.marcas.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Habilitado
                </span>
                <Select
                  value={pendingFilters.habilitado}
                  onValueChange={setFilterAndApply("habilitado")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Habilitado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>(Todos)</SelectItem>
                    <SelectItem value="si">Sí</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Activado
                </span>
                <Select
                  value={pendingFilters.activado}
                  onValueChange={setFilterAndApply("activado")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Activado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>(Todos)</SelectItem>
                    <SelectItem value="si">Sí</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Estado en tienda
                </span>
                <Select
                  value={pendingFilters.estado_tienda}
                  onValueChange={setFilterAndApply("estado_tienda")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estado tienda" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-auto">
                    <SelectItem value={ALL}>(Todos)</SelectItem>
                    {opciones.estadosTienda.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botones filtros */}
            <div className="lg:flex max-lg:grid items-center gap-3">
              <Button onClick={aplicarFiltros} className="gap-2">
                Aplicar filtros
              </Button>
              <Button variant="outline" onClick={resetFiltros}>
                Limpiar filtros
              </Button>
              <span className="text-xs text-muted-foreground">
                (Los selectores globales se aplican al elegir una opción)
              </span>
            </div>
            {/* Resultados */}
            <span className="text-sm text-muted-foreground">{resultsLabel}</span>

            {/* Chips filtros aplicados */}
            <div className="flex flex-wrap gap-2">
              {aExistencia !== ALL && (
                <Badge variant="secondary">
                  Existencia: {aExistencia === "con" ? "Con" : "Sin"}
                </Badge>
              )}
              {aAlmacen !== ALL && (
                <Badge variant="secondary">Almacén: {aAlmacen}</Badge>
              )}
              {aSuministrador !== ALL && (
                <Badge variant="secondary">
                  Suministrador: {aSuministrador}
                </Badge>
              )}
              {aCategoria !== ALL && (
                <Badge variant="secondary">
                  Categoría: {aCategoria}
                </Badge>
              )}
              {aMarca !== ALL && (
                <Badge variant="secondary">Marca: {aMarca}</Badge>
              )}
              {aHabilitado !== ALL && (
                <Badge variant="secondary">
                  Habilitado: {aHabilitado}
                </Badge>
              )}
                {aActivado !== ALL && (
                  <Badge variant="secondary">
                    Activado: {aActivado}
                  </Badge>
                )}
                {aEstadoTienda !== ALL && (
                  <Badge variant="secondary">
                    Estado tienda: {aEstadoTienda}
                  </Badge>
                )}
              </div>
          </div>
        </CardHeader>

        <CardContent className="rounded-lg border border-border/60 p-0 sm:p-2">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Cargando productos…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No se encontraron productos.
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                    {cols.categoria && (
                      <SortableHead
                        field="category_name"
                        label="Categoría Online"
                        className={sortableHeader}
                      />
                    )}
                    {cols.idTienda && (
                      <SortableHead
                        field="store_external_id"
                        label="Id Tienda"
                      />
                    )}
                    {cols.codProducto && (
                      <SortableHead field="product_code" label="Cod. Producto" />
                    )}
                    {cols.nombre && <SortableHead field="name" label="Nombre" />}
                    {cols.marca && <SortableHead field="brand" label="Marca" />}
                    {cols.suministrador && (
                      <SortableHead
                        field="supplier_name"
                        label="Suministrador"
                      />
                    )}
                    {cols.exist && (
                      <SortableHead
                        field="existencia_fisica"
                        label="Existencia Física (EF)"
                        className={compactHeader}
                      />
                    )}
                    {cols.reserva && (
                      <SortableHead
                        field="reserva"
                        label="Reserva (A)"
                        className={compactHeader}
                      />
                    )}
                    {cols.dispTienda && (
                      <SortableHead
                        field="disponible_tienda"
                        label="Disp. Tienda (T)"
                        className={compactHeader}
                      />
                    )}
                    {cols.precioCosto && (
                      <SortableHead
                        field="precio_costo"
                        label="Precio Costo"
                        className={compactHeader}
                      />
                    )}
                    {cols.noAlmacen && (
                      <SortableHead
                        field="no_almacen"
                        label="No. Almacén"
                        className={compactHeader}
                      />
                    )}
                    {cols.estadoAnuncio && (
                      <SortableHead
                        field="status"
                        label="Estado de Anuncio"
                      />
                    )}
                    {cols.estadoTienda && (
                      <SortableHead
                        field="store_status"
                        label="Estado en tienda"
                      />
                    )}
                    {cols.creado && (
                      <SortableHead field="created_at" label="Creado" />
                    )}
                    {cols.actualizado && (
                      <SortableHead field="updated_at" label="Actualizado" />
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => {
                    const categoriaOnline = getCategoriaOnline(p);
                    const idTienda = getIdTienda(p);
                    const codProducto = getCodProducto(p);
                    const suministrador = getSuministrador(p);
                    const EF = getEF(p);
                    const A = getReserva(p);
                    const T = getDisponibleTienda(p);
                    const precioCosto = getPrecioCosto(p);
                    const noAlmacen = getNoAlmacen(p);
                    const marca = getMarca(p);
                    const estadoAnuncio = getEstadoAnuncio(p);
                    const estadoTienda = getEstadoTienda(p);
                    const anuncioVariant =
                      badgeVariantAnuncio(estadoAnuncio);
                    const tiendaVariant =
                      badgeVariantTienda(estadoTienda);

                    return (
                      <TableRow key={p._id}>
                        {cols.categoria && (
                          <TableCell className="text-sm">
                            <TruncatedCell
                              value={categoriaOnline}
                            />
                          </TableCell>
                        )}
                        {cols.idTienda && (
                          <TableCell className="font-mono text-xs">
                            <TruncatedCell value={idTienda} />
                          </TableCell>
                        )}
                        {cols.codProducto && (
                          <TableCell className="font-mono text-xs">
                            <TruncatedCell value={codProducto} />
                          </TableCell>
                        )}
                        {cols.nombre && (
                          <TableCell className="text-sm font-medium">
                            <ProductHoverCard
                              product={p}
                              categoriaOnline={categoriaOnline}
                              idTienda={idTienda}
                              codProducto={codProducto}
                              suministrador={suministrador}
                              marca={marca}
                              noAlmacen={noAlmacen}
                              ef={EF}
                              reserva={A}
                              tienda={T}
                              precioCosto={precioCosto}
                            >
                              <TruncatedCell value={p.name} />
                            </ProductHoverCard>
                          </TableCell>
                        )}
                        {cols.marca && (
                          <TableCell className="text-sm">
                            <TruncatedCell value={marca} />
                          </TableCell>
                        )}
                        {cols.suministrador && (
                          <TableCell className="text-sm">
                            <TruncatedCell value={suministrador} />
                          </TableCell>
                        )}
                        {cols.exist && (
                          <TableCell className={compactNumberCell}>
                            {Number.isNaN(EF) ? "—" : EF}
                          </TableCell>
                        )}
                        {cols.reserva && (
                          <TableCell className={compactNumberCell}>
                            {Number.isNaN(A) ? "—" : A}
                          </TableCell>
                        )}
                        {cols.dispTienda && (
                          <TableCell className={compactNumberCell}>
                            {Number.isNaN(T) ? "—" : T}
                          </TableCell>
                        )}
                        {cols.precioCosto && (
                          <TableCell className={compactNumberCell}>
                            {fmtMoney(precioCosto)}
                          </TableCell>
                        )}
                        {cols.noAlmacen && (
                          <TableCell className={compactNumberCell}>
                            <TruncatedCell value={noAlmacen} />
                          </TableCell>
                        )}
                        {cols.estadoAnuncio && (
                          <TableCell>
                            <Badge variant={anuncioVariant}>
                              {estadoAnuncio}
                            </Badge>
                          </TableCell>
                        )}
                        {cols.estadoTienda && (
                          <TableCell>
                            <Badge variant={tiendaVariant}>
                              {estadoTienda}
                            </Badge>
                          </TableCell>
                        )}
                        {cols.creado && (
                          <TableCell className="whitespace-nowrap text-xs">
                            {fmtDate(p.created_at)}
                          </TableCell>
                        )}
                        {cols.actualizado && (
                          <TableCell className="whitespace-nowrap text-xs">
                            {fmtDate(p.updated_at)}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
                </Table>
              </div>

              <div className="space-y-3 p-3 md:hidden">
                {rows.map((p) => {
                  const categoriaOnline = getCategoriaOnline(p);
                  const idTienda = getIdTienda(p);
                  const codProducto = getCodProducto(p);
                  const suministrador = getSuministrador(p);
                  const EF = getEF(p);
                  const A = getReserva(p);
                  const T = getDisponibleTienda(p);
                  const precioCosto = getPrecioCosto(p);
                  const noAlmacen = getNoAlmacen(p);
                  const marca = getMarca(p);
                  const estadoAnuncio = getEstadoAnuncio(p);
                  const estadoTienda = getEstadoTienda(p);
                  const anuncioVariant = badgeVariantAnuncio(estadoAnuncio);
                  const tiendaVariant = badgeVariantTienda(estadoTienda);

                  return (
                    <div
                      key={p._id}
                      className="space-y-3 rounded-lg border border-border/60 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-1 items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={p.avatar} alt={p.name} />
                            <AvatarFallback>
                              {(p.name || "?")?.charAt(0)?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-semibold leading-tight line-clamp-2">
                              {p.name || "Producto sin nombre"}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {codProducto || "Sin código"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-right">
                          <Badge variant={tiendaVariant} className="text-[11px]">
                            {estadoTienda}
                          </Badge>
                          <Badge variant={anuncioVariant} className="text-[11px]">
                            {estadoAnuncio}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Categoría</p>
                          <p className="line-clamp-2">
                            {categoriaOnline || "Sin categoría"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Suministrador</p>
                          <p className="line-clamp-2">
                            {suministrador || "—"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Marca</p>
                          <p>{marca || "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Almacén</p>
                          <p>{noAlmacen || "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Id tienda</p>
                          <p className="font-mono text-[11px] text-foreground">
                            {idTienda || "—"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Costo</p>
                          <p className="text-foreground">{fmtMoney(precioCosto)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                        <div className="rounded-md bg-muted/70 p-2">
                          <p className="text-[11px] text-muted-foreground">EF</p>
                          <p className="text-sm text-foreground">{Number.isNaN(EF) ? "—" : EF}</p>
                        </div>
                        <div className="rounded-md bg-muted/70 p-2">
                          <p className="text-[11px] text-muted-foreground">A</p>
                          <p className="text-sm text-foreground">{Number.isNaN(A) ? "—" : A}</p>
                        </div>
                        <div className="rounded-md bg-muted/70 p-2">
                          <p className="text-[11px] text-muted-foreground">T</p>
                          <p className="text-sm text-foreground">{Number.isNaN(T) ? "—" : T}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-4 md:justify-end md:px-0">
                <span className="text-xs text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
