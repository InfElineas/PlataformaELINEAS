import mongoose from 'mongoose';

const PurchaseOrderSchema = new mongoose.Schema({
  org_id: { type: String, required: true, index: true },
  po_number: { type: String, required: true },
  supplier_id: { type: String, required: true },
  supplier_name: { type: String },
  plan_id: { type: String },
  lines: [{
    product_id: { type: String, required: true },
    product_name: { type: String },
    qty: { type: Number, required: true },
    price: { type: Number },
    store_id: { type: String }
  }],
  total_amount: { type: Number },
  status: { type: String, enum: ['draft', 'submitted', 'received', 'cancelled'], default: 'draft' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'purchase_orders' });

PurchaseOrderSchema.index({ org_id: 1, po_number: 1 }, { unique: true });
PurchaseOrderSchema.index({ org_id: 1, status: 1 });

export default mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', PurchaseOrderSchema);