import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  org_id: { type: String, required: true, index: true },
  idTienda: { type: String, sparse: true },
  store_external_id: { type: String },
  product_code: { type: String, required: true },
  barcode: { type: String },
  name: { type: String, required: true },
  brand: { type: String },
  uom: { type: String, default: 'unit' },
  units_per_box: { type: Number, default: 1 },
  category_path: [{ type: String }],
  category_id: { type: String },
  supplier_id: { type: String },
  supplier_name: { type: String },
  provider_id: { type: String },
  store_name: { type: String },
  warehouse_name: { type: String },
  online_category: { type: String },
  price: { type: Number, default: 0 },
  physical_stock: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'discontinued', 'pending'], default: 'active' },
  mgmt_mode: { type: String, enum: ['managed', 'unmanaged'], default: 'managed' },
  metadata: { type: mongoose.Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'products' });

ProductSchema.index({ org_id: 1, product_code: 1 }, { unique: true });
ProductSchema.index({ org_id: 1, idTienda: 1 }, { unique: true, sparse: true, partialFilterExpression: { idTienda: { $type: 'string' } } });
ProductSchema.index({ org_id: 1, store_external_id: 1 });
ProductSchema.index({ org_id: 1, category_id: 1 });
ProductSchema.index({ org_id: 1, status: 1 });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);