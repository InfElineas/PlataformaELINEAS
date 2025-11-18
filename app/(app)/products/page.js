'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
<<<<<<< HEAD
import { Search } from 'lucide-react';
=======
import { Button } from '@/components/ui/button';
import { Search, Settings2 } from 'lucide-react';
>>>>>>> main
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

/* ================= Helpers ================= */

function fmt(val) {
  if (val === null || val === undefined || val === '') return '—';
  return String(val);
}
<<<<<<< HEAD
function fmtDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}


=======
>>>>>>> main
function fmtDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('es-ES', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function fmtMoney(val) {
  const n = Number(val);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function toNumber(raw, fallback = 0) {
  const n = Number(raw);
  return Number.isNaN(n) ? fallback : n;
}

/* ===== Map de campos según tu modelo actual (ajustables) ===== */

function getCategoriaOnline(p) {
  if (Array.isArray(p.category_path) && p.category_path.length > 0) return p.category_path.join(' - ');
  return p.category_name || p.category_id || '—';
}
function getIdTienda(p) { return p.idTienda ?? ''; }
function getCodProducto(p) { return p.tkc_code ?? p.product_code ?? p.barcode ?? ''; }
function getSuministrador(p) { return p.supplier_name ?? p.provider_name ?? p.provider_id ?? p.supplier_id ?? ''; }
function getEF(p) {
  return toNumber(p.existencia_fisica ?? p.exist_fisica ?? p.physical_stock ?? p.stock ?? 0);
}
function getReserva(p) { return toNumber(p.reserva ?? p.reserved ?? p.reserved_qty ?? 0); }
function getDisponibleTienda(p) { return toNumber(p.disponible_tienda ?? p.disponible ?? p.available_store ?? p.available ?? 0); }
function getPrecioCosto(p) { return toNumber(p.precio_costo ?? p.cost_price ?? p.costo ?? 0); }
function getNoAlmacen(p) { return p.no_almacen ?? p.warehouse_code ?? p.store_warehouse ?? ''; }
function getMarca(p) { return p.brand ?? ''; }
function getActivado(p) { return (p.status ?? '') === 'active'; } // “Activado”

/* ===== Estados derivados para badges ===== */

function getEstadoAnuncio(p) {
  const EF = getEF(p);
  const ID = getCodProducto(p);
  const status = p.status || '';
  if (!ID) return EF === 0 ? 'SIN ID EF = 0' : 'SIN ID EF > 0';
  if (status === 'active') return 'ACTIVADO';
  if (status === 'dead' || status === 'muerto') return EF === 0 ? 'DESACTIVADO MUERTO EF = 0' : 'DESACTIVADO MUERTO EF > 0';
  return EF === 0 ? 'DESACTIVADO EF = 0' : 'DESACTIVADO EF > 0';
}
function getEstadoTienda(p) {
  const ID = getCodProducto(p);
  const EF = getEF(p);
  const A = getReserva(p);
  const T = getDisponibleTienda(p);
  if (!ID) return EF === 0 ? 'SIN ID (ID = "" y EF = 0)' : 'SIN ID (ID = "" y EF > 0)';
  if (EF === 0) return 'AGOTADO (ID ≠ "" y EF = 0)';
  if (A === 0 && T > 6) return 'SIN RESERVA (A = 0 y T > 6)';
  if (T === 0) return EF > 10 ? 'NO TIENDA (T = 0 y EF > 10)' : 'NO TIENDA (T = 0 y EF ≤ 10)';
  if (T > 1 && T < A && A <= 10) return 'ULTIMAS PIEZAS (1 < T < A ≤ 10)';
  if (A >= 0 && A < T && T <= 10) return 'ULTIMAS PIEZAS (0 ≤ A < T ≤ 10)';
  if (T <= 10) return 'PROXIMO (T ≤ 10)';
  if (T <= A) return 'DISPONIBLE (T ≤ A)';
  return 'DISPONIBLE (A < T)';
}
function badgeVariantAnuncio(label) {
  if (label.startsWith('ACTIVADO')) return 'default';
  if (label.startsWith('SIN ID')) return 'secondary';
  if (label.startsWith('DESACTIVADO')) return 'destructive';
  return 'outline';
}
function badgeVariantTienda(label) {
  if (label.startsWith('DISPONIBLE')) return 'default';
  if (label.startsWith('PROXIMO') || label.startsWith('ULTIMAS PIEZAS')) return 'secondary';
  return 'destructive';
}

/* ================= Página ================= */

const ALL = '__ALL__';

export default function ProductsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Filtros PENDIENTES (lo que selecciona el usuario)
  const [pExistencia, setPExistencia] = useState(ALL);
  const [pAlmacen, setPAlmacen] = useState(ALL);
  const [pSuministrador, setPSuministrador] = useState(ALL);
  const [pCategoria, setPCategoria] = useState(ALL);
  const [pMarca, setPMarca] = useState(ALL);
  const [pHabilitado, setPHabilitado] = useState(ALL);
  const [pActivado, setPActivado] = useState(ALL);

  // Filtros APLICADOS (los que realmente filtran la tabla)
  const [aExistencia, setAExistencia] = useState(ALL);
  const [aAlmacen, setAAlmacen] = useState(ALL);
  const [aSuministrador, setASuministrador] = useState(ALL);
  const [aCategoria, setACategoria] = useState(ALL);
  const [aMarca, setAMarca] = useState(ALL);
  const [aHabilitado, setAHabilitado] = useState(ALL);
  const [aActivado, setAActivado] = useState(ALL);

  // Columnas visibles (toggle)
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

  // Carga de datos del backend (solo query de búsqueda a la API)
  useEffect(() => {
<<<<<<< HEAD
    const id = setTimeout(loadProducts, 250); // debounce
    return () => clearTimeout(id);
  }, [search]);

  async function loadProducts() {
    try {
      setLoading(true);
      const res = await fetch(`/api/products?search=${encodeURIComponent(search)}&limit=100`, {
        cache: 'no-store',
      });
    const id = setTimeout(() => loadProducts(search), 250); // debounce
=======
    const id = setTimeout(() => loadProducts(search), 250);
>>>>>>> main
    return () => clearTimeout(id);
  }, [search]);

  async function loadProducts(term) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (term) params.set('search', term);
      params.set('limit', '100');

      const res = await fetch(`/api/products?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setRows(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      console.error('Load products failed', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  // Opciones de filtros (derivadas de datos actuales)
  const opciones = useMemo(() => {
    const almacenes = new Set();
    const sumin = new Set();
    const categorias = new Set();
    const marcas = new Set();

    rows.forEach((p) => {
      const nal = String(getNoAlmacen(p) || '').trim();
      if (nal) almacenes.add(nal);

      const sup = String(getSuministrador(p) || '').trim();
      if (sup) sumin.add(sup);

      const cat = String(getCategoriaOnline(p) || '').trim();
      if (cat) categorias.add(cat);

      const m = String(getMarca(p) || '').trim();
      if (m) marcas.add(m);
    });

    const toArr = (s) => Array.from(s).sort((a, b) => a.localeCompare(b, 'es'));

    return {
      almacenes: toArr(almacenes),
      suministradores: toArr(sumin),
      categorias: toArr(categorias),
      marcas: toArr(marcas),
    };
  }, [rows]);

  // Aplicar y limpiar filtros
  function aplicarFiltros() {
    setAExistencia(pExistencia);
    setAAlmacen(pAlmacen);
    setASuministrador(pSuministrador);
    setACategoria(pCategoria);
    setAMarca(pMarca);
    setAHabilitado(pHabilitado);
    setAActivado(pActivado);
  }
  function resetFiltros() {
    setPExistencia(ALL); setAExistencia(ALL);
    setPAlmacen(ALL);    setAAlmacen(ALL);
    setPSuministrador(ALL); setASuministrador(ALL);
    setPCategoria(ALL);  setACategoria(ALL);
    setPMarca(ALL);      setAMarca(ALL);
    setPHabilitado(ALL); setAHabilitado(ALL);
    setPActivado(ALL);   setAActivado(ALL);
  }

  // Filtrado client-side usando SOLO los filtros APLICADOS
  const filtered = useMemo(() => {
    return rows.filter((p) => {
      const term = search.trim().toLowerCase();
      const haySearch = term.length > 0
        ? (fmt(getCodProducto(p)).toLowerCase().includes(term) ||
           fmt(p.name).toLowerCase().includes(term) ||
           fmt(p.barcode).toLowerCase().includes(term))
        : true;

      if (!haySearch) return false;

      const EF = getEF(p);
      const T = getDisponibleTienda(p);
      const nal = String(getNoAlmacen(p) || '');
      const sup = String(getSuministrador(p) || '');
      const cat = String(getCategoriaOnline(p) || '');
      const marca = String(getMarca(p) || '');
      const activado = getActivado(p);
      const habilitado = T > 0;

      if (aExistencia !== ALL) {
        if (aExistencia === 'con') { if (!(EF > 0)) return false; }
        else if (aExistencia === 'sin') { if (!(EF === 0)) return false; }
      }
      if (aAlmacen !== ALL && nal !== aAlmacen) return false;
      if (aSuministrador !== ALL && sup !== aSuministrador) return false;
      if (aCategoria !== ALL && cat !== aCategoria) return false;
      if (aMarca !== ALL && marca !== aMarca) return false;
      if (aHabilitado !== ALL) {
        if (aHabilitado === 'si' && !habilitado) return false;
        if (aHabilitado === 'no' && habilitado) return false;
      }
      if (aActivado !== ALL) {
        if (aActivado === 'si' && !activado) return false;
        if (aActivado === 'no' && activado) return false;
      }

      return true;
    });
  }, [rows, search, aExistencia, aAlmacen, aSuministrador, aCategoria, aMarca, aHabilitado, aActivado]);

  const resultsLabel = useMemo(
    () => (loading ? 'Cargando…' : `${filtered.length} resultado(s)`),
    [loading, filtered.length]
  );

  // Helpers UI
  const setCol = (k, v) => setCols((c) => ({ ...c, [k]: v }));

  /* ================= Render ================= */

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <p className="text-muted-foreground">Manage your product catalog</p>
        <h1 className="text-3xl font-bold">Productos</h1>
        <p className="text-muted-foreground">Vista operativa del inventario por tienda y categoría online.</p>
      </div>

      <Card>
        <CardHeader>
<<<<<<< HEAD
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Product List</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Listado de productos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Busca por nombre, código o código de barras.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <span className="text-sm text-muted-foreground">{resultsLabel}</span>
              <span className="text-sm text-muted-foreground">
                {resultsLabel}
              </span>
=======
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Listado de productos</CardTitle>
                {/* <p className="text-sm text-muted-foreground">Busca por nombre, código o código de barras.</p> */}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar productos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
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
                  <DropdownMenuContent align="end" className="max-h-80 overflow-auto">
                    <DropdownMenuCheckboxItem checked={cols.categoria} onCheckedChange={(v) => setCol('categoria', !!v)}>Categoría Online</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={cols.idTienda} onCheckedChange={(v) => setCol('idTienda', !!v)}>Id Tienda</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={cols.codProducto} onCheckedChange={(v) => setCol('codProducto', !!v)}>Cod. Producto</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={cols.nombre} onCheckedChange={(v) => setCol('nombre', !!v)}>Nombre</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={cols.marca} onCheckedChange={(v) => setCol('marca', !!v)}>Marca</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={cols.suministrador} onCheckedChange={(v) => setCol('suministrador', !!v)}>Suministrador</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={cols.exist} onCheckedChange={(v) => setCol('exist', !!v)}>Existencia Física</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={cols.reserva} onCheckedChange={(v) => setCol('reserva', !!v)}>Reserva</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={cols.dispTienda} onCheckedChange={(v) => setCol('dispTienda', !!v)}>Disp. Tienda</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={cols.precioCosto} onCheckedChange={(v) => setCol('precioCosto', !!v)}>Precio Costo</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={cols.noAlmacen} onCheckedChange={(v) => setCol('noAlmacen', !!v)}>No. Almacén</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={cols.estadoAnuncio} onCheckedChange={(v) => setCol('estadoAnuncio', !!v)}>Estado de Anuncio</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={cols.estadoTienda} onCheckedChange={(v) => setCol('estadoTienda', !!v)}>Estado en tienda</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={cols.creado} onCheckedChange={(v) => setCol('creado', !!v)}>Creado</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={cols.actualizado} onCheckedChange={(v) => setCol('actualizado', !!v)}>Actualizado</DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <span className="text-sm text-muted-foreground">{resultsLabel}</span>
              </div>
>>>>>>> main
            </div>

            {/* Filtros (con etiquetas arriba) */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Existencia</span>
                <Select value={pExistencia} onValueChange={setPExistencia}>
                  <SelectTrigger><SelectValue placeholder="Existencia" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>(Todas)</SelectItem>
                    <SelectItem value="con">Con existencia (&gt; 0)</SelectItem>
                    <SelectItem value="sin">Sin existencia (= 0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Almacén</span>
                <Select value={pAlmacen} onValueChange={setPAlmacen}>
                  <SelectTrigger><SelectValue placeholder="Almacén" /></SelectTrigger>
                  <SelectContent className="max-h-72 overflow-auto">
                    <SelectItem value={ALL}>(Todos)</SelectItem>
                    {opciones.almacenes.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Suministrador</span>
                <Select value={pSuministrador} onValueChange={setPSuministrador}>
                  <SelectTrigger><SelectValue placeholder="Suministrador" /></SelectTrigger>
                  <SelectContent className="max-h-72 overflow-auto">
                    <SelectItem value={ALL}>(Todos)</SelectItem>
                    {opciones.suministradores.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Categoría Online</span>
                <Select value={pCategoria} onValueChange={setPCategoria}>
                  <SelectTrigger><SelectValue placeholder="Categoría Online" /></SelectTrigger>
                  <SelectContent className="max-h-72 overflow-auto">
                    <SelectItem value={ALL}>(Todas)</SelectItem>
                    {opciones.categorias.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Marca</span>
                <Select value={pMarca} onValueChange={setPMarca}>
                  <SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger>
                  <SelectContent className="max-h-72 overflow-auto">
                    <SelectItem value={ALL}>(Todas)</SelectItem>
                    {opciones.marcas.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Habilitado</span>
                <Select value={pHabilitado} onValueChange={setPHabilitado}>
                  <SelectTrigger><SelectValue placeholder="Habilitado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>(Todos)</SelectItem>
                    <SelectItem value="si">Sí</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Activado</span>
                <Select value={pActivado} onValueChange={setPActivado}>
                  <SelectTrigger><SelectValue placeholder="Activado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>(Todos)</SelectItem>
                    <SelectItem value="si">Sí</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botones de acción para filtros */}
            <div className="flex items-center gap-3">
              <Button onClick={aplicarFiltros} className="gap-2">Aplicar filtros</Button>
              <Button variant="outline" onClick={resetFiltros}>Limpiar filtros</Button>
             
            </div>

            {/* Chips de filtros APLICADOS */}
            {/* <div className="flex flex-wrap gap-2">
              {aExistencia !== ALL && <Badge variant="secondary">Existencia: {aExistencia === 'con' ? 'Con' : 'Sin'}</Badge>}
              {aAlmacen !== ALL && <Badge variant="secondary">Almacén: {aAlmacen}</Badge>}
              {aSuministrador !== ALL && <Badge variant="secondary">Suministrador: {aSuministrador}</Badge>}
              {aCategoria !== ALL && <Badge variant="secondary">Categoría: {aCategoria}</Badge>}
              {aMarca !== ALL && <Badge variant="secondary">Marca: {aMarca}</Badge>}
              {aHabilitado !== ALL && <Badge variant="secondary">Habilitado: {aHabilitado}</Badge>}
              {aActivado !== ALL && <Badge variant="secondary">Activado: {aActivado}</Badge>}
            </div> */}
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {loading ? (
<<<<<<< HEAD
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table className="min-w-[1300px]">
              <TableHeader>
                <TableRow>
                  <TableHead>_id</TableHead>
                  <TableHead>org_id</TableHead>
                  <TableHead>idTienda</TableHead>
                  <TableHead>product_code</TableHead>
                  <TableHead>barcode</TableHead>
                  <TableHead>name</TableHead>
                  <TableHead>brand</TableHead>
                  <TableHead>category_id</TableHead>
                  <TableHead>category_path</TableHead>
                  <TableHead>uom</TableHead>
                  <TableHead>units_per_box</TableHead>
                  <TableHead>supplier_id</TableHead>
                  <TableHead>provider_id</TableHead>
                  <TableHead>mgmt_mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>created_at</TableHead>
                  <TableHead>updated_at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={17} className="text-center py-8 text-muted-foreground">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => {
                    const statusVariant =
                      p.status === 'active' ? 'default' : p.status === 'pending' ? 'secondary' : 'destructive';
                    const mgmtVariant = p.mgmt_mode === 'managed' ? 'outline' : 'secondary';

                    return (
                      <TableRow key={p._id}>
                        <TableCell className="font-mono text-xs">{fmt(p._id)}</TableCell>
                        <TableCell className="font-mono text-xs">{fmt(p.org_id)}</TableCell>
                        <TableCell className="font-mono text-xs">{fmt(p.idTienda)}</TableCell>
                        <TableCell className="font-mono text-xs">{fmt(p.product_code)}</TableCell>
                        <TableCell className="font-mono text-xs">{fmt(p.barcode)}</TableCell>
                        <TableCell className="font-medium">{fmt(p.name)}</TableCell>
                        <TableCell>{fmt(p.brand)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{fmt(p.category_id)}</span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {Array.isArray(p.category_path) && p.category_path.length > 0
                            ? p.category_path.join(' › ')
                            : '—'}
                        </TableCell>
                        <TableCell>{fmt(p.uom)}</TableCell>
                        <TableCell>{fmt(p.units_per_box)}</TableCell>
                        <TableCell className="font-mono text-xs">{fmt(p.supplier_id)}</TableCell>
                        <TableCell className="font-mono text-xs">{fmt(p.provider_id)}</TableCell>
                        <TableCell>
                          <Badge variant={mgmtVariant}>{fmt(p.mgmt_mode)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant}>{fmt(p.status)}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{fmtDate(p.created_at)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtDate(p.updated_at)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
            <div className="py-8 text-center text-muted-foreground">
              Cargando productos…
            </div>
          ) : products.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No se encontraron productos.
            </div>
=======
            <div className="py-8 text-center text-muted-foreground">Cargando productos…</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No se encontraron productos.</div>
>>>>>>> main
          ) : (
            <Table className="min-w-[1400px]">
              <TableHeader>
                <TableRow>
                  {cols.categoria && <TableHead>Categoría Online</TableHead>}
                  {cols.idTienda && <TableHead>Id Tienda</TableHead>}
                  {cols.codProducto && <TableHead>Cod. Producto</TableHead>}
                  {cols.nombre && <TableHead>Nombre</TableHead>}
                  {cols.marca && <TableHead>Marca</TableHead>}
                  {cols.suministrador && <TableHead>Suministrador</TableHead>}
                  {cols.exist && <TableHead>Existencia Física (EF)</TableHead>}
                  {cols.reserva && <TableHead>Reserva (A)</TableHead>}
                  {cols.dispTienda && <TableHead>Disp. Tienda (T)</TableHead>}
                  {cols.precioCosto && <TableHead>Precio Costo</TableHead>}
                  {cols.noAlmacen && <TableHead>No. Almacén</TableHead>}
                  {cols.estadoAnuncio && <TableHead>Estado de Anuncio</TableHead>}
                  {cols.estadoTienda && <TableHead>Estado en tienda</TableHead>}
                  {cols.creado && <TableHead>Creado</TableHead>}
                  {cols.actualizado && <TableHead>Actualizado</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
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
                    <TableRow key={p._id}>
                      {cols.categoria && <TableCell className="text-sm">{fmt(categoriaOnline)}</TableCell>}
                      {cols.idTienda && <TableCell className="font-mono text-xs">{fmt(idTienda)}</TableCell>}
                      {cols.codProducto && <TableCell className="font-mono text-xs">{fmt(codProducto)}</TableCell>}
                      {cols.nombre && <TableCell className="text-sm font-medium">{fmt(p.name)}</TableCell>}
                      {cols.marca && <TableCell className="text-sm">{fmt(marca)}</TableCell>}
                      {cols.suministrador && <TableCell className="text-sm">{fmt(suministrador)}</TableCell>}
                      {cols.exist && <TableCell className="text-right">{Number.isNaN(EF) ? '—' : EF}</TableCell>}
                      {cols.reserva && <TableCell className="text-right">{Number.isNaN(A) ? '—' : A}</TableCell>}
                      {cols.dispTienda && <TableCell className="text-right">{Number.isNaN(T) ? '—' : T}</TableCell>}
                      {cols.precioCosto && <TableCell className="text-right">{fmtMoney(precioCosto)}</TableCell>}
                      {cols.noAlmacen && <TableCell className="text-right">{fmt(noAlmacen)}</TableCell>}
                      {cols.estadoAnuncio && (
                        <TableCell><Badge variant={anuncioVariant}>{estadoAnuncio}</Badge></TableCell>
                      )}
                      {cols.estadoTienda && (
                        <TableCell><Badge variant={tiendaVariant}>{estadoTienda}</Badge></TableCell>
                      )}
                      {cols.creado && <TableCell className="whitespace-nowrap text-xs">{fmtDate(p.created_at)}</TableCell>}
                      {cols.actualizado && <TableCell className="whitespace-nowrap text-xs">{fmtDate(p.updated_at)}</TableCell>}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
