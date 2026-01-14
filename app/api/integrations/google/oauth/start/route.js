import { NextResponse } from "next/server";
import { requirePermission, PERMISSIONS } from "@/lib/auth";
import { buildOAuthConsentUrl, isOAuthConfigured } from "@/lib/google/oauth";

export async function GET(request) {
  if (!isOAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Google OAuth no está configurado en el entorno" },
      { status: 400 },
    );
  }

  await requirePermission(request, PERMISSIONS.IMPORTS_MANAGE, {
    orgScoped: false,
  });
  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get("redirect") || "/imports";

  const consentUrl = buildOAuthConsentUrl({ redirect });
  return NextResponse.json({ ok: true, url: consentUrl });
}
