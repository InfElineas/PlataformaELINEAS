import {
  PRODUCT_REQUIRED_FIELDS,
  MAX_ERROR_DETAILS,
} from "@/lib/imports/constants";
import { ImportValidationError } from "@/lib/imports/errors";
import {
  deriveCategoriesFromSheetTitle,
  ensureTemplateHeaders,
  resolveFieldFromHeader,
  sanitizeNumber,deriveWarehouseFromSheetTitle,
} from "@/lib/imports/utils";

// Campos "sintéticos": no vienen de columnas, los derivamos luego
const SYNTHETIC_FIELDS = new Set(["warehouse_name", "store_name","category_aux", "supplier_name"]);

function resolveHeaders(rows, { hasHeaders, headerOverride }) {
  if (hasHeaders) {
    const headerRow = rows[0] || [];
    return headerRow.map((header) => header?.toString()?.trim() || "");
  }
  if (headerOverride?.length) {
    return headerOverride;
  }
  return ensureTemplateHeaders();
}

function detectFieldPresence(headers) {
  const fieldMap = new Map();

  headers.forEach((header, index) => {
    const field = resolveFieldFromHeader(header);
    if (field) {
      fieldMap.set(index, field);
    }
  });

  const present = new Set(fieldMap.values());

  // Ignoramos los campos sintéticos en la validación de requeridos
  const missing = PRODUCT_REQUIRED_FIELDS.filter(
    (field) => !present.has(field) && !SYNTHETIC_FIELDS.has(field),
  );

  return { fieldMap, missing };
}

function parseRowValues(row, fieldMap) {
  const parsed = {};
  fieldMap.forEach((field, index) => {
    parsed[field] = row[index] ?? "";
  });
  return parsed;
}

function normalizeRow(parsedRow, rowIndex, options) {
  const errors = [];

  // Campos realmente obligatorios
  function requireString(field) {
    const value = (parsedRow[field] ?? "").toString().trim();
    if (!value) {
      errors.push(`${field} vacío (fila ${rowIndex})`);
    }
    return value;
  }

  // Campos opcionales: no generan errores si vienen vacíos
  function optionalString(field) {
    const value = (parsedRow[field] ?? "").toString().trim();
    return value || "";
  }

  // 🧮 Unid/Alt: si no es numérico, asumimos 1 y NO marcamos error
  const unitsParsed = sanitizeNumber(parsedRow.units_per_box, {
    allowFloat: false,
  });
  const units = unitsParsed === null ? 1 : unitsParsed;

  // EF y precio sí se validan estrictamente
  const stock = sanitizeNumber(parsedRow.physical_stock, {
    allowFloat: false,
  });
  const price = sanitizeNumber(parsedRow.price, { allowFloat: true });

  if (stock === null) {
    errors.push(`Existencia física inválida en fila ${rowIndex}`);
  }
  if (price === null) {
    errors.push(`Precio inválido en fila ${rowIndex}`);
  }

  const payload = {
  online_category: requireString("online_category"),
  store_external_id: (parsedRow.store_external_id ?? "").toString().trim(),
  product_code: requireString("product_code"),
  name: requireString("name"),

  // 👇 ahora ya NO exigimos proveedor obligatorio
  supplier_name: (parsedRow.supplier_name ?? "").toString().trim(),

  warehouse_name: (parsedRow.warehouse_name ?? "").toString().trim(),
  store_name: (parsedRow.store_name ?? "").toString().trim(),
  category_aux: (parsedRow.category_aux ?? "").toString().trim(),

  // 👇 NUEVO: número de almacén por fila (columna L "No. Alm.")
  warehouse_code: (
    parsedRow.warehouse_code ??
    parsedRow.no_almacen ??
    parsedRow.no_alm ??
    ""
  ).toString().trim(),

  // cantidades
  units_per_box: units,
  physical_stock: stock ?? 0,
  reserve_qty:
    sanitizeNumber(parsedRow.reserve_qty, { allowFloat: false }) ?? 0,
  store_qty:
    sanitizeNumber(parsedRow.store_qty, { allowFloat: false }) ?? 0,

  price: price ?? 0,
  sheet_title: options.sheetTitle,
  derived_categories: options.deriveCategories
    ? deriveCategoriesFromSheetTitle(options.sheetTitle)
    : [],
};


  // Derivar número de almacén desde el título
  const { warehouse_code } = deriveWarehouseFromSheetTitle(options.sheetTitle);
  if (warehouse_code) {
    payload.warehouse_code = warehouse_code;
    payload.no_almacen = warehouse_code;
  }

  if (errors.length) {
    throw new ImportValidationError("Fila inválida", { errors });
  }

  return payload;
}




export function normalizeProductRows(
  values,
  {
    hasHeaders = true,
    headerOverride,
    sheetTitle = "Sheet1",
    deriveCategories = false,
  } = {},
) {
  if (!values?.length) {
    throw new ImportValidationError("El archivo está vacío");
  }

  const headers = resolveHeaders(values, { hasHeaders, headerOverride });
  const { fieldMap, missing } = detectFieldPresence(headers);

  if (missing.length) {
    // Aquí ya NO aparecen warehouse_name / store_name
    throw new ImportValidationError("Faltan columnas requeridas", { missing });
  }

  const startIndex = hasHeaders ? 1 : 0;
  const normalized = [];
  const rowErrors = [];

  for (let i = startIndex; i < values.length; i++) {
    const row = values[i];

    // Saltar filas completamente vacías
    if (!row || row.every((cell) => !cell || cell.toString().trim() === "")) {
      continue;
    }

    const parsed = parseRowValues(row, fieldMap);

    try {
      const result = normalizeRow(parsed, i + 1, {
        sheetTitle,
        deriveCategories,
      });
      normalized.push(result);
    } catch (error) {
      if (error instanceof ImportValidationError) {
        rowErrors.push(...(error.details.errors || []));
      } else {
        rowErrors.push(`Error en fila ${i + 1}: ${error.message}`);
      }
      if (rowErrors.length >= MAX_ERROR_DETAILS) {
        break;
      }
    }
  }

  if (rowErrors.length) {
    throw new ImportValidationError("Errores de validación en filas", {
      errors: rowErrors,
    });
  }

  return normalized;
}
