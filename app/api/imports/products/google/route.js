import { NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/lib/auth";
import { resolveGoogleAccessToken } from "@/lib/google/access-token";
import { valuesFromGoogleSheet } from "@/lib/imports/google-source";
import {
  importProductsFromValues,
  persistImportJob,
} from "@/lib/imports/products";
import { ImportValidationError } from "@/lib/imports/errors";
import { extractGoogleFileId, parseBoolean } from "@/lib/imports/utils";
import { MAX_PREVIEW_ROWS } from "@/lib/imports/constants";

export const runtime = "nodejs";

/**
 * Acumula stats de varias hojas en un solo objeto
 */
function mergeStats(target, source) {
  target.total_rows += source.total_rows;
  target.imported += source.imported;
  target.updated += source.updated;
  target.duplicates += source.duplicates;
  target.failed += source.failed;

  if (source.errors?.length) {
    target.errors.push(...source.errors);
  }

  if (target.preview.length < MAX_PREVIEW_ROWS) {
    target.preview.push(
      ...source.preview.slice(0, MAX_PREVIEW_ROWS - target.preview.length),
    );
  }

  return target;
}

export async function POST(request) {
  try {
    // 1) Seguridad: permiso para gestionar importaciones
    const session = await requirePermission(
      request,
      PERMISSIONS.IMPORTS_MANAGE,
    );

    // 2) Body
    const body = await request.json().catch(() => ({}));

    const fileId = extractGoogleFileId(body.fileId || body.spreadsheetId || "");

    if (!fileId) {
      return NextResponse.json(
        { ok: false, error: "Debes indicar el ID o URL del documento" },
        { status: 400 },
      );
    }

    const sheetName = body.sheetName?.trim();
    const mode = body.mode === "all" ? "all" : "single";
    const replaceExisting = parseBoolean(body.replaceExisting, true);
    const structure = body.structure === "fixed" ? "fixed" : "header";
    const preferOAuth = parseBoolean(body.useOAuth, false);

    // 3) Resolver token (OAuth usuario o Service Account)
    const { token, mode: authMode } = await resolveGoogleAccessToken({
      userId: session.user.id,
      preferOAuth,
      requireUpload: false,
    });

    // 4) Leer valores de la(s) hoja(s)
    const sheets = await valuesFromGoogleSheet({
      fileId,
      token,
      sheetName,
      includeAll: mode === "all",
    });

    if (!sheets.length) {
      return NextResponse.json(
        { ok: false, error: "No se encontraron hojas para importar" },
        { status: 400 },
      );
    }

    // 5) Stats agregados
    const aggregated = {
      total_rows: 0,
      imported: 0,
      updated: 0,
      duplicates: 0,
      failed: 0,
      errors: [],
      preview: [],
    };

    for (const entry of sheets) {
      const stats = await importProductsFromValues(entry.values, {
        orgId: session.orgId,
        userId: session.user.id,
        replaceExisting,
        sheetTitle: entry.sheet.title,
        source: mode === "all" ? "google_sheet_all" : "google_sheet",
        parserOptions: { hasHeaders: structure !== "fixed" },
      });

      mergeStats(aggregated, stats);
    }

    // 6) Registrar job de importación
    const job = await persistImportJob({
      orgId: session.orgId,
      userId: session.user.id,
      source: mode === "all" ? "google_sheet_all" : "google_sheet",
      fileName: fileId,
      sheetName: mode === "single" ? sheetName : undefined,
      sheetId: fileId,
      sheetCount: sheets.length,
      stats: aggregated,
      meta: { authMode, fileId },
    });

    return NextResponse.json({
      ok: true,
      stats: aggregated,
      jobId: job._id.toString(),
    });
  } catch (error) {
    // Errores de validación de importación (faltan columnas, filas malas, etc.)
    if (error instanceof ImportValidationError) {
      console.error("[IMPORT GOOGLE] Validation error:", error.details);
      return NextResponse.json(
        { ok: false, error: error.message, details: error.details },
        { status: 400 },
      );
    }

    // Errores inesperados
    console.error("[IMPORT GOOGLE] Unexpected error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Error inesperado al importar productos desde Google",
      },
      { status: 500 },
    );
  }
}
