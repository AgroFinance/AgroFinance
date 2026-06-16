'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, X, HelpCircle, Sparkles, Check } from 'lucide-react'
import CapybaraBot from './CapybaraBot'

interface TourStep {
  title: string
  description: string
  route: string
  mood: 'idle' | 'thinking' | 'happy' | 'scanning'
  position: 'bottom-right' | 'bottom-left' | 'center'
  highlightText: string
}

const tourSteps: TourStep[] = [
  {
    title: '¡Bienvenido a AgroFinance AI! 🌱',
    description: 'Hola, soy Kapi, tu asistente de inteligencia climática. Te guiaré en un recorrido rápido de 1 minuto para que aprendas a medir y reportar la huella de carbono de tu empresa agroexportadora.',
    route: '/',
    mood: 'happy',
    position: 'center',
    highlightText: 'Inicio del recorrido'
  },
  {
    title: 'Métricas y Panel de ESG 📊',
    description: 'En este Dashboard verás tu huella consolidada en Scope 1, 2 y 3, tu Score ESG actual, metas de descarbonización y notificaciones automáticas para auditorías climáticas.',
    route: '/dashboard/',
    mood: 'idle',
    position: 'bottom-right',
    highlightText: 'Panel General'
  },
  {
    title: 'Análisis Climático y Proyecciones 📈',
    description: 'Aquí analizamos en detalle tus drivers de emisiones. Puedes ver simulaciones de transición y proyecciones de ahorro de carbono al implementar prácticas sostenibles en tu cadena de valor.',
    route: '/analisis/',
    mood: 'thinking',
    position: 'bottom-right',
    highlightText: 'Análisis Detallado'
  },
  {
    title: 'Subida e Inteligencia Documental 📂',
    description: '¡La magia ocurre aquí! Sube facturas de energía, reportes de combustible o registros de transporte. Kapi los lee, los clasifica con IA y calcula tu huella de carbono al instante.',
    route: '/upload/',
    mood: 'scanning',
    position: 'bottom-left',
    highlightText: 'Carga de Archivos'
  },
  {
    title: 'Conversa con Kapi (AI Copilot) 💬',
    description: '¡Tu chat inteligente! Pregúntame cosas como: "¿Cuál fue mi emisión Scope 3 este trimestre?" o "Genera reporte HC Perú para auditoría". Estoy conectado en tiempo real a tus datos.',
    route: '/copilot/',
    mood: 'happy',
    position: 'bottom-right',
    highlightText: 'Copilot Inteligente'
  }
]

export default function OnboardingTour() {
  const router = useRouter()
  const pathname = usePathname()
  
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isMinimized, setIsMinimized] = useState(false)
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false)

  // Load tour state from localStorage
  useEffect(() => {
    const tourStatus = localStorage.getItem('agrofinance_tour_active')
    const tourStepStr = localStorage.getItem('agrofinance_tour_step')
    const completed = localStorage.getItem('agrofinance_tour_completed')

    if (tourStatus === 'true') {
      setIsOpen(true)
      if (tourStepStr) {
        setCurrentStep(parseInt(tourStepStr, 10))
      }
    } else if (!completed && pathname === '/') {
      // Auto-trigger welcome after 2.5 seconds if they haven't completed it
      const timer = setTimeout(() => {
        setIsOpen(true)
        setCurrentStep(0)
        localStorage.setItem('agrofinance_tour_active', 'true')
        localStorage.setItem('agrofinance_tour_step', '0')
      }, 2500)
      return () => clearTimeout(timer)
    }
    setHasCheckedStatus(true)
  }, [pathname])

  // Monitor path changes to sync steps
  useEffect(() => {
    if (!isOpen || !hasCheckedStatus) return

    // Ensure we sync steps if user navigates manually or automated
    const stepRoute = tourSteps[currentStep].route
    const normalizedPath = pathname?.endsWith('/') ? pathname : `${pathname}/`
    const normalizedRoute = stepRoute.endsWith('/') ? stepRoute : `${stepRoute}/`

    if (normalizedPath !== normalizedRoute && currentStep > 0) {
      // Auto-update step if they click native navigation links during tour
      const matchingStepIndex = tourSteps.findIndex(
        step => step.route === normalizedPath || `${step.route}/` === normalizedPath
      )
      if (matchingStepIndex !== -1 && matchingStepIndex !== currentStep) {
        setCurrentStep(matchingStepIndex)
        localStorage.setItem('agrofinance_tour_step', matchingStepIndex.toString())
      }
    }
  }, [pathname, currentStep, isOpen, hasCheckedStatus])

  const startTour = () => {
    setIsOpen(true)
    setCurrentStep(0)
    setIsMinimized(false)
    localStorage.setItem('agrofinance_tour_active', 'true')
    localStorage.setItem('agrofinance_tour_step', '0')
    router.push('/')
  }

  const closeTour = () => {
    setIsOpen(false)
    localStorage.removeItem('agrofinance_tour_active')
    localStorage.removeItem('agrofinance_tour_step')
  }

  const completeTour = () => {
    setIsOpen(false)
    localStorage.removeItem('agrofinance_tour_active')
    localStorage.removeItem('agrofinance_tour_step')
    localStorage.setItem('agrofinance_tour_completed', 'true')
  }

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      localStorage.setItem('agrofinance_tour_step', nextStep.toString())
      // Automate route change
      router.push(tourSteps[nextStep].route)
    } else {
      completeTour()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1
      setCurrentStep(prevStep)
      localStorage.setItem('agrofinance_tour_step', prevStep.toString())
      // Automate route change
      router.push(tourSteps[prevStep].route)
    }
  }

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.08 }}
        onClick={startTour}
        className="fixed bottom-24 lg:bottom-6 left-6 lg:left-[17.5rem] z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-full shadow-[0_8px_30px_rgb(19,124,83,0.25)] border border-[rgba(90,190,145,0.3)] bg-gradient-to-r from-[#2BA470] to-[#137C53] text-[#FBF4D6] font-semibold text-xs transition-all duration-300"
      >
        <Sparkles className="w-4 h-4 animate-pulse" />
        Guía de Uso Kapi
      </motion.button>
    )
  }

  const currentStepData = tourSteps[currentStep]

  // Minimize toggle handler
  if (isMinimized) {
    return (
      <motion.div
        layout
        className="fixed bottom-24 lg:bottom-6 left-6 lg:left-[17.5rem] z-50 glass-card p-3 rounded-2xl flex items-center gap-3 border border-[rgba(90,190,145,0.2)] shadow-xl cursor-pointer"
        onClick={() => setIsMinimized(false)}
        whileHover={{ scale: 1.03 }}
      >
        <CapybaraBot size="sm" mood={currentStepData.mood} showGlow={false} />
        <div>
          <p className="text-[10px] uppercase font-bold text-[#137C53] tracking-wider">Tour en Pausa</p>
          <p className="text-xs font-bold text-[#13301F]">{currentStepData.title.split(' ')[0]}...</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            closeTour()
          }}
          className="w-5 h-5 rounded-full flex items-center justify-center bg-[rgba(80,108,92,0.1)] hover:bg-[rgba(80,108,92,0.2)]"
        >
          <X className="w-3 h-3 text-[#13301F]" />
        </button>
      </motion.div>
    )
  }

  const isCenter = currentStepData.position === 'center'
  const positionClasses = isCenter
    ? 'fixed inset-0 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'
    : currentStepData.position === 'bottom-left'
    ? 'fixed bottom-24 lg:bottom-6 left-6 lg:left-[17.5rem] max-w-sm w-full'
    : 'fixed bottom-24 lg:bottom-6 right-6 max-w-sm w-full'

  return (
    <AnimatePresence>
      <div className={`z-50 ${positionClasses}`}>
        {/* Fullscreen Overlay Close for center step */}
        {isCenter && (
          <div className="absolute inset-0 cursor-default" onClick={closeTour} />
        )}

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative glass-card rounded-3xl p-6 border border-[rgba(90,190,145,0.25)] shadow-2xl overflow-hidden"
          style={{
            background: 'rgba(251,244,214,0.96)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Header Controls */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-bold text-[#137C53] bg-[rgba(90,190,145,0.15)] px-2.5 py-1 rounded-full uppercase tracking-wider">
              {currentStepData.highlightText}
            </span>
            <div className="flex items-center gap-2">
              {!isCenter && (
                <button
                  onClick={() => setIsMinimized(true)}
                  className="text-xs text-[rgba(80,108,92,0.6)] hover:text-[#137C53] font-medium px-2 py-0.5 rounded hover:bg-[rgba(90,190,145,0.08)] transition-all"
                >
                  Minimizar
                </button>
              )}
              <button
                onClick={closeTour}
                className="w-7 h-7 rounded-xl flex items-center justify-center bg-[rgba(80,108,92,0.06)] hover:bg-[rgba(80,108,92,0.12)] transition-all"
              >
                <X className="w-4 h-4 text-[#13301F]" />
              </button>
            </div>
          </div>

          {/* Mascot Content */}
          <div className="flex items-start gap-4 mb-5">
            <div className="flex-shrink-0 bg-white/40 p-2.5 rounded-2xl border border-[rgba(90,190,145,0.15)]">
              <CapybaraBot size="md" mood={currentStepData.mood} showGlow />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-[#13301F] leading-snug mb-1.5">
                {currentStepData.title}
              </h3>
              <p className="text-xs text-[rgba(80,108,92,0.8)] leading-relaxed font-medium">
                {currentStepData.description}
              </p>
            </div>
          </div>

          {/* Progress Indicators and Nav buttons */}
          <div className="flex items-center justify-between border-t border-[rgba(90,190,145,0.12)] pt-4 mt-1">
            {/* Dots */}
            <div className="flex gap-1.5">
              {tourSteps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep ? 'w-5 bg-[#137C53]' : 'w-1.5 bg-[rgba(80,108,92,0.2)]'
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {currentStep > 0 ? (
                <button
                  onClick={handlePrev}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[rgba(80,108,92,0.7)] hover:text-[#13301F] hover:bg-[rgba(80,108,92,0.06)] transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Atrás
                </button>
              ) : (
                <button
                  onClick={closeTour}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-[rgba(80,108,92,0.6)] hover:text-[#c2410c] transition-all"
                >
                  Omitir
                </button>
              )}

              <button
                onClick={handleNext}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#2BA470] to-[#137C53] text-[#FBF4D6] font-bold text-xs shadow-md shadow-[rgba(19,124,83,0.15)] hover:shadow-lg hover:shadow-[rgba(19,124,83,0.22)] hover:brightness-105 active:scale-95 transition-all duration-200"
              >
                {currentStep === tourSteps.length - 1 ? (
                  <>
                    Finalizar <Check className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Siguiente <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
