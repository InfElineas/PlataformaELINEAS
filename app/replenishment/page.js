'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Sparkles, CheckCircle, ShoppingCart, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

export default function ReplenishmentPage() {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [planDate, setPlanDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [plan, setPlan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (selectedStore && planDate) {
      loadExistingPlan();
    }
  }, [selectedStore, planDate]);

  async function loadStores() {
    const res = await fetch('/api/stores');
    const data = await res.json();
    setStores(data.data || []);
    if (data.data?.length > 0) {
      setSelectedStore(data.data[0]._id);
    }
  }

  async function loadExistingPlan() {
    setLoading(true);
    const res = await fetch(`/api/replenishment/plans?store_id=${selectedStore}&plan_date=${planDate}`);
    const data = await res.json();
    setPlan(data.data || []);
    setLoading(false);
  }

  async function generatePlan() {
    if (!selectedStore || !planDate) {
      toast.error('Please select store and date');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/replenishment/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_date: planDate, store_id: selectedStore })
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Generated ${data.summary.items_to_restock} items to restock!`);
        loadExistingPlan();
      } else {
        toast.error(data.error || 'Failed to generate plan');
      }
    } catch (err) {
      toast.error('Error generating plan');
    } finally {
      setGenerating(false);
    }
  }

  async function approvePlan() {
    if (plan.length === 0) {
      toast.error('No plan to approve');
      return;
    }

    try {
      const res = await fetch(`/api/replenishment/plans/${plan[0]._id}/approve`, {
        method: 'POST'
      });

      if (res.ok) {
        toast.success('Plan approved successfully!');
        loadExistingPlan();
      } else {
        toast.error('Failed to approve plan');
      }
    } catch (err) {
      toast.error('Error approving plan');
    }
  }

  async function createPOs() {
    if (plan.length === 0 || plan[0].status !== 'approved') {
      toast.error('Please approve plan first');
      return;
    }

    try {
      const res = await fetch('/api/purchase-orders/from-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_date: planDate, store_id: selectedStore })
      });

      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Created ${data.data.length} purchase orders!`);
        loadExistingPlan();
      } else {
        toast.error(data.error || 'Failed to create POs');
      }
    } catch (err) {
      toast.error('Error creating POs');
    }
  }

  const planStatus = plan.length > 0 ? plan[0].status : null;
  const itemsToRestock = plan.filter(p => p.recommended_qty > 0);
  const totalRecommendedQty = plan.reduce((sum, p) => sum + p.recommended_qty, 0);

  return (
    <>
      <Toaster />
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Replenishment Planner
          </h1>
          <p className="text-muted-foreground">
            Generate intelligent restocking recommendations
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Plan Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Store</label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map(store => (
                      <SelectItem key={store._id} value={store._id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Plan Date</label>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button 
                onClick={generatePlan} 
                disabled={generating || planStatus === 'approved' || planStatus === 'converted_to_po'}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Generating...' : 'Generate Plan'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {plan.length > 0 && (
          <>
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{plan.length}</div>
                    <div className="text-sm text-muted-foreground">Total Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{itemsToRestock.length}</div>
                    <div className="text-sm text-muted-foreground">Need Restocking</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalRecommendedQty}</div>
                    <div className="text-sm text-muted-foreground">Total Qty to Order</div>
                  </div>
                  <div className="text-center">
                    <Badge 
                      variant={planStatus === 'approved' ? 'default' : planStatus === 'converted_to_po' ? 'secondary' : 'outline'}
                      className="text-lg py-1 px-4"
                    >
                      {planStatus}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Replenishment Recommendations</CardTitle>
                  <div className="flex gap-2">
                    {planStatus === 'draft' && (
                      <Button onClick={approvePlan} variant="default" className="gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Approve Plan
                      </Button>
                    )}
                    {planStatus === 'approved' && (
                      <Button onClick={createPOs} variant="default" className="gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Create Purchase Orders
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Target Stock</TableHead>
                        <TableHead className="text-right">Avg Daily Demand</TableHead>
                        <TableHead className="text-right">Days of Cover</TableHead>
                        <TableHead className="text-right">Seasonality</TableHead>
                        <TableHead className="text-right font-bold">Recommended Qty</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plan.filter(p => p.recommended_qty > 0).map((item) => (
                        <TableRow key={item._id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell className="text-right">{item.current_stock}</TableCell>
                          <TableCell className="text-right">{item.target_stock}</TableCell>
                          <TableCell className="text-right">{item.avg_daily_demand?.toFixed(1) || '0.0'}</TableCell>
                          <TableCell className="text-right">{item.days_of_cover || 7}</TableCell>
                          <TableCell className="text-right">{item.seasonality_factor?.toFixed(2) || '1.00'}x</TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {item.recommended_qty}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.reason}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {plan.filter(p => p.recommended_qty > 0).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No items need restocking at this time
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
              <h3 className="text-lg font-semibold mb-2">No Plan Generated Yet</h3>
              <p className="text-muted-foreground mb-4">
                Select a store and date, then click "Generate Plan" to create intelligent restocking recommendations.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
