// ───────────────────────────────────────────────────────────────────────────
// Kapi en WhatsApp — AgroFinance
// Escanea el QR (una vez) y Kapi conversa y registra datos por WhatsApp,
// reusando la IA (Gemini) y el mismo Firestore de la app web.
// ───────────────────────────────────────────────────────────────────────────
const path = require('path')
// Carga las variables de Firebase desde el .env.local de la app (carpeta padre)
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const fs = require('fs')
const qrcodeTerminal = require('qrcode-terminal')
const QRCode = require('qrcode')
const { Client, LocalAuth } = require('whatsapp-web.js')

const {
  callGeminiAI, buildSystemPrompt, parseRegistro,
  REGISTRO_TRIGGERS, TIPO_LABEL, toWhatsApp,
} = require('./kapi')
const { saveChatMessage, saveRegistro, firestoreEnabled } = require('./store')

const QR_PNG = path.join(__dirname, 'kapi-qr.png')

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
})

client.on('qr', async (qr) => {
  console.log('\n📲  Escanea este QR con WhatsApp (Ajustes → Dispositivos vinculados):\n')
  qrcodeTerminal.generate(qr, { small: true })
  try {
    await QRCode.toFile(QR_PNG, qr, { width: 360, margin: 2 })
    console.log(`\n🖼️   QR también guardado como imagen: ${QR_PNG}\n`)
  } catch (e) {
    console.warn('No se pudo generar el PNG del QR:', e.message)
  }
})

client.on('authenticated', () => console.log('🔐  Autenticado. Vinculando…'))
client.on('auth_failure', (m) => console.error('❌  Falló la autenticación:', m))

client.on('ready', () => {
  if (fs.existsSync(QR_PNG)) { try { fs.unlinkSync(QR_PNG) } catch {} }
  console.log('\n✅  ¡Kapi está EN LÍNEA en WhatsApp!')
  console.log(`    Firestore: ${firestoreEnabled ? 'conectado (guardando chats y registros)' : 'deshabilitado'}`)
  console.log('    Escríbele a tu propio número desde otro teléfono para probar.\n')
})

client.on('disconnected', (reason) => {
  console.warn('⚠️  Desconectado:', reason)
})

client.on('message', async (msg) => {
  try {
    // Ignora estados, mensajes de grupos y mensajes vacíos
    if (msg.isStatus || msg.from.endsWith('@g.us')) return
    const text = (msg.body || '').trim()
    if (!text) return

    console.log(`💬  ${msg.from}: ${text}`)
    const chat = await msg.getChat()
    chat.sendStateTyping().catch(() => {})

    await saveChatMessage('user', text)

    // 1) ¿Es un registro operacional?
    if (REGISTRO_TRIGGERS.test(text)) {
      const reg = parseRegistro(text)
      if (reg) {
        await saveRegistro(reg)
        const reply = toWhatsApp(
          `✅ *Registro guardado*\n\n` +
          `- *Tipo:* ${TIPO_LABEL[reg.tipo]}\n` +
          `- *Producto:* ${reg.producto}\n` +
          `- *Cantidad:* ${reg.cantidad} ${reg.unidad}` +
          (reg.almacen ? `\n- *Almacén:* ${reg.almacen}` : '') +
          `\n- *Fecha:* ${new Date(reg.fecha).toLocaleDateString('es-PE')}\n\n` +
          `🐾 Listo. ¿Registramos algo más?`
        )
        await msg.reply(reply)
        await saveChatMessage('model', reply)
        return
      }
      await msg.reply(
        '🐾 No identifiqué la cantidad. Prueba así:\n' +
        '- *Registrar 500 kg de palta en almacén Norte*\n' +
        '- *Anota 30 cajas de mango cosechadas hoy*\n' +
        '- *Agrega 200 L de diésel como insumo*'
      )
      return
    }

    // 2) Conversación con la IA de Kapi
    let answer = await callGeminiAI(buildSystemPrompt(text))
    if (!answer) {
      answer = '🐾 Ahora mismo no pude pensar la respuesta. Intenta de nuevo en un momento, ' +
        'o escribe *Registrar …* para guardar un dato operacional.'
    }
    answer = toWhatsApp(answer)
    await msg.reply(answer)
    await saveChatMessage('model', answer)
  } catch (e) {
    console.error('Error procesando mensaje:', e)
    try { await msg.reply('🐾 Uy, tuve un problema procesando eso. ¿Lo intentas otra vez?') } catch {}
  }
})

console.log('🌱  Iniciando Kapi para WhatsApp… (la primera vez descarga Chromium, puede tardar)')
client.initialize()

process.on('SIGINT', async () => {
  console.log('\n👋  Cerrando Kapi…')
  try { await client.destroy() } catch {}
  process.exit(0)
})
