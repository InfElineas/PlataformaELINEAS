import mongoose from 'mongoose';

const PriceListSchema = new mongoose.Schema({
  org_id: { type: String, required: true, index: true },
  product_id: { type: String, required: true },
  valid_from: { type: Date, required: true },
  price_cost: { type: Number },
  price_direct: { type: Number },
  price_shop: { type: Number },
  currency: { type: String, default: 'USD' }
}, { collection: 'price_lists' });

PriceListSchema.index({ org_id: 1, product_id: 1, valid_from: -1 });

export default mongoose.models.PriceList || mongoose.model('PriceList', PriceListSchema);