import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    // Org
    org_id: { type: String, required: true, index: true },

    // Identificador del producto en TKC para una tienda concreta
    idTienda: { type: String, sparse: true },

    // Id externo de tienda / almacén (ej. código TKC de almacén)
    store_external_id: { type: String },

    // Código interno de Elíneas (ej. "PROD-1000")
    product_code: { type: String, required: true },

    // Código de producto TKC (Cód. Prod. que ves en el reporte)
    tkc_code: { type: String },

    // Código de barras (opcional)
    barcode: { type: String },

    // Datos básicos de producto
    name: { type: String, required: true },
    brand: { type: String },

    uom: { type: String, default: "unit" },
    units_per_box: { type: Number, default: 1 },

    // Categoría online
    category_path: [{ type: String }],
    category_id: { type: String },

    // Proveedor / suministrador
    supplier_id: { type: String },
    supplier_name: { type: String },
    provider_id: { type: String },

    // Info de tienda / almacén (opcionales, por si los quieres usar luego)
    store_name: { type: String },

    // Nombre legible del almacén (si algún día lo quieres distinto del código)
    warehouse_name: { type: String },

    // Número de almacén tal cual viene en la columna "No. Alm."
    no_almacen: { type: String, index: true },

    // Alias del mismo código, por si lo quieres usar para joins/filtros
    warehouse_code: { type: String, index: true },

    online_category: { type: String },

    // Precio base (puedes seguir usando PriceList para precios históricos)
    price: { type: Number, default: 0 },

    // Datos operativos para la vista de productos
    physical_stock: { type: Number, default: 0, alias: "existencia_fisica" }, // EF
    reserve_qty: { type: Number, default: 0, alias: "reserva" }, // A
    store_qty: { type: Number, default: 0, alias: "disponible_tienda" }, // T

    status: {
      type: String,
      enum: ["active", "discontinued", "pending"],
      default: "active",
    },
    mgmt_mode: {
      type: String,
      enum: ["managed", "unmanaged"],
      default: "managed",
    },

    metadata: { type: mongoose.Schema.Types.Mixed },

    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: "products" },
);

// Índices
ProductSchema.index({ org_id: 1, product_code: 1 }, { unique: true });

ProductSchema.index(
  { org_id: 1, idTienda: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { idTienda: { $type: "string" } },
  },
);

ProductSchema.index({ org_id: 1, store_external_id: 1 });
ProductSchema.index({ org_id: 1, category_id: 1 });
ProductSchema.index({ org_id: 1, status: 1 });

// Hook para timestamp
ProductSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

const Product =
  mongoose.models?.Product || mongoose.model("Product", ProductSchema);

export default Product;
