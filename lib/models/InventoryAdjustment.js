import mongoose from "mongoose";

const InventoryAdjustmentSchema = new mongoose.Schema(
  {
    org_id: { type: String, required: true, index: true },
    product_id: { type: String, required: true, index: true },
    snapshot_id: { type: String },
    counted_by: { type: String },
    counted_at: { type: Date, default: Date.now },
    platform_qty: { type: Number, default: 0 },
    platform_reserve: { type: Number, default: 0 },
    platform_store: { type: Number, default: 0 },
    real_qty: { type: Number, default: null },
    difference: { type: Number, default: 0 },
    state: {
      type: String,
      enum: ["pendiente", "ok", "faltante", "sobrante"],
      default: "pendiente",
      index: true,
    },
    reason: { type: String, default: "" },
    note: { type: String, default: "" },
    upload_qty: { type: Number, default: 0 },
    download_qty: { type: Number, default: 0 },
  },
  { collection: "inventory_adjustments", timestamps: true },
);

InventoryAdjustmentSchema.index({ org_id: 1, counted_at: -1 });
InventoryAdjustmentSchema.index({ org_id: 1, product_id: 1, counted_at: -1 });

const InventoryAdjustment =
  mongoose.models?.InventoryAdjustment ||
  mongoose.model("InventoryAdjustment", InventoryAdjustmentSchema);

export default InventoryAdjustment;
