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
} from "@/lib/imports/utils";

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
  const missing = PRODUCT_REQUIRED_FIELDS.filter(
    (field) => !present.has(field),
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
  function requireString(field) {
    const value = (parsedRow[field] ?? "").toString().trim();
    if (!value) {
      errors.push(`${field} vacío (fila ${rowIndex})`);
    }
    return value;
  }

  const units = sanitizeNumber(parsedRow.units_per_box, { allowFloat: false });
  const stock = sanitizeNumber(parsedRow.physical_stock, { allowFloat: false });
  const price = sanitizeNumber(parsedRow.price, { allowFloat: true });

  if (units === null) errors.push(`Unid/Alt inválido en fila ${rowIndex}`);
  if (stock === null)
    errors.push(`Existencia física inválida en fila ${rowIndex}`);
  if (price === null) errors.push(`Precio inválido en fila ${rowIndex}`);

  const payload = {
    online_category: requireString("online_category"),
    store_external_id: requireString("store_external_id"),
    product_code: requireString("product_code"),
    name: requireString("name"),
    supplier_name: requireString("supplier_name"),
    warehouse_name: requireString("warehouse_name"),
    store_name: requireString("store_name"),
    category_aux: requireString("category_aux"),
    units_per_box: units ?? 0,
    physical_stock: stock ?? 0,
    price: price ?? 0,
    sheet_title: options.sheetTitle,
    derived_categories: options.deriveCategories
      ? deriveCategoriesFromSheetTitle(options.sheetTitle)
      : [],
  };

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
