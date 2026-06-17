'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid, Leaf, Boxes, Landmark, FileText, Settings,
  Menu, X, FileDown, Trash2, Bot, Upload, LogOut, User,
} from 'lucide-react'
import { clearAnalysesFromFirestore, clearChatHistoryFromFirestore } from '@/lib/firebaseService'
import { useAuth } from '@/contexts/AuthContext'

const BP = process.env.NEXT_PUBLIC_BASE_PATH || ''

const EMPRESA = {
  nombre: 'Chavín de Huántar S.A.C.',
  contacto: 'Miguel Ríofrío · Jefe de SIG · Campaña 2025-2026',
  campania: '2025-2026',
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard/', icon: LayoutGrid, match: { path: '/dashboard' } },
  { label: 'Huella de Carbono', href: '/analisis/?tab=huella', icon: Leaf, match: { path: '/analisis' } },
  { label: 'Financiamiento Verde', href: '/analisis/?tab=financiamiento', icon: Landmark, match: { path: '/analisis', tab: 'financiamiento' } },
  { label: 'AI Copilot Kapi', href: '/copilot/', icon: Bot, match: { path: '/copilot' } },
  { label: 'Reportes', href: '/upload/', icon: FileText, match: { path: '/upload' } },
  { label: 'Configuración', href: '/configuracion/', icon: Settings, match: { path: '/configuracion' } },
]

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-xl bg-white/95 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
        <img src={`${BP}/logo.png`} alt="AgroFinance" className="w-7 h-7 object-contain" />
      </span>
      <span className="leading-tight">
        <span className={`block font-extrabold text-[15px] ${light ? 'text-white' : 'text-[#13301F]'}`}>AgroFinance</span>
        <span className={`block text-[9px] font-semibold tracking-[0.18em] ${light ? 'text-emerald-300/80' : 'text-[#137C53]'}`}>CARBON INTELLIGENCE</span>
      </span>
    </Link>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get('tab') || ''

  const isActive = (m: { path: string; tab?: string }) => {
    if (m.path === '__none__') return false
    const onPath = pathname?.startsWith(m.path)
    if (!onPath) return false
    if (m.tab) {
      // En /analisis distinguimos por tab; si no hay tab en la URL, 'huella' es el default
      const current = activeTab || 'huella'
      return current === m.tab
    }
    // For items without a tab specified on /analisis, active when on any tab except financiamiento
    if (m.path === '/analisis' && !m.tab) {
      const current = activeTab || 'huella'
      return current !== 'financiamiento'
    }
    return true
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 h-[68px] flex items-center border-b border-white/10">
        <Brand light />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.match)
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-white/12 text-white shadow-[inset_3px_0_0_0_#16A864]'
                  : 'text-white/55 hover:text-white hover:bg-white/8'
              }`}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#16A864] text-white tracking-wide">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-3">
        <div className="rounded-2xl bg-white/8 border border-white/10 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/45">Campaña activa</div>
          <div className="text-sm font-bold text-white mt-0.5">{EMPRESA.campania}</div>
        </div>
      </div>
    </div>
  )
}

// Quick navigation tabs for the top bar
const topNavLinks = [
  { label: 'Dashboard', href: '/dashboard/', icon: LayoutGrid, match: '/dashboard' },
  { label: 'Análisis', href: '/analisis/?tab=huella', icon: Leaf, match: '/analisis' },
  { label: 'Analizar Datos', href: '/upload/', icon: Upload, match: '/upload' },
]

function TopNavTabs() {
  const pathname = usePathname()
  return (
    <div className="hidden md:flex items-center gap-1">
      {topNavLinks.map((link) => {
        const active = pathname?.startsWith(link.match)
        return (
          <Link
            key={link.label}
            href={link.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              active
                ? 'bg-[rgba(90,190,145,0.12)] text-[#137C53] border border-[rgba(90,190,145,0.25)]'
                : 'text-[rgba(80,108,92,0.5)] hover:text-[#13301F] hover:bg-[rgba(90,190,145,0.06)]'
            }`}
          >
            <link.icon className="w-3.5 h-3.5" />
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}

interface DashboardShellProps {
  children: React.ReactNode
  title?: string
  onExport?: () => void
}

export default function DashboardShell({ children, onExport }: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [hasData, setHasData] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  // Sin bloqueo: el login es opcional. Modo invitado disponible siempre.

  useEffect(() => { setDrawerOpen(false) }, [pathname])
  useEffect(() => { setHasData(localStorage.getItem('agrofinance_has_data') === 'true') }, [pathname])

  const handleExport = () => {
    if (onExport) onExport()
    else window.print()
  }

  const handleClearData = async () => {
    localStorage.removeItem('agrofinance_has_data')
    localStorage.removeItem('agrofinance_tour_active')
    localStorage.removeItem('agrofinance_tour_step')
    localStorage.removeItem('agrofinance_tour_completed')
    try {
      await Promise.all([clearAnalysesFromFirestore(), clearChatHistoryFromFirestore()])
    } catch (e) { console.error(e) }
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-[#F4F6F2]">
      {/* Sidebar fijo (desktop) */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 z-40"
        style={{ background: 'linear-gradient(180deg, #0F3D2C 0%, #0B2E21 100%)' }}>
        <Suspense fallback={null}><SidebarContent /></Suspense>
      </aside>

      {/* Drawer (móvil) */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-[55] bg-black/40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 w-[78%] max-w-[280px] z-[56] lg:hidden"
              style={{ background: 'linear-gradient(180deg, #0F3D2C 0%, #0B2E21 100%)' }}
            >
              <Suspense fallback={null}><SidebarContent onNavigate={() => setDrawerOpen(false)} /></Suspense>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Columna de contenido */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-[68px] bg-white/85 backdrop-blur-xl border-b border-[rgba(90,190,145,0.15)]">
          <div className="h-full px-4 sm:px-6 flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-10 h-10 -ml-1 rounded-xl bg-[rgba(199,224,207,0.4)] border border-[rgba(90,190,145,0.2)] flex items-center justify-center text-[#137C53]"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0 flex-shrink-0">
              <div className="text-sm sm:text-base font-bold text-[#13301F] truncate">
                {user?.empresa || EMPRESA.nombre}
              </div>
              <div className="text-[11px] sm:text-xs text-[rgba(80,108,92,0.6)] truncate">
                {user ? `${user.nombre} · Campaña ${EMPRESA.campania}` : `Modo invitado · Campaña ${EMPRESA.campania}`}
              </div>
            </div>

            {/* Top navigation tabs */}
            <div className="flex-1 flex justify-center">
              <Suspense fallback={null}><TopNavTabs /></Suspense>
            </div>

            {hasData && (
              <button
                onClick={handleClearData}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 transition-all"
                title="Eliminar datos (simular desde cero)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Limpiar</span>
              </button>
            )}

            {/* Auth: avatar+logout si hay sesión, botón suave si es invitado */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2BA470] to-[#137C53] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none" title={`${user.nombre} · ${user.empresa}`}>
                  {user.avatarInitials}
                </div>
                <button
                  onClick={() => { logout(); router.replace('/') }}
                  title="Cerrar sesión"
                  className="w-8 h-8 rounded-xl border border-[rgba(90,190,145,0.2)] flex items-center justify-center text-[rgba(80,108,92,0.5)] hover:text-red-600 hover:border-red-200 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login/"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[rgba(90,190,145,0.25)] text-xs font-semibold text-[#137C53] hover:bg-[rgba(90,190,145,0.08)] transition-all whitespace-nowrap"
              >
                <User className="w-3.5 h-3.5" />
                Iniciar sesión
              </Link>
            )}

            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-[#13301F] text-white text-xs font-semibold hover:bg-[#0E2418] active:scale-95 transition-all whitespace-nowrap"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar reporte PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
