// Lectura de Gmail con OAuth2 de TU cuenta (solo lectura).
// Si existe GMAIL_CLIENT_ID, Gmail usa su propio cliente OAuth
// (GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN), separado del de Drive.
// Si no, usa el cliente de Drive (GOOGLE_CLIENT_ID/SECRET) con GMAIL_REFRESH_TOKEN,
// o el mismo GOOGLE_REFRESH_TOKEN (sirve solo si al generarlo se marcó el scope de Gmail).
import { google } from "googleapis";
import { extractBody, limaDate, type EmailForParsing } from "./cardEmails";

export class GmailConfigError extends Error {}

// Un solo cliente por instancia: así el token de acceso se renueva una vez
// y se reutiliza para todos los correos de la sincronización.
let cached: ReturnType<typeof google.gmail> | null = null;

function getGmail() {
  if (cached) return cached;
  const env = process.env;
  // Un refresh token solo sirve con el cliente que lo generó: con cliente propio
  // de Gmail no se recurre al token de Drive.
  const ownClient = !!env.GMAIL_CLIENT_ID;
  const clientId = ownClient ? env.GMAIL_CLIENT_ID : env.GOOGLE_CLIENT_ID;
  const clientSecret = ownClient ? env.GMAIL_CLIENT_SECRET : env.GOOGLE_CLIENT_SECRET;
  const refreshToken = ownClient
    ? env.GMAIL_REFRESH_TOKEN
    : env.GMAIL_REFRESH_TOKEN || env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new GmailConfigError("Credenciales de Gmail no configuradas");
  }
  const client = new google.auth.OAuth2(clientId, clientSecret);
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
