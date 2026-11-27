# Guía para un agente: activar la lectura de correos de la tarjeta

Esta guía la sigue un agente (por ejemplo Claude Code con control del navegador)
en la computadora del dueño, para que el botón **Tarjeta → Leer correos** de
Conta Medina funcione en producción. Contexto técnico: `docs/tarjeta-correos.md`.

## Objetivo

Terminar con estas variables en el proyecto de Vercel **contabilidad-medina**
(equipo `yeisers-projects-97d594b2`), entorno **Production**, y un redeploy hecho:

| Variable | Valor |
|---|---|
| `GMAIL_REFRESH_TOKEN` | refresh token de OAuth con el scope `https://www.googleapis.com/auth/gmail.readonly`, de la cuenta de Gmail donde llegan los correos de Scotiabank |
| `CARD_ALLOWED_EMAILS` | correo(s) con que el dueño inicia sesión en la app, separados por coma |
| `CARD_EMAIL_SENDER` | solo si los correos del banco NO vienen de `scotiabank.com.pe` (ver paso 6) |

Ya existen y **no se tocan**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_REFRESH_TOKEN`, `DRIVE_FOLDER_ID`, `GEMINI_API_KEY`.

## Reglas (obligatorias)

1. **El refresh token y el client secret son secretos.** No los muestres en el chat,
   no los escribas en archivos del repo, no los pongas en un commit, no los imprimas
   en la terminal (`echo`, logs). Pásalos directo del portapapeles a Vercel.
2. **Los inicios de sesión y el clic de "Permitir" en Google los hace el dueño.**
   No escribas contraseñas ni códigos 2FA. Si una pantalla pide login, pausa y pídeselo.
3. **No cambies** otras variables, otros proyectos de Google Cloud ni la configuración
   de Drive. Si algo no coincide con esta guía, detente y pregunta.
4. No borres ni regeneres el client secret de OAuth (rompería la subida a Drive).

## Pasos

### 0. Preparación
- Pide al dueño que abra el navegador con sesión iniciada en Google (la cuenta dueña del
  proyecto de Google Cloud) y en Vercel.
- Opcional, para el paso 7: Vercel CLI (`npm i -g vercel`, luego `vercel login`
  hecho por el dueño y `vercel link` en la carpeta del repo, eligiendo `contabilidad-medina`).

### 1. Identificar el proyecto de Google Cloud
El proyecto correcto es el que contiene el cliente OAuth cuyo ID es `GOOGLE_CLIENT_ID`.
- Mira el valor de `GOOGLE_CLIENT_ID` en Vercel (Settings → Environment Variables; es un
  identificador, no un secreto) o en `.env.local` si existe en la máquina.
- En https://console.cloud.google.com/auth/clients revisa los proyectos (selector de
  arriba) hasta encontrar un cliente con ese ID. Anota el **ID del proyecto**.

### 2. Habilitar la Gmail API
Abre `https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=<ID_PROYECTO>`
y presiona **Habilitar** (si dice "Administrar", ya está habilitada).

### 3. Publicar la app de OAuth (evita que el token venza a los 7 días)
Abre `https://console.cloud.google.com/auth/audience?project=<ID_PROYECTO>`.
- Si el estado es **Prueba / Testing**: presiona **Publicar app** y confirma.
  No hace falta pedir verificación a Google (uso personal).
- Si ya está **En producción**: no hagas nada.

### 4. Permitir el OAuth Playground como redirección
En `https://console.cloud.google.com/auth/clients?project=<ID_PROYECTO>` abre el cliente
del paso 1 (tipo "Aplicación web"). En **URIs de redireccionamiento autorizados** debe
estar exactamente:
```
https://developers.google.com/oauthplayground
```
Si no está, agrégalo y guarda (puede tardar unos minutos en aplicar).

### 5. Obtener el refresh token
1. Abre https://developers.google.com/oauthplayground
2. Engranaje ⚙ (arriba a la derecha) → marca **Use your own OAuth credentials** → pega
   el Client ID y el Client Secret (el secret está en el cliente del paso 4 o en la
   variable `GOOGLE_CLIENT_SECRET` de Vercel). Cierra el panel.
3. En "Step 1", en el cuadro **Input your own scopes**, escribe exactamente
   `https://www.googleapis.com/auth/gmail.readonly` y presiona **Authorize APIs**.
4. **El dueño** elige la cuenta de Gmail donde le llegan los correos de Scotiabank.
   Aparecerá "Google no verificó esta app": **Configuración avanzada → Ir a … (no seguro)**
   → **Continuar / Permitir**. Este clic lo hace el dueño.
5. En "Step 2" presiona **Exchange authorization code for tokens**.
6. Copia el valor de **Refresh token** (empieza con `1//`) al portapapeles. No lo pegues
   en ningún otro lugar que no sea el paso 7.

### 6. Revisar el remitente de los correos del banco
En Gmail (misma cuenta) busca `scotiabank consumo` o `scotiabank tarjeta` y abre una
notificación de consumo con tarjeta de crédito. Mira la dirección del remitente:
- Si termina en `scotiabank.com.pe` (incluye subdominios como `@algo.scotiabank.com.pe`):
  no hace falta `CARD_EMAIL_SENDER`.
- Si es otra (por ejemplo un dominio de envíos masivos), usa esa dirección completa como
  valor de `CARD_EMAIL_SENDER`.
- Pregunta al dueño con qué correo inicia sesión en la app Conta Medina: ese es
  `CARD_ALLOWED_EMAILS`.

### 7. Cargar las variables en Vercel
**Opción A, panel web:** proyecto `contabilidad-medina` → Settings → Environment Variables
→ Add New. Para cada variable: nombre, valor, marcar **Production** (y Preview si el
dueño quiere), Save. Para `GMAIL_REFRESH_TOKEN` pega desde el portapapeles; si Vercel
ofrece "Sensitive", márcalo.

**Opción B, CLI** (en la carpeta del repo ya enlazada). El valor se lee del portapapeles
para que no aparezca en la terminal ni en el historial:
```bash
# macOS
pbpaste | vercel env add GMAIL_REFRESH_TOKEN production
# Windows (PowerShell)
Get-Clipboard | vercel env add GMAIL_REFRESH_TOKEN production
# Linux (X11)
xclip -o -selection clipboard | vercel env add GMAIL_REFRESH_TOKEN production

vercel env add CARD_ALLOWED_EMAILS production   # pide el valor: el correo de login
vercel env ls production                        # comprobar que aparecen (sin valores)
```
Si `GMAIL_REFRESH_TOKEN` ya existía, bórralo antes con `vercel env rm GMAIL_REFRESH_TOKEN production`.
Después de cargarlo, vacía el portapapeles (copia cualquier otro texto).

### 8. Volver a publicar
Las variables solo aplican en un deploy nuevo. En Vercel → **Deployments** → el último de
**Production** → menú **⋯** → **Redeploy** (sin "use existing build cache" no importa).
Espera a que diga **Ready**.

### 9. Verificar
1. El dueño abre la app (https://contabilidad-medina.vercel.app o el dominio de
   producción), inicia sesión, cambia a **Tarjeta** y toca **Leer correos**.
2. Resultado esperado: un aviso "N movimientos nuevos" o "No hay movimientos nuevos".
3. Si sale un error, busca en Vercel → Logs el texto `card_emails` y compara el código:

| Código / mensaje | Causa | Qué hacer |
|---|---|---|
| `GMAIL_CONFIG` "Falta configurar el acceso a Gmail" | falta una variable o no hubo redeploy | pasos 7 y 8 |
| `GMAIL_AUTH` "El permiso de Gmail venció…" | token inválido, de otro cliente OAuth, o revocado | repetir paso 5 con el Client ID/Secret correctos |
| `GMAIL_SCOPE` "El token no tiene permiso…" | Gmail API sin habilitar o scope mal escrito | pasos 2 y 5.3 |
| `FORBIDDEN` "Tu usuario no tiene acceso…" | `CARD_ALLOWED_EMAILS` no coincide con el correo de login | corregir la variable y redeploy |
| `MISSING_API_KEY` / `PROVIDER_*` | problema con `GEMINI_API_KEY` | revisar esa variable (ya la usa el escáner) |
| "No hay movimientos nuevos" pero sí hubo consumos | remitente distinto | paso 6, definir `CARD_EMAIL_SENDER` |

### 10. Informe final al dueño
Resume qué pasos se completaron, el ID del proyecto de Google Cloud usado, qué variables
quedaron creadas (solo nombres) y el resultado de la prueba. **Nunca** incluyas el refresh
token ni el client secret en el informe.
