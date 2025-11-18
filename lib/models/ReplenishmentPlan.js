import mongoose from 'mongoose';

const ReplenishmentPlanSchema = new mongoose.Schema({
  org_id: { type: String, required: true, index: true },
  plan_date: { type: Date, required: true },
  store_id: { type: String, required: true },
  product_id: { type: String, required: true },
  product_name: { type: String },
  current_stock: { type: Number },
  target_stock: { type: Number },
  avg_daily_demand: { type: Number },
  seasonality_factor: { type: Number },
  recommended_qty: { type: Number, required: true },
  days_of_cover: { type: Number },
  min_stock: { type: Number },
  max_stock: { type: Number },
  reason: { type: String },
  status: { type: String, enum: ['draft', 'approved', 'converted_to_po'], default: 'draft' },
  created_at: { type: Date, default: Date.now }
}, { collection: 'replenishment_plans' });

ReplenishmentPlanSchema.index({ org_id: 1, plan_date: 1, store_id: 1 });
ReplenishmentPlanSchema.index({ org_id: 1, status: 1 });

const ReplenishmentPlan = mongoose.models?.ReplenishmentPlan || mongoose.model('ReplenishmentPlan', ReplenishmentPlanSchema);

export default ReplenishmentPlan;
