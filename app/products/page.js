'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function fmt(val) {
  if (val === null || val === undefined || val === '') return '—';
  return String(val);
}
function fmtDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(loadProducts, 250); // debounce
    return () => clearTimeout(id);
  }, [search]);

  async function loadProducts() {
    try {
      setLoading(true);
      const res = await fetch(`/api/products?search=${encodeURIComponent(search)}&limit=100`, {
        cache: 'no-store',
      });
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
        <h1 className="text-3xl font-bold">Products</h1>
        <p className="text-muted-foreground">Manage your product catalog</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Product List</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <span className="text-sm text-muted-foreground">{resultsLabel}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {loading ? (
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
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
