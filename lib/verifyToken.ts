// Verifica un ID token de Firebase usando las claves públicas de Google (jose).
// No requiere firebase-admin ni cuenta de servicio: valida firma + claims contra
// el JWKS público de Firebase. Funciona en cualquier versión de Node.
import { jwtVerify, createRemoteJWKSet, type JWTPayload } from "jose";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "contabilidadmedina2026";
const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export interface FirebaseToken extends JWTPayload {
  user_id?: string;
  email?: string;
  firebase?: { sign_in_provider?: string };
}

// JWKS remoto cacheado entre invocaciones (jose refresca las claves solo).
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Devuelve el token decodificado solo si es válido y de un usuario con email
 * (no anónimo). Si algo falla, devuelve null (→ el endpoint responde 401).
 */
export async function verifyEmailUser(
  authHeader: string | null
): Promise<FirebaseToken | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URL));
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    const fb = payload as FirebaseToken;
    if (!fb.sub) return null;
    if (fb.firebase?.sign_in_provider === "anonymous") return null;
    return fb;
  } catch {
    return null;
  }
}
