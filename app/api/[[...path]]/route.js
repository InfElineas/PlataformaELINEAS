import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/lib/models/Product";
import Category from "@/lib/models/Category";
import Store from "@/lib/models/Store";
import Supplier from "@/lib/models/Supplier";
import InventorySnapshot from "@/lib/models/InventorySnapshot";
import ReplenishmentRule from "@/lib/models/ReplenishmentRule";
import ReplenishmentPlan from "@/lib/models/ReplenishmentPlan";
import PurchaseOrder from "@/lib/models/PurchaseOrder";
import { generateReplenishmentPlan } from "@/lib/replenishment-engine";
import { requirePermission, PERMISSIONS } from "@/lib/auth";

// Helper to parse path segments
function parsePath(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const segments = pathname.replace("/api/", "").split("/").filter(Boolean);
  return { segments, searchParams: url.searchParams };
}

function resolvePermission(method, segments) {
  if (segments.length === 0) {
    return { permission: null, orgScoped: false };
  }

  const resource = segments[0];

  switch (resource) {
    case "products":
      return {
        permission:
          method === "GET"
            ? PERMISSIONS.CATALOG_READ
            : PERMISSIONS.CATALOG_WRITE,
        orgScoped: true,
      };
    case "stores":
      return {
        permission:
          method === "GET"
            ? PERMISSIONS.CATALOG_READ
            : PERMISSIONS.CATALOG_WRITE,
        orgScoped: true,
      };
    case "suppliers":
    case "categories":
      return { permission: PERMISSIONS.CATALOG_READ, orgScoped: true };
    case "inventory":
      return { permission: PERMISSIONS.INVENTORY_READ, orgScoped: true };
    case "rules":
      return { permission: PERMISSIONS.CATALOG_READ, orgScoped: true };
    case "replenishment":
      if (method === "POST" && segments.length >= 2 && segments[1] === "plan") {
        return {
          permission: PERMISSIONS.REPLENISHMENT_GENERATE,
          orgScoped: true,
        };
      }
      if (
        method === "POST" &&
        segments.length === 4 &&
        segments[3] === "approve"
      ) {
        return {
          permission: PERMISSIONS.REPLENISHMENT_APPROVE,
          orgScoped: true,
        };
      }
      return { permission: PERMISSIONS.REPLENISHMENT_READ, orgScoped: true };
    case "purchase-orders":
      return {
        permission:
          method === "POST"
            ? PERMISSIONS.ORDERS_WRITE
            : PERMISSIONS.ORDERS_READ,
        orgScoped: true,
      };
    default:
      return { permission: null, orgScoped: true };
  }
}

// Error handler
function errorResponse(message, status = 400, request) {
  const init = { status };
  if (request) {
    init.headers = corsHeaders(request);
  }
  return NextResponse.json({ error: message }, init);
}

const STOCK_ALIASES = {
  existencia: [
    "existencia_fisica",
    "physical_stock",
    "exist_fisica",
    "stock",
    "existencia",
    "ef",
  ],
  reserva: [
    "reserva",
    "reserve_qty",
    "reserved",
    "reserved_qty",
    "almacen",
    "A",
  ],
  tienda: [
    "disponible_tienda",
    "store_qty",
    "disponible",
    "available_store",
    "available",
    "tienda",
    "T",
  ],
};

// CORS
function corsHeaders(request) {
  const fallbackOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:3000";
  const origin = request?.headers.get("origin") || fallbackOrigin;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export async function OPTIONS(request) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(request) });
}

// ============== PRODUCTS ==============
async function handleProducts(request, segments, searchParams, context) {
  await connectDB();
  const method = request.method;
  const { orgId } = context;

  if (method === "GET" && segments.length === 1) {
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const category = searchParams.get("category") || "";
    const existencia = searchParams.get("existencia");
    const almacen = searchParams.get("almacen");
    const suministrador = searchParams.get("suministrador");
    const marca = searchParams.get("marca");
    const habilitado = searchParams.get("habilitado");
    const activado = searchParams.get("activado");
    const includeFilters = searchParams.get("includeFilters") === "1";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(
      searchParams.get("perPage") || searchParams.get("limit") || "50",
    );
    const skip = (page - 1) * limit;
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortDir = searchParams.get("sortDir") === "asc" ? 1 : -1;

    const SORT_MAP = {
      name: "name",
      category_name: "category_name",
      store_external_id: "store_external_id",
      product_code: "product_code",
      brand: "brand",
      supplier_name: "supplier_name",
      existencia_fisica: "existencia_fisica",
      reserva: "reserva",
      disponible_tienda: "disponible_tienda",
      precio_costo: "precio_costo",
      no_almacen: "no_almacen",
      status: "status",
      store_status: "store_status",
      created_at: "created_at",
      updated_at: "updated_at",
    };

    const andFilters = [{ org_id: orgId }];

    if (search) {
      andFilters.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { product_code: { $regex: search, $options: "i" } },
          { barcode: { $regex: search, $options: "i" } },
        ],
      });
    }

    if (status) andFilters.push({ status });
    if (category) andFilters.push({ category_id: category });

    if (existencia === "con") {
      andFilters.push({
        $or: [
          { existencia_fisica: { $gt: 0 } },
          { physical_stock: { $gt: 0 } },
        ],
      });
    } else if (existencia === "sin") {
      andFilters.push({
        $or: [
          { existencia_fisica: { $lte: 0 } },
          { physical_stock: { $lte: 0 } },
        ],
      });
    }

    if (almacen) {
      andFilters.push({
        $or: [
          { no_almacen: almacen },
          { warehouse_code: almacen },
          { warehouse_name: almacen },
        ],
      });
    }

    if (suministrador) {
      andFilters.push({
        $or: [
          { supplier_name: suministrador },
          { provider_id: suministrador },
          { supplier_id: suministrador },
        ],
      });
    }

    if (marca) {
      andFilters.push({ brand: marca });
    }

    if (habilitado === "si") {
      andFilters.push({ mgmt_mode: "managed" });
    } else if (habilitado === "no") {
      andFilters.push({ mgmt_mode: { $ne: "managed" } });
    }

    if (activado === "si") {
      andFilters.push({ status: "active" });
    } else if (activado === "no") {
      andFilters.push({ status: { $ne: "active" } });
    }

    const query = andFilters.length === 1 ? andFilters[0] : { $and: andFilters };

    const sortField = SORT_MAP[sortBy] || "created_at";
    const sort = { [sortField]: sortDir };
    if (sortField !== "created_at") sort.created_at = -1;

    const [productsRaw, total] = await Promise.all([
      Product.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean({ virtuals: true }),
      Product.countDocuments(query),
    ]);

    const pickText = (...candidates) => {
      for (const value of candidates) {
        if (value === null || value === undefined) continue;
        const text = value.toString().trim();
        if (text) return text;
      }
      return "";
    };

    const parseStock = (raw) => {
      if (raw === null || raw === undefined) return null;
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
    };

    const pickStock = (doc, keys) => {
      for (const key of keys) {
        const direct = parseStock(doc?.[key]);
        if (direct !== null) return direct;

        const metaVal = parseStock(doc?.metadata?.[key]);
        if (metaVal !== null) return metaVal;
      }
      return 0;
    };

    const products = productsRaw.map((doc) => {
      const physical = pickStock(doc, STOCK_ALIASES.existencia);
      const reserve = pickStock(doc, STOCK_ALIASES.reserva);
      const store = pickStock(doc, STOCK_ALIASES.tienda);

      const warehouseNumber = pickText(
        doc.no_almacen,
        doc.warehouse_code,
        doc.warehouse_name,
        doc?.metadata?.no_almacen,
        doc?.metadata?.warehouse_code,
        doc?.metadata?.warehouse_name,
      );

      const warehouseDisplay = pickText(
        doc.warehouse_name,
        doc.no_almacen,
        doc.warehouse_code,
        doc?.metadata?.warehouse_name,
        doc?.metadata?.no_almacen,
        doc?.metadata?.warehouse_code,
      );

      const warehouseCode = pickText(
        doc.warehouse_code,
        doc.no_almacen,
        doc?.metadata?.warehouse_code,
        doc?.metadata?.no_almacen,
      );

      return {
        ...doc,
        physical_stock: physical,
        existencia_fisica: physical,
        reserve_qty: reserve,
        reserva: reserve,
        store_qty: store,
        disponible_tienda: store,
        no_almacen: warehouseNumber,
        warehouse_code: warehouseCode,
        warehouse_name: warehouseDisplay,
      };
    });

    let meta;

    if (includeFilters) {
      const baseMatch = { org_id: orgId };

      const [
        warehouseCodes,
        warehouseNames,
        noAlmacenes,
        supplierNames,
        supplierIds,
        brands,
      ] = await Promise.all([
        Product.distinct("warehouse_code", baseMatch),
        Product.distinct("warehouse_name", baseMatch),
        Product.distinct("no_almacen", baseMatch),
        Product.distinct("supplier_name", baseMatch),
        Product.distinct("provider_id", baseMatch),
        Product.distinct("brand", baseMatch),
      ]);

      const normalize = (value) => {
        if (value === null || value === undefined) return "";
        return String(value).trim();
      };

      const mergeDistinct = (...arrays) => {
        const set = new Set();
        arrays.flat().forEach((item) => {
          const val = normalize(item);
          if (val) set.add(val);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
      };

      meta = {
        warehouses: mergeDistinct(warehouseCodes, warehouseNames, noAlmacenes),
        suppliers: mergeDistinct(supplierNames, supplierIds),
        brands: mergeDistinct(brands),
      };
    }

    return NextResponse.json(
      {
        data: products,
        total,
        perPage: limit,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        meta,
      },
      { headers: corsHeaders(request) },
    );
  }

  if (method === "POST" && segments.length === 1) {
    const body = await request.json();
    const product = await Product.create({ ...body, org_id: orgId });
    return NextResponse.json(
      { data: product },
      { status: 201, headers: corsHeaders(request) },
    );
  }

  if (method === "GET" && segments.length === 2) {
    const productId = segments[1];
    const product = await Product.findOne({ _id: productId, org_id: orgId });
    if (!product) return errorResponse("Product not found", 404, request);
    return NextResponse.json(
      { data: product },
      { headers: corsHeaders(request) },
    );
  }

  if (method === "PUT" && segments.length === 2) {
    const productId = segments[1];
    const body = await request.json();
    const product = await Product.findOneAndUpdate(
      { _id: productId, org_id: orgId },
      { ...body, updated_at: new Date() },
      { new: true },
    );
    if (!product) return errorResponse("Product not found", 404, request);
    return NextResponse.json(
      { data: product },
      { headers: corsHeaders(request) },
    );
  }

  if (method === "DELETE" && segments.length === 2) {
    const productId = segments[1];
    const product = await Product.findOneAndDelete({
      _id: productId,
      org_id: orgId,
    });
    if (!product) return errorResponse("Product not found", 404, request);
    return NextResponse.json(
      { message: "Product deleted" },
      { headers: corsHeaders(request) },
    );
  }

  return errorResponse("Invalid products endpoint", 404, request);
}

// ============== STORES ==============
async function handleStores(request, segments, context) {
  await connectDB();
  const method = request.method;
  const { orgId } = context;

  if (method === "GET" && segments.length === 1) {
    const stores = await Store.find({ org_id: orgId }).sort({ name: 1 }).lean();
    return NextResponse.json(
      { data: stores },
      { headers: corsHeaders(request) },
    );
  }

  if (method === "POST" && segments.length === 1) {
    const body = await request.json();
    const store = await Store.create({ ...body, org_id: orgId });
    return NextResponse.json(
      { data: store },
      { status: 201, headers: corsHeaders(request) },
    );
  }

  return errorResponse("Invalid stores endpoint", 404, request);
}

// ============== SUPPLIERS ==============
async function handleSuppliers(request, segments, context) {
  await connectDB();
  const method = request.method;
  const { orgId } = context;

  if (method === "GET" && segments.length === 1) {
    const suppliers = await Supplier.find({ org_id: orgId })
      .sort({ name: 1 })
      .lean();
    return NextResponse.json(
      { data: suppliers },
      { headers: corsHeaders(request) },
    );
  }

  return errorResponse("Invalid suppliers endpoint", 404, request);
}

// ============== CATEGORIES ==============
async function handleCategories(request, segments, context) {
  await connectDB();
  const method = request.method;
  const { orgId } = context;

  if (method === "GET" && segments.length === 1) {
    const categories = await Category.find({ org_id: orgId })
      .sort({ path: 1 })
      .lean();
    return NextResponse.json(
      { data: categories },
      { headers: corsHeaders(request) },
    );
  }

  return errorResponse("Invalid categories endpoint", 404, request);
}

// ============== INVENTORY ==============
async function handleInventory(request, segments, searchParams, context) {
  await connectDB();
  const method = request.method;
  const { orgId } = context;

  if (method === "GET" && segments.length === 1) {
    const date = searchParams.get("date");
    const storeId = searchParams.get("store_id");
    const productId = searchParams.get("product_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = (page - 1) * limit;

    const query = { org_id: orgId };
    if (date) query.date = new Date(date);
    if (storeId) query.store_id = storeId;
    if (productId) query.product_id = productId;

    const [snapshots, total] = await Promise.all([
      InventorySnapshot.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventorySnapshot.countDocuments(query),
    ]);

    const productIds = [...new Set(snapshots.map((s) => s.product_id))];
    const products = await Product.find({
      _id: { $in: productIds },
      org_id: orgId,
    }).lean();
    const productMap = Object.fromEntries(
      products.map((p) => [p._id.toString(), p]),
    );

    const enriched = snapshots.map((s) => ({
      ...s,
      product_name: productMap[s.product_id]?.name || "Unknown",
    }));

    return NextResponse.json(
      {
        data: enriched,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      { headers: corsHeaders(request) },
    );
  }

  return errorResponse("Invalid inventory endpoint", 404, request);
}

// ============== REPLENISHMENT RULES ==============
async function handleRules(request, segments, context) {
  await connectDB();
  const method = request.method;
  const { orgId } = context;

  if (method === "GET" && segments.length === 1) {
    const rules = await ReplenishmentRule.find({ org_id: orgId })
      .sort({ priority: -1 })
      .lean();
    return NextResponse.json(
      { data: rules },
      { headers: corsHeaders(request) },
    );
  }

  return errorResponse("Invalid rules endpoint", 404, request);
}

// ============== REPLENISHMENT PLANS ==============
async function handleReplenishment(request, segments, searchParams, context) {
  await connectDB();
  const method = request.method;
  const { orgId } = context;

  // POST /api/replenishment/plan - Generate new plan
  if (method === "POST" && segments.length === 2 && segments[1] === "plan") {
    const body = await request.json();
    const { plan_date, store_id } = body;

    if (!plan_date || !store_id) {
      return errorResponse("plan_date and store_id required", 400, request);
    }

    console.log("🔄 Generating replenishment plan...", {
      plan_date,
      store_id,
      orgId,
    });

    const planItems = await generateReplenishmentPlan(
      orgId,
      store_id,
      plan_date,
    );
    const saved = await ReplenishmentPlan.insertMany(planItems);

    console.log(`✅ Generated ${saved.length} plan items`);

    return NextResponse.json(
      {
        message: "Plan generated successfully",
        data: saved,
        summary: {
          total_items: saved.length,
          items_to_restock: saved.filter((p) => p.recommended_qty > 0).length,
          total_recommended_qty: saved.reduce(
            (sum, p) => sum + p.recommended_qty,
            0,
          ),
        },
      },
      { status: 201, headers: corsHeaders(request) },
    );
  }

  // GET /api/replenishment/plans - List plans
  if (method === "GET" && segments.length === 2 && segments[1] === "plans") {
    const storeId = searchParams.get("store_id");
    const status = searchParams.get("status");
    const planDate = searchParams.get("plan_date");

    const query = { org_id: orgId };
    if (storeId) query.store_id = storeId;
    if (status) query.status = status;
    if (planDate) query.plan_date = new Date(planDate);

    const plans = await ReplenishmentPlan.find(query)
      .sort({ plan_date: -1, recommended_qty: -1 })
      .lean();

    return NextResponse.json(
      { data: plans },
      { headers: corsHeaders(request) },
    );
  }

  // POST /api/replenishment/plans/:id/approve - Approve plan
  if (
    method === "POST" &&
    segments.length === 4 &&
    segments[1] === "plans" &&
    segments[3] === "approve"
  ) {
    const planId = segments[2];
    const plan = await ReplenishmentPlan.findOne({
      _id: planId,
      org_id: orgId,
    });

    if (!plan) return errorResponse("Plan not found", 404, request);

    await ReplenishmentPlan.updateMany(
      {
        org_id: orgId,
        plan_date: plan.plan_date,
        store_id: plan.store_id,
        status: "draft",
      },
      { status: "approved" },
    );

    return NextResponse.json(
      {
        message: "Plan approved successfully",
      },
      { headers: corsHeaders(request) },
    );
  }

  return errorResponse("Invalid replenishment endpoint", 404, request);
}

// ============== PURCHASE ORDERS ==============
async function handlePurchaseOrders(request, segments, searchParams, context) {
  await connectDB();
  const method = request.method;
  const { orgId } = context;

  // POST /api/purchase-orders/from-plan - Create POs from approved plan
  if (
    method === "POST" &&
    segments.length === 2 &&
    segments[1] === "from-plan"
  ) {
    const body = await request.json();
    const { plan_date, store_id } = body;

    const plans = await ReplenishmentPlan.find({
      org_id: orgId,
      plan_date: new Date(plan_date),
      store_id,
      status: "approved",
      recommended_qty: { $gt: 0 },
    }).lean();

    if (plans.length === 0) {
      return errorResponse("No approved plans found to convert", 400, request);
    }

    const productIds = plans.map((p) => p.product_id);
    const products = await Product.find({
      _id: { $in: productIds },
      org_id: orgId,
    }).lean();
    const productMap = Object.fromEntries(
      products.map((p) => [p._id.toString(), p]),
    );

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
        store_id: plan.store_id,
      });
    }

    const supplierIds = Object.keys(bySupplier);
    const suppliers = await Supplier.find({
      _id: { $in: supplierIds },
      org_id: orgId,
    }).lean();
    const supplierMap = Object.fromEntries(
      suppliers.map((s) => [s._id.toString(), s]),
    );

    const createdPOs = [];
    for (const [supplierId, lines] of Object.entries(bySupplier)) {
      const supplier = supplierMap[supplierId];
      const po = await PurchaseOrder.create({
        org_id: orgId,
        po_number: `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        supplier_id: supplierId,
        supplier_name: supplier?.name || "Unknown",
        lines,
        total_amount: 0,
        status: "draft",
      });
      createdPOs.push(po);
    }

    await ReplenishmentPlan.updateMany(
      { _id: { $in: plans.map((p) => p._id) } },
      { status: "converted_to_po" },
    );

    return NextResponse.json(
      {
        message: `Created ${createdPOs.length} purchase orders`,
        data: createdPOs,
      },
      { status: 201, headers: corsHeaders(request) },
    );
  }

  // GET /api/purchase-orders - List POs
  if (method === "GET" && segments.length === 1) {
    const status = searchParams.get("status");
    const query = { org_id: orgId };
    if (status) query.status = status;

    const pos = await PurchaseOrder.find(query).sort({ created_at: -1 }).lean();
    return NextResponse.json({ data: pos }, { headers: corsHeaders(request) });
  }

  return errorResponse("Invalid purchase-orders endpoint", 404, request);
}

// ============== MAIN ROUTER ==============
export async function GET(request) {
  try {
    const { segments, searchParams } = parsePath(request);
    const { permission, orgScoped } = resolvePermission("GET", segments);
    const context = await requirePermission(request, permission, { orgScoped });

    if (segments.length === 0) {
      return NextResponse.json(
        { message: "Inventory & Replenishment API v1.0" },
        { headers: corsHeaders(request) },
      );
    }

    const resource = segments[0];

    switch (resource) {
      case "products":
        return handleProducts(request, segments, searchParams, context);
      case "stores":
        return handleStores(request, segments, context);
      case "suppliers":
        return handleSuppliers(request, segments, context);
      case "categories":
        return handleCategories(request, segments, context);
      case "inventory":
        return handleInventory(request, segments, searchParams, context);
      case "rules":
        return handleRules(request, segments, context);
      case "replenishment":
        return handleReplenishment(request, segments, searchParams, context);
      case "purchase-orders":
        return handlePurchaseOrders(request, segments, searchParams, context);
      default:
        return errorResponse("Resource not found", 404, request);
    }
  } catch (error) {
    console.error("API Error:", error);
    const status = error.status || 500;
    return errorResponse(error.message || "Unexpected error", status, request);
  }
}

export async function POST(request) {
  try {
    const { segments, searchParams } = parsePath(request);
    const { permission, orgScoped } = resolvePermission("POST", segments);
    const context = await requirePermission(request, permission, { orgScoped });
    const resource = segments[0];

    switch (resource) {
      case "products":
        return handleProducts(request, segments, searchParams, context);
      case "stores":
        return handleStores(request, segments, context);
      case "replenishment":
        return handleReplenishment(request, segments, searchParams, context);
      case "purchase-orders":
        return handlePurchaseOrders(request, segments, searchParams, context);
      default:
        return errorResponse("Resource not found", 404, request);
    }
  } catch (error) {
    console.error("API Error:", error);
    const status = error.status || 500;
    return errorResponse(error.message || "Unexpected error", status, request);
  }
}

export async function PUT(request) {
  try {
    const { segments, searchParams } = parsePath(request);
    const { permission, orgScoped } = resolvePermission("PUT", segments);
    const context = await requirePermission(request, permission, { orgScoped });
    const resource = segments[0];

    switch (resource) {
      case "products":
        return handleProducts(request, segments, searchParams, context);
      default:
        return errorResponse("Resource not found", 404, request);
    }
  } catch (error) {
    console.error("API Error:", error);
    const status = error.status || 500;
    return errorResponse(error.message || "Unexpected error", status, request);
  }
}

export async function DELETE(request) {
  try {
    const { segments, searchParams } = parsePath(request);
    const { permission, orgScoped } = resolvePermission("DELETE", segments);
    const context = await requirePermission(request, permission, { orgScoped });
    const resource = segments[0];

    switch (resource) {
      case "products":
        return handleProducts(request, segments, searchParams, context);
      default:
        return errorResponse("Resource not found", 404, request);
    }
  } catch (error) {
    console.error("API Error:", error);
    const status = error.status || 500;
    return errorResponse(error.message || "Unexpected error", status, request);
  }
}
