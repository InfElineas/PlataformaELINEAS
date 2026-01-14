import connectDB from "@/lib/mongodb";
import User from "@/lib/models/User";
import {
  GOOGLE_BASE_TOKEN_URL,
  GOOGLE_OAUTH_SCOPES,
} from "@/lib/google/constants";

function oauthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }
  return { clientId, clientSecret, redirectUri };
}

export function isOAuthConfigured() {
  return Boolean(oauthConfig());
}

function encodeState(state) {
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

function decodeState(state) {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch (error) {
    return {};
  }
}

export function buildOAuthConsentUrl({ redirect = "/imports" } = {}) {
  const config = oauthConfig();
  if (!config) {
    throw new Error("Google OAuth client is not configured");
  }
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_OAUTH_SCOPES.join(" "),
    state: encodeState({ redirect }),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeToken(body) {
  const response = await fetch(GOOGLE_BASE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Google OAuth token exchange failed (${response.status}): ${text}`,
    );
  }
  return JSON.parse(text);
}

export async function exchangeCodeForTokens(code) {
  const config = oauthConfig();
  if (!config) {
    throw new Error("Google OAuth client is not configured");
  }
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });
  return exchangeToken(body);
}

export async function refreshOAuthTokens(refreshToken) {
  const config = oauthConfig();
  if (!config) {
    throw new Error("Google OAuth client is not configured");
  }
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  return exchangeToken(body);
}

export async function storeUserGoogleTokens(userId, tokens) {
  await connectDB();
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found for Google tokens");
  }
  user.integrations = user.integrations || {};
  user.integrations.google = {
    refresh_token:
      tokens.refresh_token || user.integrations?.google?.refresh_token,
    access_token: tokens.access_token,
    token_type: tokens.token_type,
    scope: tokens.scope,
    expiry_date:
      tokens.expiry_date ||
      (tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null),
    connected_at: new Date(),
  };
  await user.save();
  return user.integrations.google;
}

export async function deleteUserGoogleTokens(userId) {
  await connectDB();
  await User.updateOne(
    { _id: userId },
    { $unset: { "integrations.google": "" } },
  );
}

export async function getUserGoogleIntegration(userId) {
  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) return null;
  return user.integrations?.google || null;
}

export async function ensureUserAccessToken(userId) {
  const integration = await getUserGoogleIntegration(userId);
  if (!integration?.refresh_token) {
    return null;
  }
  if (
    integration.access_token &&
    integration.expiry_date &&
    integration.expiry_date > Date.now() + 60000
  ) {
    return integration.access_token;
  }
  const refreshed = await refreshOAuthTokens(integration.refresh_token);
  const merged = {
    refresh_token: integration.refresh_token,
    access_token: refreshed.access_token,
    token_type: refreshed.token_type,
    scope: refreshed.scope || integration.scope,
    expiry_date: Date.now() + (refreshed.expires_in - 60) * 1000,
  };
  await storeUserGoogleTokens(userId, merged);
  return merged.access_token;
}

export { decodeState };
