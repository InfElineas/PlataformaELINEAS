'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ===== Helpers genéricos =====

function fmt(val) {
  if (val === null || val === undefined || val === '') return '—';
  return String(val);
}

function fmtDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('es-ES', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function fmtMoney(val) {
  const n = Number(val);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toNumber(raw, fallback = 0) {
  const n = Number(raw);
  return Number.isNaN(n) ? fallback : n;
}

// ===== Mapear campos del modelo a los conceptos de negocio =====
// OJO: si tus nombres reales son otros, solo ajusta aquí.

function getCategoriaOnline(p) {
  if (Array.isArray(p.category_path) && p.category_path.length > 0) {
    return p.category_path.join(' - ');
  }
  return p.category_name || p.category_id || '—';
}

function getIdTienda(p) {
  return p.idTienda ?? '';
}

function getCodProducto(p) {
  // Primero el código TKC, si no, el interno
  return p.tkc_code ?? p.product_code ?? p.barcode ?? '';
}

function getSuministrador(p) {
  return p.supplier_name ?? p.provider_name ?? p.provider_id ?? p.supplier_id ?? '';
}

function getEF(p) {
  return toNumber(
    p.existencia_fisica ??
    p.exist_fisica ??
    p.physical_stock ??
    p.stock ??
    0
  );
}

function getReserva(p) {
  return toNumber(p.reserva ?? p.reserved ?? p.reserved_qty ?? 0);
}

function getDisponibleTienda(p) {
  return toNumber(
    p.disponible_tienda ??
    p.disponible ??
    p.available_store ??
    p.available ??
    0
  );
}

function getPrecioCosto(p) {
  return toNumber(p.precio_costo ?? p.cost_price ?? p.costo ?? 0);
}

function getNoAlmacen(p) {
  return p.no_almacen ?? p.warehouse_code ?? p.store_warehouse ?? '';
}

// ===== Lógica de estados =====

// Estado de anuncio (TKC / front)
function getEstadoAnuncio(p) {
  const EF = getEF(p);
  const ID = getCodProducto(p);
  const status = p.status || ''; // por ejemplo: 'active', 'inactive', 'dead'

  // Sin ID
  if (!ID || ID === '') {
    return EF === 0 ? 'SIN ID EF = 0' : 'SIN ID EF > 0';
  }

  // Activo
  if (status === 'active') {
    return 'ACTIVADO';
  }

  // Muerto
  if (status === 'dead' || status === 'muerto') {
    return EF === 0 ? 'DESACTIVADO MUERTO EF = 0' : 'DESACTIVADO MUERTO EF > 0';
  }

  // Resto de desactivados
  return EF === 0 ? 'DESACTIVADO EF = 0' : 'DESACTIVADO EF > 0';
}

// Estado en tienda (condiciones con EF, T, A, ID)
function getEstadoTienda(p) {
  const ID = getCodProducto(p);
  const EF = getEF(p);
  const A = getReserva(p);          // Reserva
  const T = getDisponibleTienda(p); // Disponibilidad en tienda

  // SIN ID
  if (!ID || ID === '') {
    return EF === 0
      ? 'SIN ID (ID = "" y EF = 0)'
      : 'SIN ID (ID = "" y EF > 0)';
  }

  // AGOTADO
  if (EF === 0) {
    return 'AGOTADO (ID ≠ "" y EF = 0)';
  }

  // SIN RESERVA
  if (A === 0 && T > 6) {
    return 'SIN RESERVA (A = 0 y T > 6)';
  }

  // NO TIENDA
  if (T === 0) {
    return EF > 10
      ? 'NO TIENDA (T = 0 y EF > 10)'
      : 'NO TIENDA (T = 0 y EF ≤ 10)';
  }

  // ULTIMAS PIEZAS (1 < T < A ≤ 10)
  if (T > 1 && T < A && A <= 10) {
    return 'ULTIMAS PIEZAS (1 < T < A ≤ 10)';
  }

  // ULTIMAS PIEZAS (0 ≤ A < T ≤ 10)
  if (A >= 0 && A < T && T <= 10) {
    return 'ULTIMAS PIEZAS (0 ≤ A < T ≤ 10)';
  }

  // PROXIMO (T ≤ 10)
  if (T <= 10) {
    return 'PROXIMO (T ≤ 10)';
  }

  // DISPONIBLE (T ≤ A)
  if (T <= A) {
    return 'DISPONIBLE (T ≤ A)';
  }

  // DISPONIBLE (A < T)
  return 'DISPONIBLE (A < T)';
}

function getBadgeVariantAnuncio(label) {
  if (label.startsWith('ACTIVADO')) return 'default';
  if (label.startsWith('SIN ID')) return 'secondary';
  if (label.startsWith('DESACTIVADO')) return 'destructive';
  return 'outline';
}

function getBadgeVariantTienda(label) {
  if (label.startsWith('DISPONIBLE')) return 'default';
  if (label.startsWith('PROXIMO') || label.startsWith('ULTIMAS PIEZAS')) {
    return 'secondary';
  }
  return 'destructive';
}

// ===== Página de Productos =====

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => loadProducts(search), 250); // debounce
    return () => clearTimeout(id);
  }, [search]);

  async function loadProducts(term) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (term) params.set('search', term);
      params.set('limit', '100');

      const res = await fetch(`/api/products?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const data = await res.json();
      setProducts(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      console.error('Load products failed', e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const resultsLabel = useMemo(
    () => (loading ? 'Cargando…' : `${products.length} resultado(s)`),
    [loading, products.length]
  );

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
              <span className="text-sm text-muted-foreground">
                {resultsLabel}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Cargando productos…
            </div>
          ) : products.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No se encontraron productos.
            </div>
          ) : (
            <Table className="min-w-[1400px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría Online</TableHead>
                  <TableHead>Id Tienda</TableHead>
                  <TableHead>Cod. Producto</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Suministrador</TableHead>
                  <TableHead>Existencia Física (EF)</TableHead>
                  <TableHead>Reserva (A)</TableHead>
                  <TableHead>Disp. Tienda (T)</TableHead>
                  <TableHead>Precio Costo</TableHead>
                  <TableHead>No. Almacén</TableHead>
                  <TableHead>Estado de Anuncio</TableHead>
                  <TableHead>Estado en tienda</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead>Actualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const categoriaOnline = getCategoriaOnline(p);
                  const idTienda = getIdTienda(p);
                  const codProducto = getCodProducto(p);
                  const suministrador = getSuministrador(p);
                  const EF = getEF(p);
                  const A = getReserva(p);
                  const T = getDisponibleTienda(p);
                  const precioCosto = getPrecioCosto(p);
                  const noAlmacen = getNoAlmacen(p);

                  const estadoAnuncio = getEstadoAnuncio(p);
                  const estadoTienda = getEstadoTienda(p);

                  const anuncioVariant = getBadgeVariantAnuncio(estadoAnuncio);
                  const tiendaVariant = getBadgeVariantTienda(estadoTienda);

                  return (
                    <TableRow key={p._id}>
                      <TableCell className="text-sm">
                        {fmt(categoriaOnline)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {fmt(idTienda)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {fmt(codProducto)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {fmt(p.name)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {fmt(suministrador)}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number.isNaN(EF) ? '—' : EF}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number.isNaN(A) ? '—' : A}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number.isNaN(T) ? '—' : T}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtMoney(precioCosto)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(noAlmacen)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={anuncioVariant}>{estadoAnuncio}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tiendaVariant}>{estadoTienda}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtDate(p.created_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtDate(p.updated_at)}
                      </TableCell>
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
