'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Upload, Bot, Menu, X, Zap, ChevronRight, PieChart, Trash2 } from 'lucide-react'
import { clearAnalysesFromFirestore, clearChatHistoryFromFirestore } from '@/lib/firebaseService'
import Logo from './Logo'

const navLinks = [
  { href: '/dashboard/', label: 'Dashboard', icon: BarChart3 },
  { href: '/analisis/', label: 'Análisis', icon: PieChart },
  { href: '/upload/', label: 'Analizar Datos', icon: Upload },
  { href: '/copilot/', label: 'AI Copilot', icon: Bot },
]

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [hasData, setHasData] = useState(false)
  const pathname = usePathname()

  // On inner pages always show background; on landing only after scroll
  const isLanding = pathname === '/'
  const showBg = !isLanding || scrolled

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    setHasData(localStorage.getItem('agrofinance_has_data') === 'true')
  }, [pathname])

  // Cierra el drawer al navegar
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  const handleClearData = async () => {
    localStorage.removeItem('agrofinance_has_data')
    localStorage.removeItem('agrofinance_tour_active')
    localStorage.removeItem('agrofinance_tour_step')
    localStorage.removeItem('agrofinance_tour_completed')

    try {
      await Promise.all([
        clearAnalysesFromFirestore(),
        clearChatHistoryFromFirestore()
      ])
    } catch (e) {
      console.error("Error resetting database state: ", e)
    }

    window.location.reload()
  }

  return (
    <>
      {/* Spacer so content never starts under the nav */}
      {!isLanding && <div className="h-[68px]" />}

      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: showBg ? 'rgba(251,244,214,0.92)' : 'transparent',
          backdropFilter: showBg ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: showBg ? 'blur(20px)' : 'none',
          borderBottom: showBg ? '1px solid rgba(90,190,145,0.1)' : '1px solid transparent',
          boxShadow: showBg ? '0 4px 24px rgba(90,110,95,0.088)' : 'none',
        }}
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[64px] gap-2">

            {/* Left cluster: hamburger (mobile) + logo */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden w-10 h-10 -ml-1 rounded-xl bg-[rgba(199,224,207,0.35)] border border-[rgba(90,190,145,0.2)] flex items-center justify-center text-[#137C53] active:scale-95 transition-transform"
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link href="/" className="flex items-center group flex-shrink-0">
                <Logo height={34} className="transition-transform duration-300 group-hover:scale-[1.03]" />
              </Link>
            </div>

            {/* Desktop Nav — centered */}
            <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              {navLinks.map((link) => {
                const active = pathname?.startsWith(link.href.replace(/\/$/, ''))
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'text-[#137C53] bg-[rgba(90,190,145,0.1)] border border-[rgba(90,190,145,0.2)]'
                        : 'text-[rgba(80,108,92,0.7)] hover:text-[#137C53] hover:bg-[rgba(199,224,207,0.2)]'
                    }`}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                )
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(90,190,145,0.1)] border border-[rgba(90,190,145,0.15)]">
                <Zap className="w-3 h-3 text-[#137C53]" />
                <span className="text-xs font-semibold text-[#137C53]">IA Activa</span>
              </div>

              {hasData && (
                <button
                  onClick={handleClearData}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:text-[#FBF4D6] hover:bg-red-600 border border-red-200 hover:border-red-600 active:scale-95 transition-all cursor-pointer shadow-sm"
                  title="Eliminar datos para simular desde cero"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar Datos</span>
                </button>
              )}

              <Link href="/dashboard/" className="hidden md:block btn-primary text-xs py-2.5 px-5 rounded-xl">
                <span className="flex items-center gap-1.5">
                  Comenzar <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Left Drawer (desplegable) */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-[55] bg-[rgba(16,40,28,0.35)] backdrop-blur-[2px] md:hidden"
            />

            {/* Panel */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed top-0 left-0 bottom-0 z-[56] w-[78%] max-w-[300px] md:hidden flex flex-col"
              style={{
                background: 'rgba(251,244,214,0.98)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderRight: '1px solid rgba(90,190,145,0.15)',
                boxShadow: '8px 0 40px rgba(16,40,28,0.14)',
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 h-[64px] border-b border-[rgba(90,190,145,0.12)]">
                <Logo height={32} />
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-9 h-9 rounded-xl bg-[rgba(199,224,207,0.35)] border border-[rgba(90,190,145,0.2)] flex items-center justify-center text-[#46684F] active:scale-95 transition-transform"
                  aria-label="Cerrar menú"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer links */}
              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
                <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-[rgba(80,108,92,0.45)]">
                  Navegación
                </div>
                {navLinks.map((link, i) => {
                  const active = pathname?.startsWith(link.href.replace(/\/$/, ''))
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.05 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setDrawerOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                          active
                            ? 'text-[#137C53] bg-[rgba(90,190,145,0.12)] border border-[rgba(90,190,145,0.2)]'
                            : 'text-[rgba(80,108,92,0.8)] hover:text-[#137C53] hover:bg-[rgba(199,224,207,0.25)]'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${active ? 'bg-[rgba(90,190,145,0.18)]' : 'bg-[rgba(199,224,207,0.3)]'}`}>
                          <link.icon className="w-4 h-4 text-[#137C53]" />
                        </span>
                        {link.label}
                        <ChevronRight className="w-4 h-4 ml-auto text-[rgba(80,108,92,0.3)]" />
                      </Link>
                    </motion.div>
                  )
                })}
              </nav>

              {/* Drawer footer */}
              <div className="px-3 pb-4 pt-3 border-t border-[rgba(90,190,145,0.1)] space-y-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(90,190,145,0.1)] border border-[rgba(90,190,145,0.15)] w-fit">
                  <Zap className="w-3 h-3 text-[#137C53]" />
                  <span className="text-xs font-semibold text-[#137C53]">IA Activa</span>
                </div>
                {hasData && (
                  <button
                    onClick={() => { handleClearData(); setDrawerOpen(false) }}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-red-600 font-semibold bg-red-500/10 active:scale-95 transition-all text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpiar Datos
                  </button>
                )}
                <Link
                  href="/dashboard/"
                  onClick={() => setDrawerOpen(false)}
                  className="btn-primary w-full text-center block text-sm py-3 rounded-xl"
                >
                  Comenzar Ahora
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
