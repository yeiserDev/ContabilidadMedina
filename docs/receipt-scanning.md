# Escaneo de gastos

El quinto botón móvil, **Escanear**, acepta cámara o galería. Comprime la imagen en el navegador, envía esa copia a Gemini mediante una ruta autenticada y usa el guardado existente para adjuntarla en Drive. No se envía la clave al navegador.

Configurar en `.env.local` y en las variables del proyecto de Vercel:

```
GEMINI_API_KEY=tu_clave_privada
GEMINI_MODEL=gemini-3.8-flash
```

El modelo es configurable. Debe admitir imágenes y salida estructurada mediante `generateContent`. Referencia: https://ai.google.dev/gemini-api/docs/generate-content/structured-output

La lectura usa razonamiento bajo y un límite de 20 segundos. Si el modelo configurado no responde o está temporalmente indisponible, vuelve a intentar una vez con `gemini-3.5-flash-lite`. Un error de clave o de cuota se muestra sin repetir la petición.

Se requieren las credenciales de Drive y la sesión Firebase ya utilizadas por `/api/comprobantes`. Después de cambiar variables del servidor, reiniciar o desplegar nuevamente.

El guardado automático está activado y puede desmarcarse. Solo guarda si hay fecha válida, monto positivo en PEN, descripción, rubro existente y método de pago; Gemini también debe identificar un gasto sin ambigüedad. Campos incompletos y gastos similares pasan al formulario. Transferencias recibidas y monedas no confirmadas no se registran automáticamente. El ciclo continúa determinado por la fecha real del documento, no por el ciclo visible.

La misma imagen se detecta mediante SHA-256; fotos distintas del mismo recibo pueden requerir revisión manual. Si Drive falla, se conserva la imagen para reintentar y no se guarda un gasto sin su comprobante. La compresión existente apunta a 130 KB, con límite de 1000 px; fotos poco legibles pueden necesitar repetirse.

Validación: `node --test tests/scan-receipt.test.cjs` y `npx tsc --noEmit`. Las pruebas automatizadas simulan Gemini; una prueba real requiere configurar la clave y subir una foto desde una sesión autenticada.
