import { NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/lib/auth";
import { resolveGoogleAccessToken } from "@/lib/google/access-token";
import { valuesFromExcelBuffer } from "@/lib/imports/google-source";
import {
  importProductsFromValues,
  persistImportJob,
} from "@/lib/imports/products";
import { ImportValidationError } from "@/lib/imports/errors";
import { parseBoolean } from "@/lib/imports/utils";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const session = await requirePermission(
      request,
      PERMISSIONS.IMPORTS_MANAGE,
    );
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { ok: false, error: "Debes adjuntar un archivo .xlsx" },
        { status: 400 },
      );
    }

    const sheetName = formData.get("sheetName")?.toString().trim() || undefined;
    const replaceExisting = parseBoolean(formData.get("replaceExisting"), true);
    const structure = formData.get("structure")?.toString() || "header";
    const authMode = formData.get("authMode")?.toString() || "service";

    const buffer = Buffer.from(await file.arrayBuffer());
    const preferOAuth = authMode === "oauth";

    const { token, mode } = await resolveGoogleAccessToken({
      userId: session.user.id,
      preferOAuth,
      requireUpload: true,
    });

    const { sheet, values } = await valuesFromExcelBuffer(buffer, {
      token,
      fileName: file.name,
      sheetName,
    });

    const stats = await importProductsFromValues(values, {
      orgId: session.orgId,
      userId: session.user.id,
      replaceExisting,
      sheetTitle: sheet.title,
      source: "excel_upload",
      parserOptions: { hasHeaders: structure !== "fixed" },
    });

    const job = await persistImportJob({
      orgId: session.orgId,
      userId: session.user.id,
      source: "excel_upload",
      fileName: file.name,
      sheetName: sheet.title,
      sheetId: sheet.id?.toString(),
      sheetCount: 1,
      stats,
      meta: { authMode: mode },
    });

    return NextResponse.json({ ok: true, stats, jobId: job._id.toString() });
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
