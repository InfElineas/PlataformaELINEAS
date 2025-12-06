export const PRODUCT_TEMPLATE_HEADERS = [
  "Categoría Online",
  "idTienda",
  "Cód. Prod.",
  "Nombre",
  "Suministrador",
  "Unid/Alt.",
  "Existencia fi",
  "Almacén",
  "Tienda",
  "Precio",
  "Categoría A.",
  "Alm.",
];

export const PRODUCT_REQUIRED_FIELDS = [
  "online_category",
  "store_external_id",
  "product_code",
  "name",
  "units_per_box",
  "existencia_fisica",
  "reserva",
  "disponible_tienda",
  "price",
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
  existencia_fisica: [
    "Existencia fi",
    "existencia fi.",
    "existencia fisica",
    "existencia física",
    "stock",
    "stock fisico",
    "stock físico",
  ],
  reserva: ["Almacén", "almacen", "a", "stock almacen", "stock almacén"],
  disponible_tienda: [
    "Tienda",
    "tienda destino",
    "stock tienda",
    "disponible tienda",
  ],
  price: ["Precio", "price", "precio unitario"],
  category_aux: ["Categoría A.", "categoria a.", "category a"],
  no_almacen: [
    "Alm.",
    "alm.",
    "alm",
    "no alm",
    "no. alm.",
    "no almacén",
    "no almacen",
    "no_almacen",
  ],
  warehouse_code: ["No. Alm.", "no alm codigo", "codigo almacen"],
};

export const MAX_ERROR_DETAILS = 10;
export const MAX_PREVIEW_ROWS = 5;
