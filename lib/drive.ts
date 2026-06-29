// Cliente de Google Drive usando OAuth2 + refresh token de TU cuenta.
// (Una cuenta de servicio NO tiene los 15 GB de tu Drive personal; por eso OAuth2.)
// Mismo patrón que tu otro proyecto Next.js que ya sube a Drive.
import { google } from "googleapis";
import { Readable } from "node:stream";

function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } =
    process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Credenciales de Google Drive no configuradas");
  }
  const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return client;
}

function getDrive() {
  return google.drive({ version: "v3", auth: getOAuthClient() });
}

/** Sube un buffer de imagen a la carpeta configurada y devuelve el fileId. */
export async function uploadImage(
  buffer: Buffer,
  mimeType: string,
  name: string
): Promise<string> {
  const drive = getDrive();
  const folderId = process.env.DRIVE_FOLDER_ID;
  const res = await drive.files.create({
    requestBody: {
      name,
      ...(folderId ? { parents: [folderId] } : {}),
    },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id",
  });
  if (!res.data.id) throw new Error("Drive no devolvió un id");
  return res.data.id;
}

/** Borra un archivo de Drive por su id. */
export async function deleteImage(fileId: string): Promise<void> {
  const drive = getDrive();
  await drive.files.delete({ fileId });
}

/** Descarga los bytes de un archivo de Drive para servirlo como imagen. */
export async function fetchImage(
  fileId: string
): Promise<{ data: Buffer; mimeType: string }> {
  const drive = getDrive();
  const meta = await drive.files.get({ fileId, fields: "mimeType" });
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return {
    data: Buffer.from(res.data as ArrayBuffer),
    mimeType: meta.data.mimeType || "image/jpeg",
  };
}
