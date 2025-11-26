import mongoose from "mongoose";

const InventorySnapshotSchema = new mongoose.Schema(
  {
    org_id: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    store_id: { type: String, required: true },
    product_id: { type: String, required: true },
    physical_stock: { type: Number, required: true },
    stock_units: { type: Number },
    stock_boxes: { type: Number },
    price_cost: { type: Number },
    price_shop: { type: Number },
    status: { type: String, default: "current" },
  },
  { collection: "inventory_snapshots" },
);

InventorySnapshotSchema.index({ org_id: 1, date: 1, store_id: 1 });
InventorySnapshotSchema.index({ org_id: 1, product_id: 1, date: 1 });

const InventorySnapshot =
  mongoose.models?.InventorySnapshot ||
  mongoose.model("InventorySnapshot", InventorySnapshotSchema);

export default InventorySnapshot;
