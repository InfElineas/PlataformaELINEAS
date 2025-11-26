import mongoose from "mongoose";

const ApiTokenSchema = new mongoose.Schema(
  {
    org_id: { type: String, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    name: { type: String, required: true },
    token_hash: { type: String, required: true },
    scopes: [{ type: String }],
    expires_at: { type: Date },
    revoked_at: { type: Date },
    created_at: { type: Date, default: Date.now },
  },
  { collection: "api_tokens" },
);

ApiTokenSchema.index({ token_hash: 1 }, { unique: true });

const ApiToken =
  mongoose.models?.ApiToken || mongoose.model("ApiToken", ApiTokenSchema);

export default ApiToken;
