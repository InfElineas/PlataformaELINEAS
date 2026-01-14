import { GOOGLE_SHEETS_BASE_URL } from "@/lib/google/constants";
import { googleApiFetch } from "@/lib/google/api";

export async function listWorksheetSummaries(fileId, token) {
  const url = `${GOOGLE_SHEETS_BASE_URL}/${fileId}?fields=sheets.properties`;
  const data = await googleApiFetch(url, { token });
  return (data.sheets || []).map((sheet) => ({
    id: sheet.properties.sheetId,
    title: sheet.properties.title,
    index: sheet.properties.index,
    rowCount: sheet.properties.gridProperties?.rowCount || 0,
    columnCount: sheet.properties.gridProperties?.columnCount || 0,
  }));
}

export async function readSheetValues({
  fileId,
  sheetName,
  token,
  includeHeaders = true,
}) {
  const encodedSheet = encodeURIComponent(sheetName);
  const range = `${encodedSheet}!A:ZZ`;
  const url = `${GOOGLE_SHEETS_BASE_URL}/${fileId}/values/${range}?majorDimension=ROWS`;
  const data = await googleApiFetch(url, { token });
  const values = data.values || [];
  if (!includeHeaders) {
    return values;
  }
  return values;
}

export async function readAllSheetValues({ fileId, token }) {
  const sheets = await listWorksheetSummaries(fileId, token);
  const results = [];
  for (const sheet of sheets) {
    const values = await readSheetValues({
      fileId,
      sheetName: sheet.title,
      token,
    });
    results.push({ sheet, values });
  }
  return results;
}
