"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

/* ================= Helpers ================= */

const ALL = "__ALL__";

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

  const normalized = String(raw)
    .replace(/,/g, ".")
    .replace(/[^0-9.-]/g, "")
    .trim();

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function getFirstNumber(obj, keys, fallback = 0) {
  for (const key of keys) {
    const value = parseStockValue(obj?.[key]);
    if (value !== null) return value;
  }
  return fallback;
}

function toNumber(raw, fallback = 0) {
  const value = parseStockValue(raw);
  return value === null ? fallback : value;
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

/* ===== Map de campos según tu modelo ===== */

function getCategoriaOnline(p) {
  if (Array.isArray(p.category_path) && p.category_path.length > 0) {
    return p.category_path.join(" - ");
  }
  return p.online_category || p.category_name || p.category_id || "—";
}

function getIdTienda(p) {
  return p.idTienda ?? p.store_external_id ?? "";
}

function getCodProducto(p) {
  return p.tkc_code ?? p.product_code ?? p.barcode ?? "";
}

function getSuministrador(p) {
  return (
    p.supplier_name ??
    p.provider_name ??
    p.provider_id ??
    p.supplier_id ??
    ""
  );
}

function getEF(p) {
  return getFirstNumber(p, [
    "existencia_fisica",
    "physical_stock",
    "exist_fisica",
    "stock",
    "ef",
  ]);
}

function getReserva(p) {
  return getFirstNumber(p, [
    "reserva",
    "reserve_qty",
    "reserved",
    "reserved_qty",
    "A",
    "almacen",
  ]);
}

function getDisponibleTienda(p) {
  return getFirstNumber(p, [
    "disponible_tienda",
    "store_qty",
    "disponible",
    "available_store",
    "available",
    "tienda",
  ]);
}

function getPrecioCosto(p) {
  return toNumber(p.precio_costo ?? p.cost_price ?? p.costo ?? p.price ?? 0);
}

function getNoAlmacen(p) {
  return (
    p.no_almacen ??
    p.warehouse_code ??
    p.warehouse_name ??
    p.store_warehouse ??
    ""
  );
}

function getMarca(p) {
  return p.brand ?? "";
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

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const [total, setTotal] = useState(0);

  // Filtros PENDIENTES (UI)
  const [pExistencia, setPExistencia] = useState(ALL);
  const [pAlmacen, setPAlmacen] = useState(ALL);
  const [pSuministrador, setPSuministrador] = useState(ALL);
  const [pCategoria, setPCategoria] = useState(ALL);
  const [pMarca, setPMarca] = useState(ALL);
  const [pHabilitado, setPHabilitado] = useState(ALL);
  const [pActivado, setPActivado] = useState(ALL);

  // Filtros APLICADOS (los que viajan al servidor)
  const [aExistencia, setAExistencia] = useState(ALL);
  const [aAlmacen, setAAlmacen] = useState(ALL);
  const [aSuministrador, setASuministrador] = useState(ALL);
  const [aCategoria, setACategoria] = useState(ALL);
  const [aMarca, setAMarca] = useState(ALL);
  const [aHabilitado, setAHabilitado] = useState(ALL);
  const [aActivado, setAActivado] = useState(ALL);

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
    aExistencia,
    aAlmacen,
    aSuministrador,
    aCategoria,
    aMarca,
    aHabilitado,
    aActivado,
  ]);

  async function loadProducts() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("perPage", String(perPage));

      if (search.trim()) params.set("search", search.trim());

      if (aExistencia !== ALL) params.set("existencia", aExistencia);
      if (aAlmacen !== ALL) params.set("almacen", aAlmacen);
      if (aSuministrador !== ALL)
        params.set("suministrador", aSuministrador);
      if (aCategoria !== ALL) params.set("categoria", aCategoria);
      if (aMarca !== ALL) params.set("marca", aMarca);
      if (aHabilitado !== ALL) params.set("habilitado", aHabilitado);
      if (aActivado !== ALL) params.set("activado", aActivado);

      const res = await fetch(`/api/products?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();

      setRows(Array.isArray(data.data) ? data.data : []);
      setTotal(Number(data.total || 0));
      setPerPage(Number(data.perPage || data.limit || perPage));
    } catch (e) {
      console.error("Load products failed", e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  // Opciones de filtros derivadas de los datos cargados (pueden ser parciales, está bien)
  const opciones = useMemo(() => {
    const almacenes = new Set();
    const sumin = new Set();
    const categorias = new Set();
    const marcas = new Set();

    rows.forEach((p) => {
      const nal = String(getNoAlmacen(p) || "").trim();
      if (nal) almacenes.add(nal);

      const sup = String(getSuministrador(p) || "").trim();
      if (sup) sumin.add(sup);

      const cat = String(getCategoriaOnline(p) || "").trim();
      if (cat) categorias.add(cat);

      const m = String(getMarca(p) || "").trim();
      if (m) marcas.add(m);
    });

    const toArr = (s) =>
      Array.from(s).sort((a, b) => a.localeCompare(b, "es"));

    return {
      almacenes: toArr(almacenes),
      suministradores: toArr(sumin),
      categorias: toArr(categorias),
      marcas: toArr(marcas),
    };
  }, [rows]);

  // Aplicar filtros → mueve pendientes a aplicados y resetea página
  function aplicarFiltros() {
    setAExistencia(pExistencia);
    setAAlmacen(pAlmacen);
    setASuministrador(pSuministrador);
    setACategoria(pCategoria);
    setAMarca(pMarca);
    setAHabilitado(pHabilitado);
    setAActivado(pActivado);
    setPage(1);
  }

  function resetFiltros() {
    setPExistencia(ALL);
    setPAlmacen(ALL);
    setPSuministrador(ALL);
    setPCategoria(ALL);
    setPMarca(ALL);
    setPHabilitado(ALL);
    setPActivado(ALL);

    setAExistencia(ALL);
    setAAlmacen(ALL);
    setASuministrador(ALL);
    setACategoria(ALL);
    setAMarca(ALL);
    setAHabilitado(ALL);
    setAActivado(ALL);

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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Productos</h1>
        <p className="text-muted-foreground">
          Vista operativa del inventario por tienda y categoría online.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="lg:flex items-center justify-between gap-4">
              <div className="max-lg:pb-2">
                <CardTitle>Listado de productos</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Busca por nombre, código, código de barras o Id tienda.
                </p>
              </div>

              <div className="lg:flex items-center grid gap-3">
                <div className="relative">
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
                    <Button variant="outline" className="gap-2">
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
            <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-3 xl:grid-cols-7">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  Existencia
                </span>
                <Select
                  value={pExistencia}
                  onValueChange={setPExistencia}
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
                  value={pAlmacen}
                  onValueChange={setPAlmacen}
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
                  value={pSuministrador}
                  onValueChange={setPSuministrador}
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
                  value={pCategoria}
                  onValueChange={setPCategoria}
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
                  value={pMarca}
                  onValueChange={setPMarca}
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
                  value={pHabilitado}
                  onValueChange={setPHabilitado}
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
                  value={pActivado}
                  onValueChange={setPActivado}
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
                (Los selectores se aplican al presionar “Aplicar filtros”)
              </span>
            </div>
            {/* Resultados */}
            <span className="text-sm text-muted-foreground">
                  {resultsLabel}
                </span>

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
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
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
              <Table className="min-w-[1400px]">
                <TableHeader>
                  <TableRow>
                    {cols.categoria && (
                      <TableHead>Categoría Online</TableHead>
                    )}
                    {cols.idTienda && <TableHead>Id Tienda</TableHead>}
                    {cols.codProducto && (
                      <TableHead>Cod. Producto</TableHead>
                    )}
                    {cols.nombre && <TableHead>Nombre</TableHead>}
                    {cols.marca && <TableHead>Marca</TableHead>}
                    {cols.suministrador && (
                      <TableHead>Suministrador</TableHead>
                    )}
                    {cols.exist && (
                      <TableHead className={compactHeader}>
                        Existencia Física (EF)
                      </TableHead>
                    )}
                    {cols.reserva && (
                      <TableHead className={compactHeader}>
                        Reserva (A)
                      </TableHead>
                    )}
                    {cols.dispTienda && (
                      <TableHead className={compactHeader}>
                        Disp. Tienda (T)
                      </TableHead>
                    )}
                    {cols.precioCosto && (
                      <TableHead className={compactHeader}>
                        Precio Costo
                      </TableHead>
                    )}
                    {cols.noAlmacen && (
                      <TableHead className={compactHeader}>
                        No. Almacén
                      </TableHead>
                    )}
                    {cols.estadoAnuncio && (
                      <TableHead>Estado de Anuncio</TableHead>
                    )}
                    {cols.estadoTienda && (
                      <TableHead>Estado en tienda</TableHead>
                    )}
                    {cols.creado && <TableHead>Creado</TableHead>}
                    {cols.actualizado && (
                      <TableHead>Actualizado</TableHead>
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
                            <TruncatedCell value={p.name} />
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

              {/* Paginación */}
              <div className="flex items-center justify-end gap-4 pt-4">
                <span className="text-xs text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
