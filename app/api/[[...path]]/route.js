import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import Category from '@/lib/models/Category';
import Store from '@/lib/models/Store';
import Supplier from '@/lib/models/Supplier';
import InventorySnapshot from '@/lib/models/InventorySnapshot';
import PriceList from '@/lib/models/PriceList';
import ReplenishmentRule from '@/lib/models/ReplenishmentRule';
import ReplenishmentPlan from '@/lib/models/ReplenishmentPlan';
import PurchaseOrder from '@/lib/models/PurchaseOrder';
import { generateReplenishmentPlan } from '@/lib/replenishment-engine';
import { format } from 'date-fns';

const ORG_ID = process.env.ORG_ID_DEFAULT || 'ELINEAS';

// Helper to parse path segments
function parsePath(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const segments = pathname.replace('/api/', '').split('/').filter(Boolean);
  return { segments, searchParams: url.searchParams };
}

// Error handler
function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// CORS
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders() });
}

// ============== PRODUCTS ==============
async function handleProducts(request, segments, searchParams) {
  await connectDB();
  const method = request.method;

  if (method === 'GET' && segments.length === 1) {
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const query = { org_id: ORG_ID };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { product_code: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.status = status;
    if (category) query.category_id = category;

    const [products, total] = await Promise.all([
      Product.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(query)
    ]);

    return NextResponse.json({
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }, { headers: corsHeaders() });
  }

  if (method === 'POST' && segments.length === 1) {
    const body = await request.json();
    const product = await Product.create({ ...body, org_id: ORG_ID });
    return NextResponse.json({ data: product }, { status: 201, headers: corsHeaders() });
  }

  if (method === 'GET' && segments.length === 2) {
    const productId = segments[1];
    const product = await Product.findOne({ _id: productId, org_id: ORG_ID });
    if (!product) return errorResponse('Product not found', 404);
    return NextResponse.json({ data: product }, { headers: corsHeaders() });
  }

  if (method === 'PUT' && segments.length === 2) {
    const productId = segments[1];
    const body = await request.json();
    const product = await Product.findOneAndUpdate(
      { _id: productId, org_id: ORG_ID },
      { ...body, updated_at: new Date() },
      { new: true }
    );
    if (!product) return errorResponse('Product not found', 404);
    return NextResponse.json({ data: product }, { headers: corsHeaders() });
  }

  if (method === 'DELETE' && segments.length === 2) {
    const productId = segments[1];
    const product = await Product.findOneAndDelete({ _id: productId, org_id: ORG_ID });
    if (!product) return errorResponse('Product not found', 404);
    return NextResponse.json({ message: 'Product deleted' }, { headers: corsHeaders() });
  }

  return errorResponse('Invalid products endpoint', 404);
}

// ============== STORES ==============
async function handleStores(request, segments) {
  await connectDB();
  const method = request.method;

  if (method === 'GET' && segments.length === 1) {
    const stores = await Store.find({ org_id: ORG_ID }).sort({ name: 1 }).lean();
    return NextResponse.json({ data: stores }, { headers: corsHeaders() });
  }

  if (method === 'POST' && segments.length === 1) {
    const body = await request.json();
    const store = await Store.create({ ...body, org_id: ORG_ID });
    return NextResponse.json({ data: store }, { status: 201, headers: corsHeaders() });
  }

  return errorResponse('Invalid stores endpoint', 404);
}

// ============== SUPPLIERS ==============
async function handleSuppliers(request, segments) {
  await connectDB();
  const method = request.method;

  if (method === 'GET' && segments.length === 1) {
    const suppliers = await Supplier.find({ org_id: ORG_ID }).sort({ name: 1 }).lean();
    return NextResponse.json({ data: suppliers }, { headers: corsHeaders() });
  }

  return errorResponse('Invalid suppliers endpoint', 404);
}

// ============== CATEGORIES ==============
async function handleCategories(request, segments) {
  await connectDB();
  const method = request.method;

  if (method === 'GET' && segments.length === 1) {
    const categories = await Category.find({ org_id: ORG_ID }).sort({ path: 1 }).lean();
    return NextResponse.json({ data: categories }, { headers: corsHeaders() });
  }

  return errorResponse('Invalid categories endpoint', 404);
}

// ============== INVENTORY ==============
async function handleInventory(request, segments, searchParams) {
  await connectDB();
  const method = request.method;

  if (method === 'GET' && segments.length === 1) {
    const date = searchParams.get('date');
    const storeId = searchParams.get('store_id');
    const productId = searchParams.get('product_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    const query = { org_id: ORG_ID };
    if (date) query.date = new Date(date);
    if (storeId) query.store_id = storeId;
    if (productId) query.product_id = productId;

    const [snapshots, total] = await Promise.all([
      InventorySnapshot.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      InventorySnapshot.countDocuments(query)
    ]);

    const productIds = [...new Set(snapshots.map(s => s.product_id))];
    const products = await Product.find({ _id: { $in: productIds }, org_id: ORG_ID }).lean();
    const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));

    const enriched = snapshots.map(s => ({
      ...s,
      product_name: productMap[s.product_id]?.name || 'Unknown'
    }));

    return NextResponse.json({
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }, { headers: corsHeaders() });
  }

  return errorResponse('Invalid inventory endpoint', 404);
}

// ============== REPLENISHMENT RULES ==============
async function handleRules(request, segments) {
  await connectDB();
  const method = request.method;

  if (method === 'GET' && segments.length === 1) {
    const rules = await ReplenishmentRule.find({ org_id: ORG_ID }).sort({ priority: -1 }).lean();
    return NextResponse.json({ data: rules }, { headers: corsHeaders() });
  }

  return errorResponse('Invalid rules endpoint', 404);
}

// ============== REPLENISHMENT PLANS ==============
async function handleReplenishment(request, segments, searchParams) {
  await connectDB();
  const method = request.method;

  // POST /api/replenishment/plan - Generate new plan
  if (method === 'POST' && segments.length === 2 && segments[1] === 'plan') {
    const body = await request.json();
    const { plan_date, store_id } = body;

    if (!plan_date || !store_id) {
      return errorResponse('plan_date and store_id required');
    }

    console.log('🔄 Generating replenishment plan...', { plan_date, store_id });
    
    const planItems = await generateReplenishmentPlan(ORG_ID, store_id, plan_date);
    const saved = await ReplenishmentPlan.insertMany(planItems);
    
    console.log(`✅ Generated ${saved.length} plan items`);

    return NextResponse.json({
      message: 'Plan generated successfully',
      data: saved,
      summary: {
        total_items: saved.length,
        items_to_restock: saved.filter(p => p.recommended_qty > 0).length,
        total_recommended_qty: saved.reduce((sum, p) => sum + p.recommended_qty, 0)
      }
    }, { status: 201, headers: corsHeaders() });
  }

  // GET /api/replenishment/plans - List plans
  if (method === 'GET' && segments.length === 2 && segments[1] === 'plans') {
    const storeId = searchParams.get('store_id');
    const status = searchParams.get('status');
    const planDate = searchParams.get('plan_date');

    const query = { org_id: ORG_ID };
    if (storeId) query.store_id = storeId;
    if (status) query.status = status;
    if (planDate) query.plan_date = new Date(planDate);

    const plans = await ReplenishmentPlan.find(query).sort({ plan_date: -1, recommended_qty: -1 }).lean();

    return NextResponse.json({ data: plans }, { headers: corsHeaders() });
  }

  // POST /api/replenishment/plans/:id/approve - Approve plan
  if (method === 'POST' && segments.length === 4 && segments[1] === 'plans' && segments[3] === 'approve') {
    const planId = segments[2];
    const plan = await ReplenishmentPlan.findOne({ _id: planId, org_id: ORG_ID });
    
    if (!plan) return errorResponse('Plan not found', 404);

    await ReplenishmentPlan.updateMany(
      {
        org_id: ORG_ID,
        plan_date: plan.plan_date,
        store_id: plan.store_id,
        status: 'draft'
      },
      { status: 'approved' }
    );

    return NextResponse.json({
      message: 'Plan approved successfully'
    }, { headers: corsHeaders() });
  }

  return errorResponse('Invalid replenishment endpoint', 404);
}

// ============== PURCHASE ORDERS ==============
async function handlePurchaseOrders(request, segments, searchParams) {
  await connectDB();
  const method = request.method;

  // POST /api/purchase-orders/from-plan - Create POs from approved plan
  if (method === 'POST' && segments.length === 2 && segments[1] === 'from-plan') {
    const body = await request.json();
    const { plan_date, store_id } = body;

    const plans = await ReplenishmentPlan.find({
      org_id: ORG_ID,
      plan_date: new Date(plan_date),
      store_id,
      status: 'approved',
      recommended_qty: { $gt: 0 }
    }).lean();

    if (plans.length === 0) {
      return errorResponse('No approved plans found to convert', 400);
    }

    const productIds = plans.map(p => p.product_id);
    const products = await Product.find({ _id: { $in: productIds }, org_id: ORG_ID }).lean();
    const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));

    // Group by supplier
    const bySupplier = {};
    for (const plan of plans) {
      const product = productMap[plan.product_id];
      if (!product || !product.supplier_id) continue;

      if (!bySupplier[product.supplier_id]) {
        bySupplier[product.supplier_id] = [];
      }
      bySupplier[product.supplier_id].push({
        product_id: plan.product_id,
        product_name: plan.product_name,
        qty: plan.recommended_qty,
        price: 0,
        store_id: plan.store_id
      });
    }

    const supplierIds = Object.keys(bySupplier);
    const suppliers = await Supplier.find({ _id: { $in: supplierIds }, org_id: ORG_ID }).lean();
    const supplierMap = Object.fromEntries(suppliers.map(s => [s._id.toString(), s]));

    const createdPOs = [];
    for (const [supplierId, lines] of Object.entries(bySupplier)) {
      const supplier = supplierMap[supplierId];
      const po = await PurchaseOrder.create({
        org_id: ORG_ID,
        po_number: `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        supplier_id: supplierId,
        supplier_name: supplier?.name || 'Unknown',
        lines,
        total_amount: 0,
        status: 'draft'
      });
      createdPOs.push(po);
    }

    await ReplenishmentPlan.updateMany(
      { _id: { $in: plans.map(p => p._id) } },
      { status: 'converted_to_po' }
    );

    return NextResponse.json({
      message: `Created ${createdPOs.length} purchase orders`,
      data: createdPOs
    }, { status: 201, headers: corsHeaders() });
  }

  // GET /api/purchase-orders - List POs
  if (method === 'GET' && segments.length === 1) {
    const status = searchParams.get('status');
    const query = { org_id: ORG_ID };
    if (status) query.status = status;

    const pos = await PurchaseOrder.find(query).sort({ created_at: -1 }).lean();
    return NextResponse.json({ data: pos }, { headers: corsHeaders() });
  }

  return errorResponse('Invalid purchase-orders endpoint', 404);
}

// ============== MAIN ROUTER ==============
export async function GET(request) {
  try {
    const { segments, searchParams } = parsePath(request);

    if (segments.length === 0) {
      return NextResponse.json({ message: 'Inventory & Replenishment API v1.0' }, { headers: corsHeaders() });
    }

    const resource = segments[0];

    switch (resource) {
      case 'products': return handleProducts(request, segments, searchParams);
      case 'stores': return handleStores(request, segments);
      case 'suppliers': return handleSuppliers(request, segments);
      case 'categories': return handleCategories(request, segments);
      case 'inventory': return handleInventory(request, segments, searchParams);
      case 'rules': return handleRules(request, segments);
      case 'replenishment': return handleReplenishment(request, segments, searchParams);
      case 'purchase-orders': return handlePurchaseOrders(request, segments, searchParams);
      default: return errorResponse('Resource not found', 404);
    }
  } catch (error) {
    console.error('API Error:', error);
    return errorResponse(error.message, 500);
  }
}

export async function POST(request) {
  try {
    const { segments, searchParams } = parsePath(request);
    const resource = segments[0];

    switch (resource) {
      case 'products': return handleProducts(request, segments, searchParams);
      case 'stores': return handleStores(request, segments);
      case 'replenishment': return handleReplenishment(request, segments, searchParams);
      case 'purchase-orders': return handlePurchaseOrders(request, segments, searchParams);
      default: return errorResponse('Resource not found', 404);
    }
  } catch (error) {
    console.error('API Error:', error);
    return errorResponse(error.message, 500);
  }
}

export async function PUT(request) {
  try {
    const { segments, searchParams } = parsePath(request);
    const resource = segments[0];

    switch (resource) {
      case 'products': return handleProducts(request, segments, searchParams);
      default: return errorResponse('Resource not found', 404);
    }
  } catch (error) {
    console.error('API Error:', error);
    return errorResponse(error.message, 500);
  }
}

export async function DELETE(request) {
  try {
    const { segments, searchParams } = parsePath(request);
    const resource = segments[0];

    switch (resource) {
      case 'products': return handleProducts(request, segments, searchParams);
      default: return errorResponse('Resource not found', 404);
    }
  } catch (error) {
    console.error('API Error:', error);
    return errorResponse(error.message, 500);
  }
}
