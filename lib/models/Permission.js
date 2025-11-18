import mongoose from 'mongoose';

const PermissionSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  description: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'permissions' });

PermissionSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.models.Permission || mongoose.model('Permission', PermissionSchema);
// lib/models/Permission.js
import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const models = mongoose.models || {}; // fallback seguro

const PermissionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    description: { type: String }
  },
  {
    collection: 'permissions',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } // evita pre-save manual
  }
);

// Reutiliza el modelo si ya existe (evita OverwriteModelError en dev)
const Permission = models.Permission || model('Permission', PermissionSchema);
export default Permission;
