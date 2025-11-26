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
    const session = await requirePermission(
      request,
      PERMISSIONS.IMPORTS_MANAGE,
    );
    const body = await request.json();
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

    const { token, mode: authMode } = await resolveGoogleAccessToken({
      userId: session.user.id,
      preferOAuth,
      requireUpload: false,
    });

    const sheets = await valuesFromGoogleSheet({
      fileId,
      token,
      sheetName,
      includeAll: mode === "all",
    });

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
    if (error instanceof ImportValidationError) {
      return NextResponse.json(
        { ok: false, error: error.message, details: error.details },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }
}
