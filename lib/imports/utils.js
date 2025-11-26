import {
  PRODUCT_FIELD_ALIASES,
  PRODUCT_TEMPLATE_HEADERS,
} from "@/lib/imports/constants";

const aliasMap = new Map();
for (const [key, aliases] of Object.entries(PRODUCT_FIELD_ALIASES)) {
  aliases.forEach((alias) => {
    aliasMap.set(normalizeHeader(alias), key);
  });
}

export function normalizeHeader(value = "") {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function resolveFieldFromHeader(header) {
  const normalized = normalizeHeader(header);
  return aliasMap.get(normalized) || null;
}

export function ensureTemplateHeaders() {
  return [...PRODUCT_TEMPLATE_HEADERS];
}

export function extractGoogleFileId(input = "") {
  if (!input) return "";
  const trimmed = input.trim();
  const directMatch = trimmed.match(/[-\w]{25,}/);
  if (directMatch) {
    return directMatch[0];
  }
  try {
    const url = new URL(trimmed);
    const pathMatch = url.pathname.match(/[-\w]{25,}/);
    if (pathMatch) return pathMatch[0];
  } catch (error) {
    // ignore
  }
  return trimmed;
}

export function parseBoolean(value, defaultValue = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "si"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return defaultValue;
}

export function deriveCategoriesFromSheetTitle(title = "") {
  if (!title) return [];
  return title
    .split(/[-|–|—|:|>/]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function sanitizeNumber(value, { allowFloat = false } = {}) {
  if (value === null || value === undefined) return null;
  const raw = value.toString().trim();
  if (!raw) return null;
  let normalized = raw.replace(/[^0-9,.-]/g, "");
  if (!normalized) return null;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");
  if (hasComma && hasDot) {
    normalized = normalized.replace(/,/g, "");
  } else if (hasComma && !hasDot) {
    normalized = normalized.replace(/,/g, ".");
  }
  const parsed = allowFloat ? parseFloat(normalized) : parseInt(normalized, 10);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}
