import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  org_id: { type: String, required: true, index: true },
  idTienda: { type: String, sparse: true },
  product_code: { type: String, required: true },
  barcode: { type: String },
  name: { type: String, required: true },
  brand: { type: String },
  uom: { type: String, default: 'unit' },
  units_per_box: { type: Number, default: 1 },
  category_path: [{ type: String }],
  category_id: { type: String },

  // 🔽 NUEVO CAMPO
  supplier_id: { type: String },
  supplier_name: { type: String }, // <── añadir esta línea
  // opcional: puedes dejar provider_id si lo usas en otro flujo
  provider_id: { type: String },

  status: { type: String, enum: ['active', 'discontinued', 'pending'], default: 'active' },
  mgmt_mode: { type: String, enum: ['managed', 'unmanaged'], default: 'managed' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'products' });

ProductSchema.index({ org_id: 1, product_code: 1 }, { unique: true });
// ...
export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
