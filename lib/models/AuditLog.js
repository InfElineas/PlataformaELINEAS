import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  org_id: { type: String, index: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  resource: { type: String },
  resource_id: { type: String },
  ip: { type: String },
  user_agent: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now }
}, { collection: 'audit_logs' });

AuditLogSchema.index({ org_id: 1, created_at: -1 });
AuditLogSchema.index({ user_id: 1, created_at: -1 });

const AuditLog = mongoose.models?.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

export default AuditLog;
