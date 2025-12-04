export const PRODUCT_TEMPLATE_HEADERS = [
  "Categoría Online",
  "idTienda",
  "Cód. Prod.",
  "Nombre",
  "Suministrador",
  "Unid/Alt.",
  "Existencia física",
  "Almacén",
  "Tienda",
  "Precio",
  "Categoría A.",
];

export const PRODUCT_REQUIRED_FIELDS = [
  "online_category",
  "store_external_id",
  "product_code",
  "name",
  "supplier_name",
  "units_per_box",
  "physical_stock",
  "warehouse_name",
  "store_name",
  "price",
  "category_aux",
];

export const PRODUCT_FIELD_ALIASES = {
  online_category: [
    "Categoría Online",
    "categoria online",
    "category online",
    "cat online",
  ],
  store_external_id: ["idTienda", "id tienda", "store id", "id tienda externo"],
  product_code: [
    "Cód. Prod.",
    "cod. prod.",
    "código",
    "codigo",
    "product code",
  ],
  name: ["Nombre", "product name", "nombre producto"],
  supplier_name: ["Suministrador", "Proveedor", "supplier", "proveedor"],
  units_per_box: ["Unid/Alt.", "unid/alt", "units per pack", "unidades"],
  physical_stock: [
    "Existencia física",
    "existencia fisica",
    "stock",
    "stock fisico",
  ],
  warehouse_name: ["Almacén", "almacen", "warehouse", "no_almacen",
    "no_alm",
    "no alm",
    "no. alm",
    "no. alm.",
    "no almacén",
    "no almacen",
    "no_almacen_",
    "no_almacen_",],
  store_name: ["Tienda", "store", "tienda destino"],
  price: ["Precio", "price", "precio unitario"],
  category_aux: ["Categoría A.", "categoria a.", "category a"],
  };

export const MAX_ERROR_DETAILS = 10;
export const MAX_PREVIEW_ROWS = 5;
