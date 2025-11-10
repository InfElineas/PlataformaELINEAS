import mongoose from 'mongoose';

const StoreSchema = new mongoose.Schema({
  org_id: { type: String, required: true, index: true },
  tkc_code: { type: String, required: true },
  name: { type: String, required: true },
  is_shop: { type: Boolean, default: false },
  location: { type: String },
  created_at: { type: Date, default: Date.now }
}, { collection: 'stores' });

StoreSchema.index({ org_id: 1, tkc_code: 1 }, { unique: true });

export default mongoose.models.Store || mongoose.model('Store', StoreSchema);