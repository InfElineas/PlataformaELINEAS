import { NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/lib/auth";
import { resolveGoogleAccessToken } from "@/lib/google/access-token";
import { listWorksheetSummaries } from "@/lib/google/sheets";
import { extractGoogleFileId, parseBoolean } from "@/lib/imports/utils";

export async function GET(request) {
  try {
    const session = await requirePermission(
      request,
      PERMISSIONS.IMPORTS_MANAGE,
    );
    const { searchParams } = new URL(request.url);
    const rawId =
      searchParams.get("fileId") || searchParams.get("spreadsheetId") || "";
    const fileId = extractGoogleFileId(rawId);
    const preferOAuth = parseBoolean(searchParams.get("useOAuth"), false);

    if (!fileId) {
      return NextResponse.json(
        { ok: false, error: "Debes indicar un archivo de Google" },
        { status: 400 },
      );
    }

    const { token } = await resolveGoogleAccessToken({
      userId: session.user.id,
      preferOAuth,
    });
    const sheets = await listWorksheetSummaries(fileId, token);

    return NextResponse.json({ ok: true, sheets });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }
}
