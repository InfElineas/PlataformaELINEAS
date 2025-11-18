import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  org_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  parent_id: { type: String },
  path: [{ type: String }],
  depth: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
}, { collection: 'categories' });

CategorySchema.index({ org_id: 1, slug: 1 }, { unique: true });

const Category = mongoose.models?.Category || mongoose.model('Category', CategorySchema);

export default Category;
