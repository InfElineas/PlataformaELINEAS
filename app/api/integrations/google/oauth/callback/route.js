import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import {
  decodeState,
  exchangeCodeForTokens,
  isOAuthConfigured,
  storeUserGoogleTokens,
} from "@/lib/google/oauth";
import AuditLog from "@/lib/models/AuditLog";
import connectDB from "@/lib/mongodb";

export async function GET(request) {
  if (!isOAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Google OAuth no está disponible" },
      { status: 400 },
    );
  }

  const session = await requirePermission(request, null, { orgScoped: false });
  const currentUrl = new URL(request.url);
  const errorParam = currentUrl.searchParams.get("error");
  const code = currentUrl.searchParams.get("code");
  const state = currentUrl.searchParams.get("state");
  const redirectTarget = decodeState(state || "").redirect || "/imports";
  const redirectUrl = new URL(
    redirectTarget,
    `${currentUrl.protocol}//${currentUrl.host}`,
  );

  if (errorParam) {
    redirectUrl.searchParams.set("google_oauth", "error");
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    redirectUrl.searchParams.set("google_oauth", "error");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await storeUserGoogleTokens(session.user.id, tokens);
    await connectDB();
    await AuditLog.create({
      org_id: session.orgId,
      user_id: session.user.id,
      action: "integrations.google.connected",
      resource: "integrations",
      resource_id: session.user.id,
      meta: { scopes: tokens.scope },
    });
    redirectUrl.searchParams.set("google_oauth", "success");
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    redirectUrl.searchParams.set("google_oauth", "error");
    redirectUrl.searchParams.set("message", "No se pudo vincular Google");
    return NextResponse.redirect(redirectUrl);
  }
}
