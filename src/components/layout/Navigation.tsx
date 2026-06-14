'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Leaf, BarChart3, Upload, Bot, Menu, X, Zap, ChevronRight, PieChart, Trash2 } from 'lucide-react'
import { clearAnalysesFromFirestore, clearChatHistoryFromFirestore } from '@/lib/firebaseService'

const navLinks = [
  { href: '/dashboard/', label: 'Dashboard', icon: BarChart3 },
  { href: '/analisis/', label: 'Análisis', icon: PieChart },
  { href: '/upload/', label: 'Analizar Datos', icon: Upload },
  { href: '/copilot/', label: 'AI Copilot', icon: Bot },
]

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
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
      {!isLanding && <div className="h-[72px]" />}

      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: showBg
            ? 'rgba(251,244,214,0.92)'
            : 'transparent',
          backdropFilter: showBg ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: showBg ? 'blur(20px)' : 'none',
          borderBottom: showBg
            ? '1px solid rgba(90,190,145,0.1)'
            : '1px solid transparent',
          boxShadow: showBg
            ? '0 4px 24px rgba(90,110,95,0.088)'
            : 'none',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[68px]">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-[0_0_15px_rgba(90,190,145,0.4)] group-hover:shadow-[0_0_25px_rgba(90,190,145,0.6)] transition-all duration-300">
                  <Leaf className="w-5 h-5 text-[#FBF4D6]" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse-slow" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-[#13301F]">AgroFinance</span>
                <span className="font-bold text-base tracking-tight gradient-text ml-1">AI</span>
              </div>
            </Link>

            {/* Desktop Nav — perfectly centered */}
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
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* IA status badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(90,190,145,0.1)] border border-[rgba(90,190,145,0.15)]">
                <Zap className="w-3 h-3 text-[#137C53]" />
                <span className="text-xs font-semibold text-[#137C53]">IA Activa</span>
              </div>

              {/* Clear data button */}
              {hasData && (
                <button
                  onClick={handleClearData}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:text-[#FBF4D6] hover:bg-red-600 border border-red-200 hover:border-red-600 active:scale-95 transition-all cursor-pointer shadow-sm"
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
              
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden w-9 h-9 rounded-xl bg-[rgba(199,224,207,0.3)] border border-[rgba(90,190,145,0.2)] flex items-center justify-center text-[#46684F]"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-[76px] z-40 rounded-2xl border border-[rgba(90,190,145,0.15)] p-4 md:hidden"
            style={{
              background: 'rgba(251,244,214,0.97)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 8px 32px rgba(90,110,95,0.132)',
            }}
          >
            {navLinks.map((link, i) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-[rgba(80,108,92,0.8)] hover:text-[#137C53] hover:bg-[rgba(199,224,207,0.2)] transition-all"
                >
                  <link.icon className="w-4 h-4 text-[#137C53]" />
                  {link.label}
                </Link>
              </motion.div>
            ))}
            <div className="mt-3 pt-3 border-t border-[rgba(90,190,145,0.1)] space-y-2">
              {hasData && (
                <button
                  onClick={() => {
                    handleClearData()
                    setMobileOpen(false)
                  }}
                  className="w-full text-center flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-red-600 font-semibold bg-red-500/10 active:scale-95 transition-all text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpiar Datos
                </button>
              )}
              <Link
                href="/dashboard/"
                onClick={() => setMobileOpen(false)}
                className="btn-primary w-full text-center block text-sm py-3 rounded-xl"
              >
                Comenzar Ahora
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
