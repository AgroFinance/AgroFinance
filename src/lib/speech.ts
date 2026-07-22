// Grabador de audio del micrófono que produce un WAV (PCM 16-bit) en base64.
// Usamos WAV porque es un formato que la API de Gemini acepta de forma fiable,
// y funciona en escritorio y en iOS Safari (a diferencia del dictado nativo).

export interface Recorder {
  stop: () => Promise<{ base64: string; mimeType: string } | null>
  cancel: () => void
}

function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)            // PCM
  view.setUint16(22, 1, true)            // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)           // 16 bits
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any)
  }
  return btoa(binary)
}

/**
 * Pide permiso de micrófono y empieza a grabar.
 * Devuelve un Recorder; llama a stop() para obtener el WAV en base64.
 */
export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const AudioCtx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext
  const ctx = new AudioCtx()
  if (ctx.state === 'suspended') await ctx.resume()

  const source = ctx.createMediaStreamSource(stream)
  const processor = ctx.createScriptProcessor(4096, 1, 1)
  const chunks: Float32Array[] = []

  processor.onaudioprocess = (e) => {
    chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))
  }
  source.connect(processor)
  processor.connect(ctx.destination)

  const cleanup = () => {
    try { processor.disconnect() } catch {}
    try { source.disconnect() } catch {}
    try { ctx.close() } catch {}
    stream.getTracks().forEach((t) => t.stop())
  }

  return {
    cancel: cleanup,
    stop: async () => {
      cleanup()
      const total = chunks.reduce((n, c) => n + c.length, 0)
      if (total === 0) return null
      const merged = new Float32Array(total)
      let off = 0
      for (const c of chunks) { merged.set(c, off); off += c.length }
      const wav = encodeWAV(merged, ctx.sampleRate)
      return { base64: arrayBufferToBase64(wav), mimeType: 'audio/wav' }
    },
  }
}
