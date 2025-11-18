import mongoose from 'mongoose';

const RolePermissionSchema = new mongoose.Schema({
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  permission_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission', required: true },
  created_at: { type: Date, default: Date.now }
}, { collection: 'role_permissions' });

RolePermissionSchema.index({ role_id: 1, permission_id: 1 }, { unique: true });

export default mongoose.models.RolePermission || mongoose.model('RolePermission', RolePermissionSchema);
// lib/models/RolePermission.js
import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const models = mongoose.models || {}; // fallback seguro

const RolePermissionSchema = new Schema(
  {
    role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    permission_id: { type: Schema.Types.ObjectId, ref: 'Permission', required: true, index: true }
  },
  {
    collection: 'role_permissions',
    timestamps: { createdAt: 'created_at', updatedAt: false } // sólo creamos created_at
  }
);

// índice único por par (rol, permiso)
RolePermissionSchema.index({ role_id: 1, permission_id: 1 }, { unique: true });

// Reutiliza el modelo si ya existe
const RolePermission = models.RolePermission || model('RolePermission', RolePermissionSchema);
export default RolePermission;
