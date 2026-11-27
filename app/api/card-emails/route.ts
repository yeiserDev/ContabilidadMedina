// POST /api/card-emails → lee los correos de notificación del banco en Gmail
// y devuelve los movimientos de la tarjeta de crédito ya interpretados.
// No usa IA: lib/scotiabankParser.ts reconoce el formato fijo de cada aviso.
// No guarda nada: la app decide qué importar (y evita duplicados por emailId).
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { verifyEmailUser } from "@/lib/verifyToken";
import { corsHeaders } from "@/lib/cors";
import { listMessageIds, getEmail, GmailConfigError } from "@/lib/gmail";
import { buildQuery, isValidDate, limaDate, normalizeMovement, type CardMovement, type EmailForParsing } from "@/lib/cardEmails";
import { parseScotiabankEmail, SHORTCUT_SUBJECT } from "@/lib/scotiabankParser";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH = 25; // correos leídos de Gmail por llamada
const DAY = 86_400_000;

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/** Error de OAuth que devuelve Google (invalid_client, invalid_grant…), sin datos sensibles. */
function oauthError(error: unknown): string {
  const e = error as { message?: string; response?: { data?: { error?: unknown } } };
  const fromBody = e?.response?.data?.error;
  if (typeof fromBody === "string") return fromBody;
  const m = /\b(invalid_client|unauthorized_client|invalid_grant|invalid_scope)\b/.exec(String(e?.message || ""));
  return m ? m[1] : "";
}

function gmailErrorCode(error: unknown): string {
  const e = error as { code?: number | string; status?: number; response?: { status?: number } };
  const status = Number(e?.response?.status ?? e?.status ?? e?.code);
  const oauth = oauthError(error);
  // El cliente (ID/secret) no coincide con el que generó el token, o el secret está inhabilitado.
  if (oauth === "invalid_client" || oauth === "unauthorized_client") return "GMAIL_CLIENT";
  if (oauth === "invalid_grant" || status === 401) return "GMAIL_AUTH";
  if (status === 403 || oauth === "invalid_scope") return "GMAIL_SCOPE";
  if (status === 429) return "GMAIL_QUOTA";
  return "GMAIL_UNAVAILABLE";
}

const GMAIL_MESSAGES: Record<string, string> = {
  GMAIL_CONFIG: "Falta configurar el acceso a Gmail en el servidor.",
  GMAIL_CLIENT: "Google rechazó el cliente de Gmail: GMAIL_CLIENT_ID o GMAIL_CLIENT_SECRET no coinciden con los que generaron el token (o el secret está inhabilitado).",
  GMAIL_AUTH: "Google rechazó el token de Gmail: está incompleto, es de otro cliente o fue revocado. Genera uno nuevo.",
  GMAIL_SCOPE: "El token no tiene permiso para leer Gmail o la API de Gmail no está activada.",
  GMAIL_QUOTA: "Gmail limitó las consultas por un momento. Intenta en unos minutos.",
  GMAIL_UNAVAILABLE: "No se pudo leer Gmail en este momento.",
};

export async function POST(req: NextRequest) {
  const requestId = randomUUID().slice(0, 8);
  const headers = { ...corsHeaders(req), "Cache-Control": "no-store", "X-Request-Id": requestId };
  const reply = (error: string, status: number, code: string) => {
    if (status >= 500 || status === 429) console.warn("card_emails", { requestId, code, status });
    return NextResponse.json({ error, code, requestId }, { status, headers });
  };

  const user = await verifyEmailUser(req.headers.get("authorization"));
  if (!user) return reply("Inicia sesión para leer tus correos.", 401, "UNAUTHORIZED");
  // Los correos del banco son privados: si se definió una lista, solo esas cuentas.
  const allowed = (process.env.CARD_ALLOWED_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (allowed.length && !allowed.includes(String(user.email || "").toLowerCase())) {
    // Se muestra el correo de la propia sesión para saber qué poner en CARD_ALLOWED_EMAILS.
    return reply(`Tu usuario (${user.email || "sin correo"}) no está en CARD_ALLOWED_EMAILS.`, 403, "FORBIDDEN");
  }
  let body: { since?: unknown; skip?: unknown; last4?: unknown };
  try { body = await req.json(); } catch { body = {}; }
  const today = limaDate(Date.now());
  const oldest = limaDate(Date.now() - 180 * DAY);
  let since = isValidDate(body.since) ? body.since : limaDate(Date.now() - 45 * DAY);
  if (since < oldest) since = oldest;
  if (since > today) since = today;
  const skip = new Set(Array.isArray(body.skip) ? body.skip.filter((v): v is string => typeof v === "string").slice(0, 2000) : []);
  const sender = process.env.CARD_EMAIL_SENDER?.trim() || "scotiabank.com.pe";
  // Con los últimos 4 dígitos solo se aceptan movimientos de esa tarjeta.
  const last4 = typeof body.last4 === "string" && /^\d{4}$/.test(body.last4) ? body.last4 : null;
  // Los Plin, transferencias y avisos de visualización son la mayoría de los
  // correos del banco y nunca son de la tarjeta: Gmail ni los devuelve.
  // También entran los correos del atajo de Apple Pay del iPhone (por su asunto).
  const query = `${buildQuery(sender, since, SHORTCUT_SUBJECT)} -subject:Plin -subject:"Transferencia a otro banco" -subject:Visualización -subject:"Configuración de tarjetas"`;

  // 1. Gmail
  let emails: EmailForParsing[];
  let hasMore: boolean;
  let remaining = 0;
  try {
    const ids = (await listMessageIds(query, 1000)).filter((id) => !skip.has(id));
    hasMore = ids.length > BATCH;
    remaining = Math.max(0, ids.length - BATCH);
    emails = await Promise.all(ids.slice(0, BATCH).map(getEmail));
  } catch (error) {
    const code = error instanceof GmailConfigError ? "GMAIL_CONFIG" : gmailErrorCode(error);
    console.warn("card_emails_gmail", { requestId, code, oauth: oauthError(error) });
    return reply(GMAIL_MESSAGES[code], code === "GMAIL_CONFIG" ? 503 : code === "GMAIL_QUOTA" ? 429 : 502, code);
  }
  const processed = emails.map((e) => e.id);

  // 2. Cada aviso se interpreta por su formato; todo se vuelve a validar igual.
  let movements: CardMovement[] = [];
  const ignored: Record<string, number> = {};
  for (const email of emails) {
    const result = parseScotiabankEmail(email, last4);
    if (result.status === "ignored") { ignored[result.reason] = (ignored[result.reason] || 0) + 1; continue; }
    const movement = normalizeMovement(result.movement, email, today);
    if (movement) movements.push(movement);
  }
  movements = movements.sort((a, b) => a.date.localeCompare(b.date));
  return NextResponse.json({ movements, processed, hasMore, remaining, since, ignored }, { headers });
}
