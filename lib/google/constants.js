export const GOOGLE_BASE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_DRIVE_UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true";
export const GOOGLE_DRIVE_FILE_URL =
  "https://www.googleapis.com/drive/v3/files";
export const GOOGLE_SHEETS_BASE_URL =
  "https://sheets.googleapis.com/v4/spreadsheets";

export const GOOGLE_REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
];

export const GOOGLE_UPLOAD_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  ...GOOGLE_REQUIRED_SCOPES,
];

export const GOOGLE_OAUTH_SCOPES = [
  ...GOOGLE_UPLOAD_SCOPES,
  "https://www.googleapis.com/auth/userinfo.email",
];
