# Tarjeta de crédito y lectura de correos

Arriba de la app hay un switch **Mi cuenta / Tarjeta**. La vista de tarjeta lleva
sus propios movimientos (no cambian el saldo de la cuenta) con:

- Deuda actual, línea usada y disponible en la moneda de la línea (por defecto **US$ 850**, editable en Ajustes).
- Consumos en soles o en dólares: los que no están en la moneda de la línea se convierten con el
  **tipo de cambio del banco**. Cada movimiento guarda su propio tipo de cambio: el que trae el correo
  si lo menciona, o el de Ajustes en ese momento. Cambiar el tipo de cambio de hoy no altera consumos anteriores.
- El monto a pagar se muestra por moneda (como en el estado de cuenta bimoneda) y su equivalente total.
- Ciclo actual según el **día de corte**, y cuánto falta pagar del último corte antes del **día de pago**.
  Las compras en cuotas se facturan de a una cuota por corte.
- **Leer correos**: busca en Gmail las constancias de Scotiabank y las interpreta por su formato fijo
  (`lib/scotiabankParser.ts`, sin IA ni costo). Toma los **pagos a la tarjeta** y los **pagos de servicios o con QR
  hechos con la tarjeta de crédito**; descarta Plin, Yape, transferencias, débito y avisos. Si se indicaron los
  últimos 4 dígitos, solo acepta esa tarjeta. Un aviso de consumo con un formato desconocido entra a *Por revisar*.
  Scotiabank **no envía por correo los consumos** con la tarjeta: esos se registran a mano o se cuadran con el banco.
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
GMAIL_CLIENT_ID=id_del_cliente_de_gmail     # opcional: cliente OAuth propio (proyecto contabilidadmedina2026)
GMAIL_CLIENT_SECRET=secret_de_ese_cliente   # obligatorio si hay GMAIL_CLIENT_ID
GMAIL_REFRESH_TOKEN=el_token_nuevo          # generado con ese cliente; sin GMAIL_CLIENT_ID, si falta se usa GOOGLE_REFRESH_TOKEN
CARD_ALLOWED_EMAILS=tu_correo_de_login      # recomendado: solo estas cuentas pueden leer los correos
CARD_EMAIL_SENDER=scotiabank.com.pe         # opcional: remitente a buscar
```

Con `GMAIL_CLIENT_ID`, Gmail usa su propio cliente OAuth y la API de Gmail se activa en el proyecto
de ese cliente. Sin él, usa `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (los de Drive).
También se usa `GEMINI_API_KEY`, que ya existe.

> Si la pantalla de consentimiento de OAuth está en modo **Prueba**, Google vence los refresh
> tokens a los 7 días. Para que no caduque, pásala a **En producción** (para uso propio no hace
> falta la verificación de Google; solo verás un aviso al autorizar).

## Privacidad

- El servidor solo lee (scope `gmail.readonly`), solo correos del remitente configurado y como máximo de los últimos 180 días.
- Los correos se leen en el servidor y no se envían a ningún servicio de IA. Gmail ni siquiera devuelve los Plin ni las transferencias (se excluyen en la búsqueda).
- No se guardan los correos: solo monto, fecha, comercio, cuotas y últimos 4 dígitos.
- Los movimientos se guardan en el mismo nodo `contacontrol` de Firebase que el resto de la app.

## Errores

En Vercel → Logs busca `card_emails`. Códigos: `GMAIL_CONFIG` (faltan variables), `GMAIL_AUTH`
(token vencido o revocado), `GMAIL_SCOPE` (falta el scope o la API no está activada),
`GMAIL_QUOTA`.

Pruebas: `npm test`.

## Consumos con Apple Pay (atajo del iPhone)

Scotiabank no envía por correo los consumos. Con Apple Pay, la automatización **Transacción** de la app
Atajos (iOS 17 o posterior) se activa al pagar y envía un correo a la cuenta de Gmail que lee la app:

- Asunto: `Conta Medina consumo`
- Cuerpo (una línea por dato): `Monto: <Importe>`, `Comercio: <Comercio>`, `Tarjeta: <Tarjeta o pase>`

`lib/scotiabankParser.ts` lo toma como consumo con la fecha del correo. El monto se acepta en los formatos del
iPhone (`S/ 17.90`, `PEN 17,90`, `US$ 9.99`…). Solo se activa con pagos sin contacto en tiendas; las compras
por internet o con la tarjeta física no generan el correo.
