'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronRight, MessageCircle, Sparkles, Camera,
  Check, Upload, Volume2, VolumeX, ChevronDown
} from 'lucide-react'
import KapiIcon from './KapiIcon'
import { useChat } from '@/contexts/ChatContext'

/* ─────────────────────────────────────────────
   ONBOARDING STEPS  (guía simple integrada)
   Cada paso puede pedir imagen como evidencia.
───────────────────────────────────────────────*/
interface OnboardingStep {
  id: string
  emoji: string
  title: string
  body: string
  cta?: { label: string; href: string }
  requiresPhoto?: boolean
  photoHint?: string
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    emoji: '👋',
    title: '¡Hola, soy Kapi!',
    body: 'Soy tu asistente de clima IA. Te voy a guiar en 4 pasos rápidos para configurar tu plataforma ESG. ¡Comencemos!',
  },
  {
    id: 'dashboard',
    emoji: '📊',
    title: 'Tu Panel de Emisiones',
    body: 'En el Dashboard verás tu huella de carbono (Scope 1, 2 y 3), tu Score ESG y alertas de auditoría.',
    cta: { label: 'Ver Dashboard', href: '/dashboard/' },
    requiresPhoto: true,
    photoHint: 'Toma una captura o foto de tu panel para confirmar que lo viste ✅',
  },
  {
    id: 'upload',
    emoji: '📂',
    title: 'Carga tus datos',
    body: 'Sube facturas, reportes de combustible o usa "Autocargar DATA" para que analice tus emisiones al instante.',
    cta: { label: 'Ir a Carga de Datos', href: '/upload/' },
    requiresPhoto: true,
    photoHint: 'Muéstrame una foto de los archivos que tienes listos para subir 📁',
  },
  {
    id: 'copilot',
    emoji: '💬',
    title: 'Habla conmigo',
    body: 'Pregúntame sobre tu huella de carbono, reportes HC Perú o créditos verdes. Estoy disponible 24/7.',
    cta: { label: 'Abrir chat con Kapi', href: '/copilot/' },
  },
  {
    id: 'done',
    emoji: '🎉',
    title: '¡Todo listo!',
    body: '¡Estás configurado! Ahora puedes explorar la plataforma. Siempre estaré aquí si necesitas ayuda.',
  },
]

/* ─────────────────────────────────────────────
   WEB SPEECH TTS helper
───────────────────────────────────────────────*/
function speakText(text: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'es-PE'
  utt.rate = 1.05
  utt.pitch = 1.1
  // Prefer a Spanish voice if available
  const voices = window.speechSynthesis.getVoices()
  const esVoice = voices.find(v => v.lang.startsWith('es'))
  if (esVoice) utt.voice = esVoice
  window.speechSynthesis.speak(utt)
}

function stopSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────*/
export default function KapiBubble() {
  const pathname = usePathname()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { openChat } = useChat()

  const [open, setOpen] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(false)

  // Onboarding state
  const [onboardingDone, setOnboardingDone] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [photoEvidence, setPhotoEvidence] = useState<Record<string, string>>({})
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Globo de invitación: rota frases para que se note que Kapi habla y que
  // se le puede preguntar. Antes salía una sola vez y quedaba mudo.
  const [hint, setHint] = useState(false)
  const [hintIndex, setHintIndex] = useState(0)

  const FRASES_KAPI = [
    '👋 Soy Kapi, tu agente de clima. Pregúntame lo que sea.',
    '📊 ¿Quieres saber tu huella por kg exportado?',
    '🇪🇺 Te digo si cumples la EUDR para vender en Europa.',
    '🏦 Puedo calcular cuánto bajarías tu tasa de crédito.',
  ]

  /* Load persisted state */
  useEffect(() => {
    const done = localStorage.getItem('kapi_onboarding_done') === 'true'
    const step = parseInt(localStorage.getItem('kapi_onboarding_step') || '0', 10)
    setOnboardingDone(done)
    setOnboardingStep(isNaN(step) ? 0 : step)
    setShowOnboarding(!done)

  }, [])

  /* Ciclo del globo: habla 5.5s, calla 9s y cambia de frase. Se detiene
     mientras el panel está abierto para no competir con el contenido. */
  useEffect(() => {
    if (open) { setHint(false); return }
    let vivo = true
    const mostrar = setTimeout(() => vivo && setHint(true), hintIndex === 0 ? 2000 : 9000)
    const ocultar = setTimeout(() => vivo && setHint(false), (hintIndex === 0 ? 2000 : 9000) + 5500)
    const siguiente = setTimeout(() => {
      if (vivo) setHintIndex(i => (i + 1) % FRASES_KAPI.length)
    }, (hintIndex === 0 ? 2000 : 9000) + 6200)
    return () => { vivo = false; [mostrar, ocultar, siguiente].forEach(clearTimeout) }
  }, [hintIndex, open])

  /* TTS: speak current step message when onboarding opens */
  useEffect(() => {
    if (!open || !showOnboarding || onboardingDone) return
    const step = ONBOARDING_STEPS[onboardingStep]
    if (step) {
      const msg = `${step.title}. ${step.body}`
      speakText(msg, ttsEnabled)
    }
    return () => stopSpeech()
  }, [open, onboardingStep, showOnboarding, ttsEnabled, onboardingDone])

  const currentStep = ONBOARDING_STEPS[onboardingStep]
  const isLastStep = onboardingStep === ONBOARDING_STEPS.length - 1

  const handleNext = useCallback(() => {
    if (isLastStep) {
      localStorage.setItem('kapi_onboarding_done', 'true')
      setOnboardingDone(true)
      setShowOnboarding(false)
    } else {
      const next = onboardingStep + 1
      setOnboardingStep(next)
      localStorage.setItem('kapi_onboarding_step', String(next))
    }
  }, [isLastStep, onboardingStep])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentStep) return
    const reader = new FileReader()
    reader.onload = () => {
      setPhotoEvidence(prev => ({ ...prev, [currentStep.id]: reader.result as string }))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const currentPhoto = currentStep ? photoEvidence[currentStep.id] : undefined
  // Evidence is now optional — never blocks navigation
  const canAdvance = true

  const handleOpen = () => {
    setOpen(o => !o)
    setHint(false)
    if (!open && ttsEnabled && !showOnboarding && onboardingDone) {
      speakText('¡Hola! ¿En qué puedo ayudarte hoy?', true)
    }
  }

  const handleClose = () => {
    setOpen(false)
    stopSpeech()
  }

  const skipOnboarding = () => {
    localStorage.setItem('kapi_onboarding_done', 'true')
    setOnboardingDone(true)
    setShowOnboarding(false)
  }

  const restartOnboarding = () => {
    localStorage.removeItem('kapi_onboarding_done')
    localStorage.removeItem('kapi_onboarding_step')
    setOnboardingDone(false)
    setOnboardingStep(0)
    setPhotoEvidence({})
    setShowOnboarding(true)
  }

  return (
    <>
      {/* Hidden file input for photo evidence */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      <div
        className="fixed bottom-20 right-6 z-[45] flex flex-col items-end gap-3"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* ─── PANEL ─── */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-[min(22rem,calc(100vw-2rem))] rounded-3xl overflow-hidden"
              style={{
                background: 'rgba(251,244,214,0.97)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(90,190,145,0.2)',
                boxShadow: '0 16px 48px rgba(16,40,28,0.2)',
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(90,190,145,0.12)] bg-[rgba(199,224,207,0.18)]">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#0F3D2C' }}>
                  <KapiIcon size={22} color="#FBF4D6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#13301F] leading-none">Kapi</div>
                  <div className="text-[11px] text-[rgba(80,108,92,0.55)] mt-0.5">
                    {showOnboarding && !onboardingDone ? 'Guía de inicio rápido' : 'Tu asistente de clima IA'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* TTS toggle */}
                  <button
                    onClick={() => { setTtsEnabled(v => !v); stopSpeech() }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[rgba(80,108,92,0.5)] hover:bg-[rgba(90,190,145,0.1)] transition-colors"
                    title={ttsEnabled ? 'Silenciar a Kapi' : 'Activar voz de Kapi'}
                  >
                    {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleClose}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[rgba(80,108,92,0.5)] hover:bg-[rgba(90,190,145,0.1)] transition-colors"
                    aria-label="Cerrar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ─── ONBOARDING CONTENT ─── */}
              {showOnboarding && !onboardingDone && currentStep && (
                <div className="p-4">
                  {/* Progress dots */}
                  <div className="flex gap-1.5 mb-4">
                    {ONBOARDING_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === onboardingStep
                            ? 'w-5 bg-[#137C53]'
                            : i < onboardingStep
                            ? 'w-2 bg-[rgba(19,124,83,0.4)]'
                            : 'w-2 bg-[rgba(80,108,92,0.15)]'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Step content */}
                  <motion.div
                    key={currentStep.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="text-2xl mb-2">{currentStep.emoji}</div>
                    <h3 className="text-sm font-bold text-[#13301F] mb-1">{currentStep.title}</h3>
                    <p className="text-xs text-[rgba(80,108,92,0.8)] leading-relaxed mb-3">{currentStep.body}</p>

                    {/* CTA link */}
                    {currentStep.cta && (
                      <button
                        onClick={() => {
                          if (currentStep.cta?.href === '/copilot/') {
                            setOpen(false)
                            openChat()
                          }
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#137C53] hover:gap-2 transition-all mb-3"
                      >
                        {currentStep.cta.label} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Photo evidence */}
                    {currentStep.requiresPhoto && (
                      <div className="mb-3">
                        <div className="flex items-start gap-2 p-3 rounded-2xl bg-[rgba(90,190,145,0.06)] border border-[rgba(90,190,145,0.15)]">
                          <Camera className="w-4 h-4 text-[#137C53] flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-[rgba(80,108,92,0.7)] leading-snug mb-2">
                              {currentStep.photoHint}
                            </p>
                            {currentPhoto ? (
                              <div className="relative inline-block">
                                <img
                                  src={currentPhoto}
                                  alt="Evidencia"
                                  className="h-20 rounded-xl border border-[rgba(90,190,145,0.3)] object-cover"
                                />
                                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#137C53] flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#137C53] border border-[rgba(90,190,145,0.3)] hover:bg-[rgba(90,190,145,0.1)] transition-all"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                Subir evidencia
                              </button>
                            )}
                          </div>
                        </div>
                        {!currentPhoto && (
                          <button
                            onClick={() => handleNext()}
                            className="text-[10px] text-[rgba(80,108,92,0.45)] hover:text-[#137C53] transition-colors mt-1 block"
                          >
                            Continuar sin evidencia →
                          </button>
                        )}
                      </div>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={skipOnboarding}
                        className="text-xs text-[rgba(80,108,92,0.45)] hover:text-[rgba(80,108,92,0.7)] transition-colors"
                      >
                        Saltar guía
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={!canAdvance}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          canAdvance
                            ? 'bg-gradient-to-r from-[#2BA470] to-[#137C53] text-white shadow-md hover:brightness-105 active:scale-95'
                            : 'bg-[rgba(90,190,145,0.1)] text-[rgba(80,108,92,0.4)] cursor-not-allowed'
                        }`}
                      >
                        {isLastStep ? (
                          <>¡Listo! <Check className="w-3.5 h-3.5" /></>
                        ) : (
                          <>Siguiente <ChevronRight className="w-3.5 h-3.5" /></>
                        )}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* ─── NORMAL KAPI PANEL (post-onboarding) ─── */}
              {(!showOnboarding || onboardingDone) && (
                <>
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-[rgba(80,108,92,0.75)] leading-relaxed">
                      ¡Hola! Puedo ayudarte con tus emisiones Scope 1, 2 y 3, reportes ESG y créditos verdes. ¿Qué necesitas?
                    </p>

                    {/* Quick actions */}
                    <div className="space-y-1.5">
                      {[
                        { label: '¿Cuál es mi huella de carbono?' },
                        { label: 'Generar reporte HC Perú' },
                        { label: 'Ver mi Score ESG' },
                      ].map(action => (
                        <button
                          key={action.label}
                          onClick={() => { setOpen(false); openChat() }}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs text-[rgba(80,108,92,0.8)] hover:text-[#137C53] bg-white/40 hover:bg-[rgba(90,190,145,0.08)] border border-[rgba(90,190,145,0.1)] transition-all"
                        >
                          <Sparkles className="w-3 h-3 text-[#137C53] flex-shrink-0" />
                          {action.label}
                        </button>
                      ))}
                    </div>

                    {/* Re-run onboarding */}
                    <button
                      onClick={restartOnboarding}
                      className="text-[10px] text-[rgba(80,108,92,0.4)] hover:text-[rgba(80,108,92,0.65)] transition-colors w-full text-center pt-1"
                    >
                      Ver guía de inicio →
                    </button>
                  </div>

                  {/* CTA: Chat completo */}
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => { setOpen(false); openChat() }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold text-white transition-all active:scale-[0.98]"
                      style={{ background: 'linear-gradient(135deg, #2BA470, #0E7A4E)' }}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Hablar con Kapi
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── HINT BALLOON ─── */}
        <AnimatePresence>
          {hint && !open && (
            <motion.button
              key={hintIndex}
              onClick={handleOpen}
              initial={{ opacity: 0, y: 8, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.94 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mb-1 mr-1 max-w-[14rem] text-left rounded-2xl rounded-br-md px-3.5 py-2.5 text-[11.5px] leading-snug text-[rgba(80,108,92,0.9)] hover:brightness-105 active:scale-95 transition-all cursor-pointer"
              style={{
                background: 'rgba(251,244,214,0.98)',
                border: '1px solid rgba(90,190,145,0.25)',
                boxShadow: '0 6px 22px rgba(16,40,28,0.18)',
              }}
            >
              {FRASES_KAPI[hintIndex]}
              <span className="block mt-1 text-[10px] font-semibold text-[#137C53]">Tócame para hablar →</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* ─── FLOATING BUTTON ─── */}
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 260, damping: 18 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={handleOpen}
          className="relative w-14 h-14 rounded-full flex items-center justify-center overflow-visible"
          style={{
            background: 'linear-gradient(135deg, #FFFFFF, #EAF5EE)',
            border: '1.5px solid rgba(90,190,145,0.35)',
            boxShadow: '0 8px 28px rgba(16,40,28,0.2)',
          }}
          aria-label="Abrir asistente Kapi"
        >
          {open ? (
            <ChevronDown className="w-5 h-5 text-[#137C53]" />
          ) : (
            <>
              {/* Anillo que late: señala que es tocable */}
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-[#2BA470] pointer-events-none"
                animate={{ scale: [1, 1.35], opacity: [0.55, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                animate={{ rotate: [0, -6, 6, -4, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 4.5, ease: 'easeInOut' }}
              >
                <KapiIcon size={26} color="#137C53" />
              </motion.div>
              {/* Onboarding badge */}
              {showOnboarding && !onboardingDone && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white"
                  style={{ background: '#D2912F' }}
                >
                  {onboardingStep + 1}
                </span>
              )}
            </>
          )}
        </motion.button>
      </div>
    </>
  )
}
