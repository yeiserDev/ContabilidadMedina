# Tarjeta de crédito y lectura de correos

Arriba de la app hay un switch **Mi cuenta / Tarjeta**. La vista de tarjeta lleva
sus propios movimientos (no cambian el saldo de la cuenta) con:

- Deuda actual, línea usada y disponible (los consumos en US$ se convierten con el tipo de cambio de Ajustes).
- Ciclo actual según el **día de corte**, y cuánto falta pagar del último corte antes del **día de pago**.
  Las compras en cuotas se facturan de a una cuota por corte.
- **Leer correos**: busca en Gmail las notificaciones de Scotiabank, Gemini las interpreta y se agregan solas.
  Las dudosas (por ejemplo, si no queda claro que sea tarjeta de crédito) quedan en **Por revisar**.
- Consumos y pagos manuales, editables tocando cada movimiento.

La lectura corre al tocar el botón y, en segundo plano, al abrir la vista de tarjeta si pasaron más de 2 horas.
Cada correo se procesa una sola vez (se recuerda su id), así que borrar o descartar un movimiento no lo vuelve a traer.

## Configuración (una sola vez)

1. **Activar la API de Gmail** en el mismo proyecto de Google Cloud del `GOOGLE_CLIENT_ID`
   (APIs y servicios → Biblioteca → Gmail API → Habilitar).
2. **Generar un refresh token con permiso de lectura de Gmail** en
   [OAuth Playground](https://developers.google.com/oauthplayground) con tus credenciales
   (engranaje → *Use your own OAuth credentials*) y el scope
   `https://www.googleapis.com/auth/gmail.readonly`, iniciando sesión con la cuenta de Gmail
   donde te llegan los correos de Scotiabank.
3. Variables en `.env.local` y en Vercel:

```
GMAIL_REFRESH_TOKEN=el_token_nuevo          # si falta, se usa GOOGLE_REFRESH_TOKEN
CARD_ALLOWED_EMAILS=tu_correo_de_login      # recomendado: solo estas cuentas pueden leer los correos
CARD_EMAIL_SENDER=scotiabank.com.pe         # opcional: remitente a buscar
```

También se usan `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GEMINI_API_KEY`, que ya existen.

> Si la pantalla de consentimiento de OAuth está en modo **Prueba**, Google vence los refresh
> tokens a los 7 días. Para que no caduque, pásala a **En producción** (para uso propio no hace
> falta la verificación de Google; solo verás un aviso al autorizar).

## Privacidad

- El servidor solo lee (scope `gmail.readonly`), solo correos del remitente configurado y como máximo de los últimos 180 días.
- Los correos sin montos (promociones) se descartan sin enviarse a Gemini. Del resto se envían asunto y texto (máx. 4000 caracteres).
- No se guardan los correos: solo monto, fecha, comercio, cuotas y últimos 4 dígitos.
- Los movimientos se guardan en el mismo nodo `contacontrol` de Firebase que el resto de la app.

## Errores

En Vercel → Logs busca `card_emails`. Códigos: `GMAIL_CONFIG` (faltan variables), `GMAIL_AUTH`
(token vencido o revocado), `GMAIL_SCOPE` (falta el scope o la API no está activada),
`GMAIL_QUOTA`, `PROVIDER_*` (Gemini).

Pruebas: `npm test`.
