// Utilidades puras para convertir correos del banco en movimientos de tarjeta.
// No hablan con Gmail ni con Gemini: así se pueden probar sin red.

export const MOVEMENT_KINDS = ["consumo", "pago", "abono", "ninguno"] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];

export interface EmailForParsing {
  id: string;
  subject: string;
  from: string;
  receivedDate: string; // YYYY-MM-DD en hora de Lima
  text: string;
}

export interface CardMovement {
  emailId: string;
  kind: Exclude<MovementKind, "ninguno">;
  amount: number;
  currency: "PEN" | "USD";
  date: string;
  merchant: string;
  last4: string | null;
  installments: number | null;
  exchangeRate: number | null; // S/ por US$ si el correo lo indica
  needsReview: boolean;
  note: string;
}

const ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  ntilde: "ñ", Ntilde: "Ñ", uuml: "ü", Uuml: "Ü", iexcl: "¡", iquest: "¿",
  deg: "°", ordm: "º", ordf: "ª", euro: "€", bull: "•", middot: "·",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : all;
    }
    return ENTITIES[code] ?? all;
  });
}

/** Convierte el HTML de un correo en texto plano legible, conservando filas. */
export function htmlToText(html: string): string {
  const text = html
    .replace(/<(style|script|head|title)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " | ")
    .replace(/<[^>]+>/g, " ");
  return normalizeSpace(decodeEntities(text));
}

export function normalizeSpace(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/(\s*\|\s*)+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface GmailPart {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: GmailPart[] | null;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

/** Extrae el cuerpo de un mensaje de Gmail: prefiere HTML (trae las tablas del banco). */
export function extractBody(payload: GmailPart | null | undefined): string {
  let html = "";
  let plain = "";
  const walk = (part: GmailPart | null | undefined) => {
    if (!part) return;
    const data = part.body?.data;
    if (data && part.mimeType === "text/html" && !html) html = decodeBase64Url(data);
    else if (data && part.mimeType === "text/plain" && !plain) plain = decodeBase64Url(data);
    for (const child of part.parts || []) walk(child);
  };
  walk(payload);
  if (html) return htmlToText(html);
  return normalizeSpace(plain);
}

/** Descarta rápido correos sin montos (promociones, avisos) antes de pagar por leerlos. */
export function looksLikeMovement(text: string): boolean {
  return /(S\/\.?|US\$|\$|PEN|USD|soles|d[oó]lares)\s*\d/i.test(text);
}

/** Fecha YYYY-MM-DD en hora de Lima (UTC-5, sin horario de verano). */
export function limaDate(ms: number): string {
  return new Date(ms - 5 * 3600_000).toISOString().slice(0, 10);
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const t = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === value;
}

/** Búsqueda de Gmail: remitente configurable y correos desde una fecha. */
export function buildQuery(sender: string, since: string): string {
  const [y, m, d] = since.split("-");
  return `from:(${sender}) after:${y}/${m}/${d}`;
}

/**
 * Valida lo que devolvió el modelo. Todo lo dudoso se marca para revisión;
 * lo que no es un movimiento de tarjeta (o no tiene monto) se descarta.
 */
export function normalizeMovement(raw: unknown, email: EmailForParsing, today: string): CardMovement | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const kind = MOVEMENT_KINDS.includes(r.kind as MovementKind) ? (r.kind as MovementKind) : "ninguno";
  if (kind === "ninguno") return null;
  const amount = typeof r.amount === "number" && Number.isFinite(r.amount) && r.amount > 0 && r.amount < 1e8
    ? Math.round(r.amount * 100) / 100 : null;
  if (amount === null) return null;
  const currencyRaw = typeof r.currency === "string" ? r.currency.trim().toUpperCase() : "";
  const currency = currencyRaw === "USD" ? "USD" : "PEN";
  // Una fecha imposible o futura vuelve a la del correo, y se revisa.
  const dateOk = isValidDate(r.date) && r.date <= today;
  const date = dateOk ? (r.date as string) : email.receivedDate;
  const merchant = typeof r.merchant === "string" ? r.merchant.replace(/\s+/g, " ").trim().slice(0, 120) : "";
  const last4 = typeof r.last4 === "string" && /^\d{4}$/.test(r.last4) ? r.last4 : null;
  const installments = typeof r.installments === "number" && Number.isInteger(r.installments)
    && r.installments > 1 && r.installments <= 60 ? r.installments : null;
  // Tipo de cambio S/ por US$: fuera de un rango razonable se ignora.
  const exchangeRate = typeof r.exchangeRate === "number" && r.exchangeRate > 1 && r.exchangeRate < 10
    ? Math.round(r.exchangeRate * 10000) / 10000 : null;
  return {
    emailId: email.id,
    kind,
    amount,
    currency,
    date,
    // En un pago el modelo suele poner el nombre de la tarjeta como "comercio".
    merchant: kind === "pago" ? "Pago a la tarjeta" : merchant || "Movimiento con tarjeta",
    last4,
    installments,
    exchangeRate,
    needsReview: r.needsReview !== false || !dateOk || (kind !== "pago" && !merchant) || (currencyRaw !== "PEN" && currencyRaw !== "USD"),
    note: typeof r.note === "string" ? r.note.slice(0, 200) : "",
  };
}
