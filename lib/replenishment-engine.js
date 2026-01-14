import ReplenishmentRule from "./models/ReplenishmentRule";
import InventorySnapshot from "./models/InventorySnapshot";
import Product from "./models/Product";
import { subDays, format, parseISO } from "date-fns";

/**
 * Resolve replenishment rules with hierarchy:
 * product_id > category_id > store_id > global (no scope)
 */
export async function resolveRules(orgId, storeId, categoryId, productId) {
  const rules = await ReplenishmentRule.find({
    org_id: orgId,
    active: true,
    $or: [
      { "scope.product_id": productId },
      { "scope.category_id": categoryId, "scope.product_id": null },
      {
        "scope.store_id": storeId,
        "scope.category_id": null,
        "scope.product_id": null,
      },
      {
        "scope.store_id": null,
        "scope.category_id": null,
        "scope.product_id": null,
      },
    ],
  }).sort({ priority: -1 });

  // Priority: most specific wins
  const productRule = rules.find((r) => r.scope.product_id === productId);
  if (productRule) return productRule.params;

  const categoryRule = rules.find(
    (r) => r.scope.category_id === categoryId && !r.scope.product_id,
  );
  if (categoryRule) return categoryRule.params;

  const storeRule = rules.find(
    (r) =>
      r.scope.store_id === storeId &&
      !r.scope.category_id &&
      !r.scope.product_id,
  );
  if (storeRule) return storeRule.params;

  const globalRule = rules.find(
    (r) => !r.scope.store_id && !r.scope.category_id && !r.scope.product_id,
  );
  if (globalRule) return globalRule.params;

  // Default fallback
  return {
    days_of_cover: 7,
    lead_time_days: 3,
    service_level: 0.9,
    safety_stock: 0,
    avg_demand_window_days: 28,
    seasonality: {},
    pack_size: 1,
    moq: 0,
    max_stock: null,
    min_stock: null,
  };
}

/**
 * Compute average daily demand from inventory snapshots
 */
export async function computeAvgDailyDemand(
  orgId,
  productId,
  storeId,
  windowDays,
  planDate,
) {
  const endDate = new Date(planDate);
  const startDate = subDays(endDate, windowDays);

  const snapshots = await InventorySnapshot.find({
    org_id: orgId,
    product_id: productId,
    store_id: storeId,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 });

  if (snapshots.length < 2) return 0;

  // Calculate movement: stock decrease = demand
  let totalMovement = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1].physical_stock;
    const curr = snapshots[i].physical_stock;
    if (prev > curr) {
      totalMovement += prev - curr;
    }
  }

  const avgDaily = totalMovement / Math.max(1, snapshots.length - 1);
  return Math.max(0, avgDaily);
}

/**
 * Get current seasonality multiplier
 */
export function currentSeasonalityMultiplier(planDate, seasonalityMap) {
  if (!seasonalityMap || Object.keys(seasonalityMap).length === 0) return 1.0;

  const date = new Date(planDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Check for special dates
  if (month === 2 && day === 14 && seasonalityMap["feb14"]) {
    return seasonalityMap["feb14"];
  }
  if (month === 5 && day >= 8 && day <= 14 && seasonalityMap["mothers_day"]) {
    return seasonalityMap["mothers_day"];
  }
  if ((month === 11 || month === 12) && seasonalityMap["nov_dec"]) {
    return seasonalityMap["nov_dec"];
  }

  return 1.0;
}

/**
 * Get current stock on hand
 */
export async function getOnHand(orgId, productId, storeId, planDate) {
  const snapshot = await InventorySnapshot.findOne({
    org_id: orgId,
    product_id: productId,
    store_id: storeId,
    date: { $lte: new Date(planDate) },
  }).sort({ date: -1 });

  return snapshot ? snapshot.physical_stock : 0;
}

/**
 * Main replenishment calculation engine
 */
export async function calculateReplenishment(
  orgId,
  product,
  storeId,
  planDate,
) {
  // Get rules for this product
  const rules = await resolveRules(
    orgId,
    storeId,
    product.category_id,
    product._id.toString(),
  );

  // Compute demand
  const demand = await computeAvgDailyDemand(
    orgId,
    product._id.toString(),
    storeId,
    rules.avg_demand_window_days,
    planDate,
  );

  // Apply seasonality
  const seasonalityFactor = currentSeasonalityMultiplier(
    planDate,
    rules.seasonality,
  );

  // Calculate target stock
  const targetBase =
    (rules.days_of_cover + rules.lead_time_days) * demand * seasonalityFactor +
    (rules.safety_stock || 0);
  let target = Math.max(rules.min_stock || 0, Math.ceil(targetBase));

  // Get current stock
  const currentStock = await getOnHand(
    orgId,
    product._id.toString(),
    storeId,
    planDate,
  );

  // Calculate recommendation
  let recommendedQty = Math.max(0, target - currentStock);

  // Apply pack size rounding
  const packSize = Math.max(1, rules.pack_size || 1);
  if (recommendedQty > 0) {
    recommendedQty = Math.ceil(recommendedQty / packSize) * packSize;
  }

  // Apply MOQ
  if (rules.moq && recommendedQty > 0) {
    recommendedQty = Math.max(recommendedQty, rules.moq);
  }

  // Apply max stock cap
  if (rules.max_stock) {
    const maxBuy = Math.max(0, rules.max_stock - currentStock);
    recommendedQty = Math.min(recommendedQty, maxBuy);
  }

  // If product is not active, recommend 0
  if (product.status !== "active") {
    recommendedQty = 0;
  }

  return {
    product_id: product._id.toString(),
    product_name: product.name,
    current_stock: currentStock,
    target_stock: target,
    avg_daily_demand: demand,
    seasonality_factor: seasonalityFactor,
    recommended_qty: recommendedQty,
    days_of_cover: rules.days_of_cover,
    min_stock: rules.min_stock,
    max_stock: rules.max_stock,
    reason: recommendedQty > 0 ? "Restock needed" : "Sufficient stock",
  };
}

/**
 * Generate full replenishment plan for a store
 */
export async function generateReplenishmentPlan(orgId, storeId, planDate) {
  // Get all active managed products
  const products = await Product.find({
    org_id: orgId,
    status: "active",
    mgmt_mode: "managed",
  });

  const planItems = [];

  for (const product of products) {
    const calculation = await calculateReplenishment(
      orgId,
      product,
      storeId,
      planDate,
    );
    planItems.push({
      org_id: orgId,
      plan_date: new Date(planDate),
      store_id: storeId,
      ...calculation,
      status: "draft",
    });
  }

  return planItems;
}
