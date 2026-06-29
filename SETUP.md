# Conta Medina — App + Backend en Next.js (Fase 1)

Proyecto **único** (frontend + backend en el mismo Next.js) para desplegar fácil en Vercel.
La base de datos sigue siendo el **mismo Firebase Realtime Database** (tu historial NO se toca).

## Estructura

```
/ (raíz = proyecto Next.js)
├─ public/            ← tu app actual (index.html, app.js, styles.css, sw.js, ...)
│                       se sirve en la raíz "/"
├─ app/api/comprobantes/
│  ├─ route.ts        ← POST: sube imagen comprimida a tu Drive (requiere login email)
│  └─ [id]/route.ts   ← GET: sirve la imagen (proxy desde Drive)
├─ lib/               ← drive.ts, verifyToken.ts (jose), cors.ts, firebaseClient.ts
├─ next.config.ts     ← rewrite "/" → "/index.html"
└─ .env.local         ← credenciales (NO se sube a git)
```

Como app y backend están en el **mismo origen**, las llamadas son relativas
(`/api/comprobantes`) y **no hace falta CORS ni BACKEND_URL**.

## 1. Variables de entorno (.env.local)

Copia `.env.example` → `.env.local` y rellena:

- **`NEXT_PUBLIC_FIREBASE_*`** — valores de tu `firebase-config.js` (públicos). Ya prellenados.
- **Google Drive (OAuth2 de tu cuenta — los 15 GB):**
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `DRIVE_FOLDER_ID`.
  - El refresh token se obtiene en [OAuth Playground](https://developers.google.com/oauthplayground)
    (usa tus propias credenciales, scope `https://www.googleapis.com/auth/drive`).

> El login se verifica con las **claves públicas de Google** (`jose`). NO se necesita cuenta de servicio.

## 2. Correr en local

```bash
npm install
npm run dev
```
Abre http://localhost:3000 — se sirve tu app, y el backend está en `/api/comprobantes`.

## 3. Desplegar en Vercel (un solo proyecto)

Opción A — desde GitHub (recomendada):
1. Sube el repo a GitHub.
2. En Vercel → **Add New Project** → importa el repo. Detecta Next.js solo.
3. **Settings → Environment Variables**: carga todas las de `.env.local`
   (las `NEXT_PUBLIC_FIREBASE_*` + las `GOOGLE_*` + `DRIVE_FOLDER_ID`).
4. Deploy.

Opción B — CLI:
```bash
npx vercel          # vincula
npx vercel --prod   # despliega
```

Tras desplegar, tu app y el backend viven en la misma URL de Vercel. Inicia sesión
y sube un comprobante: debe aparecer en tu carpeta de Drive y verse en la app.
