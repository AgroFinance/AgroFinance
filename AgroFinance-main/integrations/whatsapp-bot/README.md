# Kapi para WhatsApp 🐾📱

Bot que conecta a **Kapi** (AgroFinance) con WhatsApp mediante código QR (como WhatsApp Web).
Reusa la misma IA (Gemini) y el mismo Firestore que la app web, así la conversación y los
registros quedan guardados en tu base de datos.

## Qué hace
- **Conversar:** responde dudas sobre huella de carbono, Scope 1/2/3, ESG, créditos verdes, etc.
- **Registrar:** guarda datos operacionales por WhatsApp. Ej:
  - `Registrar 500 kg de palta en almacén Norte`
  - `Anota 30 cajas de mango cosechadas hoy`
  - `Agrega 200 L de diésel como insumo`

## Cómo correrlo (en tu PC)
```bash
cd whatsapp-bot
npm install          # la 1ª vez descarga Chromium (puede tardar)
npm start
```
1. Aparecerá un **QR** en la terminal (y como imagen `kapi-qr.png`).
2. En tu teléfono: **WhatsApp → Ajustes → Dispositivos vinculados → Vincular un dispositivo** y escanea.
3. Cuando veas `✅ ¡Kapi está EN LÍNEA!`, escríbele a ese número desde otro teléfono.
4. La sesión queda guardada en `.wwebjs_auth/` (no necesitas re-escanear la próxima vez).

Para detenerlo: `Ctrl + C`.

## Notas importantes
- **Debe estar encendido** para responder. En tu PC funciona mientras la terminal esté abierta.
  Para 24/7, despliega esta carpeta en un servicio Node (Railway, Render, Fly.io o un VPS).
- Usa la librería **no oficial** `whatsapp-web.js`. Va contra los Términos de WhatsApp y
  **el número podría ser bloqueado**. Recomendado para **piloto/demo**; para producción usa la
  **WhatsApp Business Cloud API** oficial de Meta.
- Variables de Firebase: se leen de `../.env.local` (las mismas de la app web).
- Claves de Gemini: puedes sobreescribirlas con la variable de entorno `GEMINI_API_KEYS`
  (separadas por coma); si no, usa las de la app.
