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
import { format } from "date-fns";

export default function InventoryPage() {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (selectedStore && selectedDate) {
      loadInventory();
    }
  }, [selectedStore, selectedDate]);

  async function loadStores() {
    const res = await fetch("/api/stores");
    const data = await res.json();
    setStores(data.data || []);
    if (data.data?.length > 0) {
      setSelectedStore(data.data[0]._id);
    }
  }

  async function loadInventory() {
    setLoading(true);
    const res = await fetch(
      `/api/inventory?date=${selectedDate}&store_id=${selectedStore}&limit=100`,
    );
    const data = await res.json();
    setInventory(data.data || []);
    setLoading(false);
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <p className="text-muted-foreground">View stock levels across stores</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Snapshots</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Store</label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store._id} value={store._id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Physical Stock</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Boxes</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead className="text-right">Shop Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No inventory data for selected date and store
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">
                        {item.product_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.physical_stock}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.stock_units || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.stock_boxes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.price_cost
                          ? `$${item.price_cost.toFixed(2)}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.price_shop
                          ? `$${item.price_shop.toFixed(2)}`
                          : "-"}
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
