// Cliente de Google Drive usando OAuth2 + refresh token de TU cuenta.
// (Una cuenta de servicio NO tiene los 15 GB de tu Drive personal; por eso OAuth2.)
// Mismo patrón que tu otro proyecto Next.js que ya sube a Drive.
import { google } from "googleapis";
import { Readable } from "node:stream";
import fs from "node:fs";
import path from "node:path";

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

// In-memory cache for ultra-fast serving (0ms)
interface CachedImg {
  data: Buffer;
  mimeType: string;
}
const memoryCache = new Map<string, CachedImg>();

// Local filesystem cache directory for persistent speed across restarts
const CACHE_DIR = path.join(process.cwd(), ".cache", "comprobantes");
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch {
  // Ignorar si no se puede crear en entornos restringidos
}

function getDiskCache(fileId: string): CachedImg | null {
  try {
    const metaPath = path.join(CACHE_DIR, `${fileId}.json`);
    const binPath = path.join(CACHE_DIR, `${fileId}.bin`);
    if (fs.existsSync(metaPath) && fs.existsSync(binPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      const data = fs.readFileSync(binPath);
      return { data, mimeType: meta.mimeType || "image/jpeg" };
    }
  } catch {
    // Si hay error de lectura, saltar a red
  }
  return null;
}

function setDiskCache(fileId: string, item: CachedImg): void {
  try {
    const metaPath = path.join(CACHE_DIR, `${fileId}.json`);
    const binPath = path.join(CACHE_DIR, `${fileId}.bin`);
    fs.writeFileSync(metaPath, JSON.stringify({ mimeType: item.mimeType }));
    fs.writeFileSync(binPath, item.data);
  } catch {
    // Ignorar si falla escritura en disco
  }
}

function removeDiskCache(fileId: string): void {
  try {
    const metaPath = path.join(CACHE_DIR, `${fileId}.json`);
    const binPath = path.join(CACHE_DIR, `${fileId}.bin`);
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
    if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
  } catch {
    // Ignorar
  }
}

/** Borra un archivo de Drive por su id y limpia caché. */
export async function deleteImage(fileId: string): Promise<void> {
  memoryCache.delete(fileId);
  removeDiskCache(fileId);
  const drive = getDrive();
  await drive.files.delete({ fileId });
}

/** Descarga los bytes de un archivo de Drive para servirlo como imagen con caché multinivel. */
export async function fetchImage(
  fileId: string
): Promise<{ data: Buffer; mimeType: string }> {
  // 1. Memoria RAM (0ms)
  const inMem = memoryCache.get(fileId);
  if (inMem) return inMem;

  // 2. Disco local (~1ms)
  const onDisk = getDiskCache(fileId);
  if (onDisk) {
    memoryCache.set(fileId, onDisk);
    return onDisk;
  }

  // 3. Google Drive con llamadas en paralelo (corta la latencia a la mitad)
  const drive = getDrive();
  const [metaRes, mediaRes] = await Promise.all([
    drive.files.get({ fileId, fields: "mimeType" }).catch(() => null),
    drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    ),
  ]);

  const mimeType =
    metaRes?.data?.mimeType ||
    (mediaRes.headers && (mediaRes.headers["content-type"] as string)) ||
    "image/jpeg";
  const data = Buffer.from(mediaRes.data as ArrayBuffer);
  const result: CachedImg = { data, mimeType };

  // Guardar en memoria (máximo 150 comprobantes)
  if (memoryCache.size >= 150) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(fileId, result);
  setDiskCache(fileId, result);

  return result;
}
