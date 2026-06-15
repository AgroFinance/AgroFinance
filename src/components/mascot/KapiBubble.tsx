'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, ChevronRight, MessageCircle, Sparkles } from 'lucide-react'
import CapybaraBot from './CapybaraBot'
import { getTodayReminders, getDoneToday, toggleReminderDone, type Reminder } from '@/lib/reminders'

/**
 * Asistente Kapi minimalista: un botón flotante discreto que abre una burbuja
 * compacta con recordatorios funcionales del día y acceso al chat completo.
 * El protagonismo es de la app; Kapi solo apoya desde la esquina.
 */
export default function KapiBubble() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [hint, setHint] = useState(false)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [done, setDone] = useState<string[]>([])

  // No mostrar la burbuja en la landing ni dentro del propio copilot (ya hay chat completo)
  const hidden = pathname === '/' || pathname?.startsWith('/copilot')

  useEffect(() => {
    setReminders(getTodayReminders())
    setDone(getDoneToday())
    // Pista sutil una sola vez por sesión
    const seen = sessionStorage.getItem('agrofinance_kapi_hint')
    if (!seen) {
      const t = setTimeout(() => setHint(true), 1600)
      const t2 = setTimeout(() => setHint(false), 7000)
      sessionStorage.setItem('agrofinance_kapi_hint', '1')
      return () => { clearTimeout(t); clearTimeout(t2) }
    }
  }, [])

  if (hidden) return null

  const pending = reminders.filter(r => !done.includes(r.id)).length

  const handleToggle = (id: string) => {
    setDone(toggleReminderDone(id))
  }

  return (
    <div className="fixed bottom-5 right-4 z-[60] flex flex-col items-end gap-3"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-[min(20rem,calc(100vw-2rem))] rounded-3xl overflow-hidden glass-card"
            style={{ boxShadow: '0 12px 40px rgba(16,40,28,0.18)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(90,190,145,0.12)] bg-[rgba(199,224,207,0.18)]">
              <div className="w-9 h-9 rounded-2xl bg-white/60 flex items-center justify-center overflow-hidden flex-shrink-0">
                <div style={{ transform: 'scale(0.55)' }}>
                  <CapybaraBot size="sm" mood="happy" showGlow={false} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#13301F] leading-none">Kapi</div>
                <div className="text-[11px] text-[rgba(80,108,92,0.55)] mt-0.5">Tu apoyo del día</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[rgba(80,108,92,0.5)] hover:bg-[rgba(90,190,145,0.1)] transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recordatorios */}
            <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(80,108,92,0.45)] px-1">
                Recordatorios de hoy
              </div>
              {reminders.length === 0 && (
                <p className="text-xs text-[rgba(80,108,92,0.6)] px-1 py-2">Todo en orden por hoy 🌱</p>
              )}
              {reminders.map((r) => {
                const isDone = done.includes(r.id)
                return (
                  <div
                    key={r.id}
                    className="flex items-start gap-2.5 rounded-2xl p-2.5 bg-white/50 border border-[rgba(90,190,145,0.1)]"
                  >
                    <button
                      onClick={() => handleToggle(r.id)}
                      className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-all ${
                        isDone
                          ? 'bg-[#137C53] border-[#137C53] text-white'
                          : 'border-[rgba(90,190,145,0.4)] text-transparent hover:border-[#137C53]'
                      }`}
                      aria-label="Marcar recordatorio"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${isDone ? 'text-[rgba(80,108,92,0.45)] line-through' : 'text-[rgba(80,108,92,0.85)]'}`}>
                        {r.text}
                      </p>
                      {r.href && r.cta && !isDone && (
                        <Link
                          href={r.href}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-[#137C53] hover:gap-1.5 transition-all"
                        >
                          {r.cta} <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* CTA al chat completo */}
            <div className="p-3 pt-0">
              <Link
                href="/copilot/"
                onClick={() => setOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold text-[#0E2418] transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #2BA470, #0E7A4E)' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Hablar con Kapi
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pista sutil */}
      <AnimatePresence>
        {hint && !open && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="mb-1 mr-1 max-w-[12rem] rounded-2xl px-3 py-2 text-[11px] leading-snug text-[rgba(80,108,92,0.85)] glass-card"
          >
            Hola 👋 tienes {pending || 'algunos'} recordatorio{pending === 1 ? '' : 's'} hoy.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón flotante */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 260, damping: 18 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => { setOpen(o => !o); setHint(false) }}
        className="relative w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #FFFFFF, #EAF5EE)',
          border: '1px solid rgba(90,190,145,0.3)',
          boxShadow: '0 8px 24px rgba(16,40,28,0.18)',
        }}
        aria-label="Abrir asistente Kapi"
      >
        {open ? (
          <X className="w-5 h-5 text-[#137C53]" />
        ) : (
          <>
            <div style={{ transform: 'scale(0.62)' }}>
              <CapybaraBot size="sm" mood="idle" showGlow={false} />
            </div>
            {pending > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D2912F] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                {pending}
              </span>
            )}
          </>
        )}
      </motion.button>
    </div>
  )
}
