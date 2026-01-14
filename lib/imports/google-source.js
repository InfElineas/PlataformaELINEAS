import { uploadAndConvertExcel, deleteDriveFile } from "@/lib/google/drive";
import {
  listWorksheetSummaries,
  readSheetValues,
  readAllSheetValues,
} from "@/lib/google/sheets";

export async function valuesFromExcelBuffer(
  buffer,
  { token, fileName, sheetName },
) {
  const upload = await uploadAndConvertExcel(buffer, { token, fileName });
  const spreadsheetId = upload.id;
  let sheets;
  let targetSheet;
  try {
    sheets = await listWorksheetSummaries(spreadsheetId, token);
    if (!sheets.length) {
      throw new Error("El archivo no contiene hojas");
    }
    if (sheetName) {
      targetSheet = sheets.find((sheet) => sheet.title === sheetName);
      if (!targetSheet) {
        throw new Error(`No se encontró la hoja ${sheetName}`);
      }
    } else {
      targetSheet = sheets[0];
    }
    const values = await readSheetValues({
      fileId: spreadsheetId,
      sheetName: targetSheet.title,
      token,
    });
    return { spreadsheetId, sheet: targetSheet, values };
  } finally {
    if (spreadsheetId) {
      await deleteDriveFile(spreadsheetId, token);
    }
  }
}

export async function valuesFromGoogleSheet({
  fileId,
  token,
  sheetName,
  includeAll = false,
}) {
  if (includeAll) {
    const all = await readAllSheetValues({ fileId, token });
    if (!all.length) {
      throw new Error("La hoja no contiene datos");
    }
    return all;
  }
  if (!sheetName) {
    throw new Error("Debes indicar una hoja específica");
  }
  const values = await readSheetValues({ fileId, sheetName, token });
  return [{ sheet: { title: sheetName }, values }];
}
