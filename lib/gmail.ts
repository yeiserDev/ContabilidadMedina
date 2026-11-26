// Lectura de Gmail con OAuth2 de TU cuenta (solo lectura).
// Usa GMAIL_REFRESH_TOKEN si existe; si no, el mismo GOOGLE_REFRESH_TOKEN de
// Drive (sirve solo si al generarlo también se marcó el scope de Gmail).
import { google } from "googleapis";
import { extractBody, limaDate, type EmailForParsing } from "./cardEmails";

export class GmailConfigError extends Error {}

// Un solo cliente por instancia: así el token de acceso se renueva una vez
// y se reutiliza para todos los correos de la sincronización.
let cached: ReturnType<typeof google.gmail> | null = null;

function getGmail() {
  if (cached) return cached;
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !refreshToken) {
    throw new GmailConfigError("Credenciales de Gmail no configuradas");
  }
  const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: refreshToken });
  cached = google.gmail({ version: "v1", auth: client });
  return cached;
}

/** Ids de los correos que cumplen la búsqueda, del más nuevo al más viejo. */
export async function listMessageIds(query: string, max: number): Promise<string[]> {
  const res = await getGmail().users.messages.list({ userId: "me", q: query, maxResults: max });
  return (res.data.messages || []).map((m) => m.id).filter((id): id is string => !!id);
}

export async function getEmail(id: string): Promise<EmailForParsing> {
  const res = await getGmail().users.messages.get({ userId: "me", id, format: "full" });
  const headers = res.data.payload?.headers || [];
  const header = (name: string) => headers.find((h) => h.name?.toLowerCase() === name)?.value || "";
  const ms = Number(res.data.internalDate) || Date.now();
  return {
    id,
    subject: header("subject").slice(0, 200),
    from: header("from").slice(0, 200),
    receivedDate: limaDate(ms),
    text: extractBody(res.data.payload).slice(0, 4000),
  };
}
