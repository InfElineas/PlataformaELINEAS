import {
  PRODUCT_REQUIRED_FIELDS,
  MAX_ERROR_DETAILS,
} from "@/lib/imports/constants";
import { ImportValidationError } from "@/lib/imports/errors";
import {
  deriveCategoriesFromSheetTitle,
  ensureTemplateHeaders,
  resolveFieldFromHeader,
  sanitizeNumber,
  deriveWarehouseFromSheetTitle,
} from "@/lib/imports/utils";

// Campos "sintéticos": no vienen de columnas, los derivamos luego
const SYNTHETIC_FIELDS = new Set(["warehouse_code"]);

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

  const unitsParsed = sanitizeNumber(parsedRow.units_per_box, {
    allowFloat: false,
  });
  const units = unitsParsed === null ? 1 : unitsParsed;

  const existencia_fisica = sanitizeNumber(
    parsedRow.existencia_fisica ?? parsedRow.physical_stock,
    { allowFloat: false },
  );
  const reserva = sanitizeNumber(
    parsedRow.reserva ?? parsedRow.reserve_qty ?? parsedRow.almacen,
    { allowFloat: false },
  );
  const disponible_tienda = sanitizeNumber(
    parsedRow.disponible_tienda ?? parsedRow.store_qty ?? parsedRow.tienda,
    { allowFloat: false },
  );

  const price = sanitizeNumber(parsedRow.price, { allowFloat: true });

  if (existencia_fisica === null) {
    errors.push(`Existencia física inválida en fila ${rowIndex}`);
  }
  if (reserva === null) {
    errors.push(`Reserva de almacén inválida en fila ${rowIndex}`);
  }
  if (disponible_tienda === null) {
    errors.push(`Disponible en tienda inválido en fila ${rowIndex}`);
  }
  if (price === null) {
    errors.push(`Precio inválido en fila ${rowIndex}`);
  }

  const no_almacen = (
    parsedRow.no_almacen ??
    parsedRow.alm ??
    parsedRow.almacen_codigo ??
    ""
  )
    .toString()
    .trim();

  const warehouse_name = (parsedRow.warehouse_name ?? no_almacen ?? "")
    .toString()
    .trim();

  const payload = {
    online_category: requireString("online_category"),
    store_external_id: optionalString("store_external_id"),
    product_code: requireString("product_code"),
    name: requireString("name"),
    supplier_name: optionalString("supplier_name"),
    category_aux: optionalString("category_aux"),

    units_per_box: units,
    existencia_fisica: existencia_fisica ?? 0,
    reserva: reserva ?? 0,
    disponible_tienda: disponible_tienda ?? 0,
    price: price ?? 0,

    warehouse_name,
    no_almacen,
    warehouse_code: (parsedRow.warehouse_code ?? no_almacen ?? "")
      .toString()
      .trim(),
    sheet_title: options.sheetTitle,
    derived_categories: options.deriveCategories
      ? deriveCategoriesFromSheetTitle(options.sheetTitle)
      : [],
  };

  const { warehouse_code } = deriveWarehouseFromSheetTitle(options.sheetTitle);
  if (!payload.warehouse_code && warehouse_code) {
    payload.warehouse_code = warehouse_code;
  }
  if (!payload.no_almacen && payload.warehouse_code) {
    payload.no_almacen = payload.warehouse_code;
  }
  if (!payload.warehouse_name && payload.no_almacen) {
    payload.warehouse_name = payload.no_almacen;
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
