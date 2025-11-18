import mongoose from 'mongoose';

const ReplenishmentRuleSchema = new mongoose.Schema({
  org_id: { type: String, required: true, index: true },
  scope: {
    store_id: { type: String },
    category_id: { type: String },
    product_id: { type: String }
  },
  params: {
    days_of_cover: { type: Number, default: 7 },
    lead_time_days: { type: Number, default: 3 },
    service_level: { type: Number, default: 0.9 },
    safety_stock: { type: Number, default: 0 },
    avg_demand_window_days: { type: Number, default: 28 },
    seasonality: { type: Map, of: Number },
    pack_size: { type: Number, default: 1 },
    moq: { type: Number, default: 0 },
    max_stock: { type: Number },
    min_stock: { type: Number }
  },
  active: { type: Boolean, default: true },
  priority: { type: Number, default: 100 },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'replenishment_rules' });

ReplenishmentRuleSchema.index({ org_id: 1, 'scope.product_id': 1 });
ReplenishmentRuleSchema.index({ org_id: 1, 'scope.category_id': 1 });
ReplenishmentRuleSchema.index({ org_id: 1, 'scope.store_id': 1 });

const ReplenishmentRule = mongoose.models?.ReplenishmentRule || mongoose.model('ReplenishmentRule', ReplenishmentRuleSchema);

export default ReplenishmentRule;
