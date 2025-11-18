import mongoose from 'mongoose';

const UserRoleSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  org_id: { type: String, default: null, index: true },
  created_at: { type: Date, default: Date.now }
}, { collection: 'user_roles' });

UserRoleSchema.index({ user_id: 1, role_id: 1, org_id: 1 }, { unique: true });

export default mongoose.models.UserRole || mongoose.model('UserRole', UserRoleSchema);
// lib/models/UserRole.js
import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const models = mongoose.models || {}; // fallback seguro

const UserRoleSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    org_id:  { type: String, default: null, index: true }
  },
  {
    collection: 'user_roles',
    timestamps: { createdAt: 'created_at', updatedAt: false } // solo creamos created_at
  }
);

// Único por (usuario, rol, org)
UserRoleSchema.index({ user_id: 1, role_id: 1, org_id: 1 }, { unique: true });

// Reutiliza el modelo si ya existe (evita OverwriteModelError)
const UserRole = models.UserRole || model('UserRole', UserRoleSchema);
export default UserRole;
