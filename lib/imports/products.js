import connectDB from "@/lib/mongodb";
import Product from "@/lib/models/Product";
import ImportJob from "@/lib/models/ImportJob";
import AuditLog from "@/lib/models/AuditLog";
import { normalizeProductRows } from "@/lib/imports/parser";
import {
  MAX_PREVIEW_ROWS,
  PRODUCT_TEMPLATE_HEADERS,
} from "@/lib/imports/constants";
import { ImportValidationError } from "@/lib/imports/errors";

/* ================= Helpers ================= */

function toStringOrNull(...candidates) {
  for (const v of candidates) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s !== "") return s;
  }
  return undefined;
}

function toNumberOr(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  const cleaned = String(value)
    .replace(/[^\d,.\-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Deriva información de almacén a partir del título de la hoja
 *
 * "TKC SUB 615" → { warehouse_code: "615", report_type: "SUB" }
 * "SUB 734"     → { warehouse_code: "734", report_type: "SUB" }
 */
function deriveWarehouseFromSheetTitle(sheetTitle) {
  if (!sheetTitle) return { warehouse_code: undefined, report_type: undefined };

  const title = String(sheetTitle);

  const warehouseMatch = title.match(/(\d{3,4})/);
  const warehouse_code = warehouseMatch ? warehouseMatch[1] : undefined;

  const typeMatch = title.match(/\b(SUB|INV|AP|LIV)\b/i);
  const report_type = typeMatch ? typeMatch[1].toUpperCase() : undefined;

  return { warehouse_code, report_type };
}

/* ================= Upsert ================= */

/**
 * Devuelve:
 *  - "inserted" si se creó un nuevo documento
 *  - "updated"  si ya existía y se modificó o se mantuvo igual
 *  - "duplicate" sólo se usa cuando replaceExisting = false
 */
async function upsertProduct(doc, { replaceExisting }) {
  if (replaceExisting) {
    // Usamos updateOne + upsert para poder leer matchedCount/upsertedCount
    const res = await Product.updateOne(
      { org_id: doc.org_id, product_code: doc.product_code },
      {
        $set: {
          ...doc,
          updated_at: new Date(),
        },
        $setOnInsert: {
          created_at: new Date(),
        },
      },
      { upsert: true },
    );

    if (res.upsertedCount && res.upsertedCount > 0) {
      return "inserted";
    }
    if (res.matchedCount && res.matchedCount > 0) {
      // Aunque modifiedCount sea 0 (mismos datos) lo consideramos "updated"
      return "updated";
    }
    // Caso rarísimo, pero por si acaso
    return "updated";
  }

  // Modo "no reemplazar": aquí sí contamos duplicados explícitamente
  const existing = await Product.findOne({
    org_id: doc.org_id,
    product_code: doc.product_code,
  });

  if (existing) {
    return "duplicate";
  }

  await Product.create(doc);
  return "inserted";
}

/* =============== Normalización → Product ================= */

function buildProductDocument(record, { orgId, source, userId }) {
  const product_code = toStringOrNull(record["Cód. Prod."]);
  const name = toStringOrNull(record.Nombre);
  const supplier_name = toStringOrNull(record.Suministrador);
  const idTienda = toStringOrNull(record.idTienda);
  const online_category = toStringOrNull(record["Categoría Online"]);
  const units_per_box = toStringOrNull(record["Unid./Alt."]) || "u";

  // ✅ Asignaciones corregidas
  const existencia_fisica = toNumberOr(record["Existencia fi"], 0);
  const reserva = toNumberOr(record["Almacén"], 0);
  const disponible_tienda = toNumberOr(record["Tienda"], 0);
  const price = toNumberOr(record["Precio"], 0);

  // ✅ El número de almacén correcto viene en columna L
  const warehouse_name = toStringOrNull(record["Alm."]) || "—";

  return {
    org_id: orgId,
    product_code,
    name,
    supplier_name,
    units_per_box,
    online_category,
    idTienda,

    existencia_fisica,
    reserva,
    disponible_tienda,
    price,

    warehouse_name,
    warehouse_code: warehouse_name,
    no_almacen: warehouse_name,

    status: "active",
    metadata: {
      imported_at: new Date(),
      source,
      import_user_id: userId,
    },
  };
}







/* =============== Pipeline de importación ================= */

export async function importProductsFromValues(
  values,
  {
    orgId,
    userId,
    replaceExisting = true,
    sheetTitle,
    source,
    parserOptions = {},
  },
) {
  try {
    const normalized = normalizeProductRows(values, {
      hasHeaders: parserOptions.hasHeaders !== false,
      headerOverride:
        parserOptions.headerOverride ||
        (parserOptions.hasHeaders === false
          ? PRODUCT_TEMPLATE_HEADERS
          : undefined),
      sheetTitle,
      deriveCategories: source === "google_sheet_all",
    });

    await connectDB();

    const stats = {
      total_rows: normalized.length,
      imported: 0,
      updated: 0,
      duplicates: 0,
      failed: 0,
      errors: [],
      preview: normalized.slice(0, MAX_PREVIEW_ROWS),
    };

    for (const record of normalized) {
      try {
        const doc = buildProductDocument(record, { orgId, source, userId });
        const outcome = await upsertProduct(doc, { replaceExisting });

        if (outcome === "inserted") stats.imported += 1;
        if (outcome === "updated") stats.updated += 1;
        if (outcome === "duplicate") stats.duplicates += 1;
      } catch (error) {
        stats.failed += 1;
        if (stats.errors.length < MAX_PREVIEW_ROWS) {
          stats.errors.push(error.message);
        }
      }
    }

    return stats;
  } catch (error) {
    if (error instanceof ImportValidationError) {
      throw error;
    }
    throw new Error(`No se pudo procesar el archivo: ${error.message}`);
  }
}

/* =============== Registro de Job de importación ================= */

export async function persistImportJob({
  orgId,
  userId,
  source,
  fileName,
  sheetName,
  sheetId,
  sheetCount,
  stats,
  meta = {},
}) {
  await connectDB();
  const job = await ImportJob.create({
    org_id: orgId,
    user_id: userId,
    type: "products",
    source,
    file_name: fileName,
    sheet_name: sheetName,
    sheet_id: sheetId,
    sheet_count: sheetCount,
    total_rows: stats.total_rows,
    imported: stats.imported,
    updated: stats.updated,
    duplicates: stats.duplicates,
    failed: stats.failed,
    errors: stats.errors,
    status: stats.failed > 0 ? "failed" : "completed",
    meta,
  });

  await AuditLog.create({
    org_id: orgId,
    user_id: userId,
    action: "imports.products",
    resource: "imports",
    resource_id: job._id.toString(),
    meta: {
      source,
      fileName,
      sheetName,
      sheetCount,
      stats,
    },
  });

  return job;
}
