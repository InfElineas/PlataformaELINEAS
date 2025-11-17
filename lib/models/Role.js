// lib/models/Role.js
import mongoose from 'mongoose';
const { Schema, model } = mongoose;           // desestructuramos desde la instancia
const models = mongoose.models || {};         // fallback seguro

const RoleSchema = new Schema(
  {
    org_id: { type: String, default: null, index: true },
    key: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    description: { type: String },
    scope: { type: String, enum: ['global', 'org'], default: 'org' }
  },
  {
    collection: 'roles',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } // evita pre-save manual
  }
);

// índices únicos contextuales (igual que los tuyos)
RoleSchema.index(
  { key: 1 },
  { unique: true, partialFilterExpression: { org_id: null } }
);
RoleSchema.index(
  { org_id: 1, key: 1 },
  { unique: true, partialFilterExpression: { org_id: { $ne: null } } }
);

// Reutiliza el modelo si ya existe (hot-reload)
const Role = models.Role || model('Role', RoleSchema);
export default Role;
