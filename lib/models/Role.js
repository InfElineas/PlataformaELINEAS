import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema(
  {
    org_id: { type: String, default: null, index: true },
    key: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    description: { type: String },
    scope: { type: String, enum: ["global", "org"], default: "org" },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: "roles" },
);

RoleSchema.index(
  { key: 1 },
  { unique: true, partialFilterExpression: { org_id: null } },
);
RoleSchema.index(
  { org_id: 1, key: 1 },
  { unique: true, partialFilterExpression: { org_id: { $ne: null } } },
);

RoleSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

const Role = mongoose.models?.Role || mongoose.model("Role", RoleSchema);

export default Role;
