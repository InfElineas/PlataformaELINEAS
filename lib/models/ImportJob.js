import mongoose from 'mongoose';

const ImportJobSchema = new mongoose.Schema({
  org_id: { type: String, required: true, index: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['products'], required: true },
  source: { type: String, enum: ['excel_upload', 'google_sheet', 'google_sheet_all'], required: true },
  file_name: { type: String },
  sheet_id: { type: String },
  sheet_name: { type: String },
  sheet_count: { type: Number, default: 1 },
  total_rows: { type: Number, default: 0 },
  imported: { type: Number, default: 0 },
  updated: { type: Number, default: 0 },
  duplicates: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  errors: [{ type: String }],
  status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
  meta: { type: mongoose.Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now }
}, { collection: 'imports' });

ImportJobSchema.index({ org_id: 1, created_at: -1 });
ImportJobSchema.index({ user_id: 1, created_at: -1 });

export default mongoose.models.ImportJob || mongoose.model('ImportJob', ImportJobSchema);
