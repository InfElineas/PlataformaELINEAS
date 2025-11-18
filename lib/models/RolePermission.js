import mongoose from 'mongoose';

const RolePermissionSchema = new mongoose.Schema({
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  permission_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission', required: true },
  created_at: { type: Date, default: Date.now }
}, { collection: 'role_permissions' });

RolePermissionSchema.index({ role_id: 1, permission_id: 1 }, { unique: true });

const RolePermission = mongoose.models?.RolePermission || mongoose.model('RolePermission', RolePermissionSchema);

export default RolePermission;
