# Escaneo de gastos

El quinto botón móvil, **Escanear**, acepta cámara o galería. Comprime la imagen en el navegador, envía esa copia a Gemini mediante una ruta autenticada y usa el guardado existente para adjuntarla en Drive. No se envía la clave al navegador.

Configurar en `.env.local` y en las variables del proyecto de Vercel:

```
GEMINI_API_KEY=tu_clave_privada
GEMINI_SCAN_MODEL=gemini-3.5-flash-lite
```

`GEMINI_SCAN_MODEL` es opcional: el escáner usa `gemini-3.5-flash-lite` por defecto. Ya no hereda `GEMINI_MODEL`, que puede apuntar a un modelo general más lento. No hace falta cambiar las variables existentes para usar el nuevo valor predeterminado. El modelo debe admitir imágenes y salida estructurada mediante `generateContent`. Referencia: https://ai.google.dev/gemini-api/docs/generate-content/structured-output

La lectura usa el modelo ligero desde la primera llamada, razonamiento mínimo y hasta 2048 tokens de salida. Un único plazo de 45 segundos cubre la respuesta completa; el navegador espera hasta 65 segundos para recibir errores del servidor. No se cancelan dos generaciones consecutivas a los 20 segundos. La hoja puede cerrarse para cancelar una lectura; la respuesta tardía no guarda ningún gasto. El guardado en Drive no se cancela a mitad.

Si falla, la foto sigue disponible y se puede elegir **Completar manualmente con esta foto**. El mensaje incluye una referencia; en Vercel → Logs se puede buscar `receipt_scan` y esa referencia para distinguir `PROVIDER_TIMEOUT`, `PROVIDER_NETWORK`, `PROVIDER_AUTH`, `PROVIDER_QUOTA` y otros errores. Los registros incluyen modelo, fase y duración, sin claves ni imágenes. La lectura real debe verificarse en Vercel con la sesión del usuario; las pruebas locales no demuestran que el proveedor responda en producción.

Se requieren las credenciales de Drive y la sesión Firebase ya utilizadas por `/api/comprobantes`. Después de cambiar variables del servidor, reiniciar o desplegar nuevamente.

El guardado automático está activado y puede desmarcarse. Solo guarda si hay fecha válida, monto positivo en PEN, descripción, rubro existente y método de pago; Gemini también debe identificar un gasto sin ambigüedad. Campos incompletos y gastos similares pasan al formulario. Transferencias recibidas y monedas no confirmadas no se registran automáticamente. El ciclo continúa determinado por la fecha real del documento, no por el ciclo visible.

La misma imagen se detecta mediante SHA-256; fotos distintas del mismo recibo pueden requerir revisión manual. Si Drive falla, se conserva la imagen para reintentar y no se guarda un gasto sin su comprobante. La compresión existente apunta a 130 KB, con límite de 1000 px; fotos poco legibles pueden necesitar repetirse.

Validación: `node --test tests/scan-receipt.test.cjs` y `npx tsc --noEmit`. Las pruebas automatizadas simulan Gemini; una prueba real requiere configurar la clave y subir una foto desde una sesión autenticada.
