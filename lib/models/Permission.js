import mongoose from 'mongoose';

const PermissionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: 'permissions' }
);

PermissionSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

// 👇 mismo patrón que en Role
const Permission =
  mongoose.models?.Permission || mongoose.model('Permission', PermissionSchema);

export default Permission;
