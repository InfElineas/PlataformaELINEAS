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

async function upsertProduct(doc, { replaceExisting }) {
  if (replaceExisting) {
    const result = await Product.findOneAndUpdate(
      { org_id: doc.org_id, product_code: doc.product_code },
      { ...doc, updated_at: new Date() },
      { new: true, upsert: true, rawResult: true, setDefaultsOnInsert: true },
    );
    const wasUpdate = result.lastErrorObject?.updatedExisting;
    return wasUpdate ? "updated" : "inserted";
  }

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

function buildProductDocument(record, { orgId, source, userId }) {
  const categoryTokens = [];
  if (record.online_category) {
    categoryTokens.push(
      ...record.online_category
        .split(/[>\\/]/)
        .map((token) => token.trim())
        .filter(Boolean),
    );
  }
  if (record.derived_categories?.length) {
    categoryTokens.push(...record.derived_categories);
  }

  return {
    org_id: orgId,
    product_code: record.product_code,
    name: record.name,
    supplier_name: record.supplier_name,
    supplier_id: record.supplier_name,
    provider_id: record.supplier_name,
    units_per_box: record.units_per_box,
    physical_stock: record.physical_stock,
    price: record.price,
    idTienda: record.store_external_id,
    store_external_id: record.store_external_id,
    store_name: record.store_name,
    warehouse_name: record.warehouse_name,
    online_category: record.online_category,
    category_path: categoryTokens,
    status: "active",
    metadata: {
      category_aux: record.category_aux,
      sheet_title: record.sheet_title,
      derived_categories: record.derived_categories,
      source,
      import_user_id: userId,
      imported_at: new Date(),
    },
  };
}

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
