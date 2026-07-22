// Generates a pleasant notification "ding" using the Web Audio API
// No external files needed — pure synthesized tone

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioCtx
}

export function playKapiNotification() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Two-tone pleasant chime
    const frequencies = [784, 1047] // G5 → C6 (uplifting interval)

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.12)

      gain.gain.setValueAtTime(0, now + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.5)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.6)
    })
  } catch (e) {
    // Audio not available — silently ignore
    console.warn('Notification sound unavailable:', e)
  }
}
