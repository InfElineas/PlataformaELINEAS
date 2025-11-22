import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    org_id: { type: String, required: true, index: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email_verified_at: { type: Date },
    password_hash: { type: String, required: true },
    full_name: { type: String, required: true },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String },
    language: { type: String, default: "es" },
    timezone: { type: String, default: "UTC" },
    avatar_url: { type: String },
    mfa_enabled: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    integrations: {
      google: {
        refresh_token: { type: String },
        access_token: { type: String },
        token_type: { type: String },
        scope: { type: String },
        expiry_date: { type: Number },
        connected_at: { type: Date },
      },
    },
    import_preferences: {
      default_structure: {
        type: String,
        enum: ["header", "fixed"],
        default: "header",
      },
      replace_existing: { type: Boolean, default: true },
    },
    last_login_at: { type: Date },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: "users" },
);

UserSchema.index({ org_id: 1, username: 1 }, { unique: true });
UserSchema.index({ org_id: 1, is_active: 1 });

UserSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

const User = mongoose.models?.User || mongoose.model("User", UserSchema);

export default User;
