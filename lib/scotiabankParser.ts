// Lector de las constancias que Scotiabank Perú envía por correo, sin IA.
// Reconoce el formato fijo de cada aviso y solo acepta los que mueven la
// TARJETA DE CRÉDITO; transferencias, Plin, Yape, débito y avisos se descartan.
//
// Formatos conocidos (bancadigital@scotiabank.com.pe):
//  - "Constancia de tu pago de Tarjeta de Crédito"  → pago a la tarjeta
//  - "Constancia de tu pago de servicio" pagado con la tarjeta de crédito → consumo
//  - "Pago con QR" pagado con la tarjeta de crédito → consumo
//  - Un aviso de consumo con tarjeta de crédito que no conocemos → consumo por revisar
// Y el correo que manda el atajo de iPhone al pagar con Apple Pay
// (asunto "Conta Medina consumo", cuerpo "Monto: … Comercio: …") → consumo
import type { EmailForParsing } from "./cardEmails";

const MONTHS: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12,
};

/** Lo que entiende normalizeMovement (mismo formato que antes devolvía el modelo). */
export interface ParsedMovement {
  kind: "consumo" | "pago";
  amount: number;
  currency: "PEN" | "USD";
  date: string | null;
  merchant: string;
  last4: string | null;
  installments: number | null;
  exchangeRate: number | null;
  needsReview: boolean;
  note: string;
}

export type ParseResult =
  | { status: "movement"; movement: ParsedMovement }
  | { status: "ignored"; reason: string };

/** El cuerpo en una sola línea: las tablas del correo se vuelven espacios. */
const flatten = (text: string) => text.replace(/\s*\|\s*/g, " ").replace(/\s+/g, " ").trim();

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Marca del correo que envía el atajo de Apple Pay del iPhone. */
export const SHORTCUT_SUBJECT = "Conta Medina consumo";

/**
 * Monto como lo escribe el iPhone según su idioma y región: "S/ 17.90", "S/17,90",
 * "PEN 17.90", "17,90 PEN", "US$ 9.99", "USD 9.99" o "$9.99".
 */
export function parseShortcutAmount(text: string): { amount: number; currency: "PEN" | "USD" } | null {
  const m = /(S\/\.?|PEN|US\$|USD|\$)?\s*(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(PEN|USD|soles|d[oó]lares)?/i.exec(text.trim());
  if (!m || (!m[1] && !m[3] && !/^\s*\d/.test(text))) return null;
  let digits = m[2].replace(/\s/g, "");
  // La última coma o punto seguida de 1 o 2 dígitos es el decimal; el resto son miles.
  const dec = /[.,](\d{1,2})$/.exec(digits);
  digits = dec ? digits.slice(0, -dec[0].length).replace(/[.,]/g, "") + "." + dec[1] : digits.replace(/[.,]/g, "");
  const amount = Number(digits);
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e7) return null;
  const tag = `${m[1] || ""}${m[3] || ""}`.toUpperCase();
  return { amount, currency: /US|USD|D[OÓ]LAR|^\$$/.test(tag) ? "USD" : "PEN" };
}

/** Monto después de una etiqueta: "Monto pagado: S/ 2,000.00" o "US$ 12.50". */
function amountAfter(flat: string, label: string): { amount: number; currency: "PEN" | "USD" } | null {
  const m = new RegExp(`${escape(label)}\\s*:?\\s*(S\\/\\.?|US\\$|\\$)\\s*([\\d][\\d,]*(?:\\.\\d{1,2})?)`, "i").exec(flat);
  if (!m) return null;
  const amount = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, currency: m[1].toUpperCase().startsWith("S") ? "PEN" : "USD" };
}

/** Medio de pago después de una etiqueta: nombre y últimos 4 dígitos. */
function instrumentAfter(flat: string, label: string): { name: string; last4: string } | null {
  const m = new RegExp(`${escape(label)}\\s*:?\\s*:?\\s*([^*]{2,60}?)\\s*(?:\\*[\\s*]*)+(\\d{4})\\b`, "i").exec(flat);
  return m ? { name: m[1].trim().replace(/^:\s*/, ""), last4: m[2] } : null;
}

const isCreditCard = (name: string) => /mastercard|visa|american|amex|diners|cr[eé]dito/i.test(name) && !/d[eé]bito|cta\.?|cuenta/i.test(name);

/** Texto entre una etiqueta y la siguiente: "Empresa o institución: X Servicio:". */
function textAfter(flat: string, label: string, stops: string[]): string {
  const m = new RegExp(`${escape(label)}\\s*:?\\s*(.+?)\\s*(?:${stops.map(escape).join("|")}|$)`, "i").exec(flat);
  return m ? m[1].replace(/\s+/g, " ").trim().slice(0, 120) : "";
}

/**
 * Fecha de la operación ("23 nov., 11:28 am" o "Fecha de efectividad: 23 nov.").
 * El correo no trae el año: se toma el del correo, y si quedara más de un mes
 * en el futuro (correo de enero por una operación de diciembre) es del año anterior.
 */
export function operationDate(flat: string, receivedDate: string): string | null {
  const m = /\b(\d{1,2}) (ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)\b\.?,?(?:\s+\d{1,2}:\d{2}|\s*\d{4})?/i.exec(flat);
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS[m[2].toLowerCase()];
  const yearInText = /\b(20\d{2})\b/.exec(m[0]);
  let year = yearInText ? Number(yearInText[1]) : Number(receivedDate.slice(0, 4));
  const pad = (n: number) => String(n).padStart(2, "0");
  let date = `${year}-${pad(month)}-${pad(day)}`;
  if (!yearInText && date > receivedDate) {
    const received = Date.parse(receivedDate + "T00:00:00Z");
    if (Date.parse(date + "T00:00:00Z") - received > 31 * 86_400_000) { year -= 1; date = `${year}-${pad(month)}-${pad(day)}`; }
  }
  return date;
}

/**
 * Interpreta un correo de Scotiabank. `last4` (si se conoce) limita a esa tarjeta:
 * un pago o consumo de otra tarjeta se descarta.
 */
export function parseScotiabankEmail(email: EmailForParsing, last4?: string | null): ParseResult {
  const flat = flatten(email.text);
  const card = last4 && /^\d{4}$/.test(last4) ? last4 : null;
  const otherCard = (digits: string) => !!card && digits !== card;
  const base = { installments: null, exchangeRate: null, note: "" };

  // 0. Correo del atajo de Apple Pay: una línea por dato.
  if (email.subject.toLowerCase().includes(SHORTCUT_SUBJECT.toLowerCase())) {
    // Cada dato va en su línea, pero también se acepta todo en una sola línea.
    const line = (label: string) => new RegExp(`(?:^|\\s)${label}\\s*:\\s*(.+?)\\s*(?=\\b(?:Monto|Importe|Comercio|Nombre|Tarjeta)\\s*:|$)`, "im").exec(email.text)?.[1].trim() || "";
    const money = parseShortcutAmount(line("Monto") || line("Importe"));
    if (!money) return { status: "ignored", reason: "atajo sin monto" };
    const merchant = (line("Comercio") || line("Nombre")).slice(0, 120);
    const cardName = line("Tarjeta");
    const digits = /(\d{4})\s*$/.exec(cardName)?.[1] || null;
    if (digits && otherCard(digits)) return { status: "ignored", reason: "atajo de otra tarjeta" };
    return { status: "movement", movement: { ...base, kind: "consumo", ...money, date: email.receivedDate,
      merchant: merchant || "Consumo con Apple Pay", last4: digits || card, needsReview: !merchant,
      note: merchant ? "" : "El atajo no envió el comercio." } };
  }

  // 1. Pago a la tarjeta de crédito.
  if (/constancia de tu pago de tarjeta de cr[eé]dito/i.test(flat)) {
    const paid = instrumentAfter(flat, "Tarjeta pagada");
    const money = amountAfter(flat, "Monto pagado");
    if (!money) return { status: "ignored", reason: "pago sin monto" };
    if (paid && otherCard(paid.last4)) return { status: "ignored", reason: "pago de otra tarjeta" };
    return { status: "movement", movement: { ...base, kind: "pago", ...money, date: operationDate(flat, email.receivedDate),
      merchant: "Pago a la tarjeta", last4: paid?.last4 || null, needsReview: !paid } };
  }

  // 2. Pago de servicio: solo cuenta si se pagó con la tarjeta de crédito.
  if (/constancia de tu pago de servicio/i.test(flat)) {
    const payer = instrumentAfter(flat, "Pagado con");
    if (!payer || !isCreditCard(payer.name)) return { status: "ignored", reason: "pago de servicio desde la cuenta" };
    if (otherCard(payer.last4)) return { status: "ignored", reason: "pago con otra tarjeta" };
    const money = amountAfter(flat, "Monto pagado");
    if (!money) return { status: "ignored", reason: "pago de servicio sin monto" };
    const company = textAfter(flat, "Empresa o institución", ["Servicio", "Dni", "N° Recibo", "Muchas gracias"]);
    const effective = /Fecha de efectividad\s*:?\s*(\d{1,2} [a-z]{3})/i.exec(flat);
    return { status: "movement", movement: { ...base, kind: "consumo", ...money,
      date: operationDate(effective ? effective[1] : flat, email.receivedDate),
      merchant: company || "Pago de servicio", last4: payer.last4, needsReview: !company } };
  }

  // 3. Pago con QR: solo si se pagó con la tarjeta de crédito (el de débito se descarta).
  if (/pago con qr/i.test(flat) || /pagaste con/i.test(flat)) {
    const payer = instrumentAfter(flat, "Pagaste con");
    if (!payer || !isCreditCard(payer.name)) return { status: "ignored", reason: "pago con débito o cuenta" };
    if (otherCard(payer.last4)) return { status: "ignored", reason: "pago con otra tarjeta" };
    const money = amountAfter(flat, "Monto");
    if (!money) return { status: "ignored", reason: "pago con QR sin monto" };
    const to = textAfter(flat, "Pagaste a", ["Muchas gracias", "Número de operación", "Nota"]);
    return { status: "movement", movement: { ...base, kind: "consumo", ...money, date: operationDate(flat, email.receivedDate),
      merchant: to || "Pago con QR", last4: payer.last4, needsReview: !to } };
  }

  // Transferencias, Plin, Yape, avisos de seguridad y estados de cuenta.
  if (/transferencia|plin|yape|visualizaci[oó]n|has activado|estado de cuenta|configuraci[oó]n de tarjetas/i.test(flat)) {
    return { status: "ignored", reason: "no es un movimiento de la tarjeta" };
  }

  // 4. Aviso de consumo con tarjeta de crédito de un formato que aún no conocemos:
  //    se trae para revisar en vez de perderlo.
  if (/tarjeta de cr[eé]dito|mastercard|visa/i.test(flat) && /\b(consumo|compra|cargo)\b/i.test(flat)) {
    const money = amountAfter(flat, "Monto") || amountAfter(flat, "Importe") || amountAfter(flat, "por");
    const digits = /(?:\*[\s*]*)+(\d{4})\b/.exec(flat)?.[1] || null;
    if (!money) return { status: "ignored", reason: "aviso sin monto" };
    if (digits && otherCard(digits)) return { status: "ignored", reason: "otra tarjeta" };
    const merchant = textAfter(flat, "Comercio", ["Monto", "Fecha", "Tarjeta", "Importe"])
      || textAfter(flat, "Establecimiento", ["Monto", "Fecha", "Tarjeta", "Importe"]);
    return { status: "movement", movement: { ...base, kind: "consumo", ...money, date: operationDate(flat, email.receivedDate),
      merchant: merchant || "Consumo con tarjeta", last4: digits, needsReview: true,
      note: "Formato de aviso nuevo: revisa monto y comercio." } };
  }

  return { status: "ignored", reason: "formato no reconocido" };
}
