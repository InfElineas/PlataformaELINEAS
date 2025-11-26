import { randomUUID } from "crypto";
import {
  GOOGLE_DRIVE_UPLOAD_URL,
  GOOGLE_DRIVE_FILE_URL,
  GOOGLE_SHEETS_BASE_URL,
} from "@/lib/google/constants";
import { googleApiFetch } from "@/lib/google/api";

function buildMultipartBody({ metadata, buffer, boundary }) {
  const preamble = Buffer.from(
    `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n",
  );
  const closing = Buffer.from(`\r\n--${boundary}--`);
  return Buffer.concat([preamble, buffer, closing]);
}

export async function uploadAndConvertExcel(buffer, { token, fileName }) {
  const boundary = `sf-import-${randomUUID()}`;
  const metadata = {
    name: fileName || `import-${Date.now()}`,
    mimeType: "application/vnd.google-apps.spreadsheet",
  };
  const body = buildMultipartBody({ metadata, buffer, boundary });

  const data = await googleApiFetch(GOOGLE_DRIVE_UPLOAD_URL, {
    method: "POST",
    token,
    headers: {
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": body.length.toString(),
    },
    body,
  });

  return data;
}

export async function deleteDriveFile(fileId, token) {
  const url = `${GOOGLE_DRIVE_FILE_URL}/${fileId}?supportsAllDrives=true`;
  await googleApiFetch(url, {
    method: "DELETE",
    token,
    responseType: "text",
  }).catch(() => {});
}

export async function fetchSpreadsheetMetadata(fileId, token) {
  const url = `${GOOGLE_SHEETS_BASE_URL}/${fileId}?fields=sheets.properties`;
  return googleApiFetch(url, { token });
}
