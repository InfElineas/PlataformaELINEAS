import mongoose from 'mongoose';

const SupplierSchema = new mongoose.Schema({
  org_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  aliases: [{ type: String }],
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
}, { collection: 'suppliers' });

SupplierSchema.index({ org_id: 1, name: 1 }, { unique: true });

const Supplier = mongoose.models?.Supplier || mongoose.model('Supplier', SupplierSchema);

export default Supplier;
