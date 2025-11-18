import mongoose from 'mongoose';

const UserRoleSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  org_id: { type: String, default: null, index: true },
  created_at: { type: Date, default: Date.now }
}, { collection: 'user_roles' });

UserRoleSchema.index({ user_id: 1, role_id: 1, org_id: 1 }, { unique: true });

export default mongoose.models.UserRole || mongoose.model('UserRole', UserRoleSchema);
