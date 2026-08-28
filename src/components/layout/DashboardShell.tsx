'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutGrid, Leaf, Boxes, FileText, Settings, Droplet,
  Menu, X, FileDown, Trash2, Bot, Upload, LogOut, User, Pencil, AlertTriangle, Calculator, ClipboardCheck,
  Wallet, ShieldCheck, type LucideIcon,
} from 'lucide-react'
import { clearAnalysesFromFirestore, clearChatHistoryFromFirestore } from '@/lib/firebaseService'
import { useAuth } from '@/contexts/AuthContext'
import { generarReporteCorporativo } from '@/lib/reports/corporativoReport'
import { useHuellaConsolidada } from '@/lib/huellaConsolidada'
import { auth } from '@/core/config/firebase.client'
import { guardarFuentes } from '@/lib/datosPrueba'

const BP = process.env.NEXT_PUBLIC_BASE_PATH || ''

const EMPRESA = {
  campania: '2026-2027',
}

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  match: { path: string; tab?: string }
  /** Etiqueta corta opcional a la derecha del ítem (ej. "NUEVO"). */
  badge?: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/', icon: LayoutGrid, match: { path: '/dashboard' } },
  { label: 'Analizar Datos', href: '/upload/', icon: Upload, match: { path: '/upload' } },
  { label: 'Huella de Carbono', href: '/analisis/?tab=huella', icon: Leaf, match: { path: '/analisis' } },
  { label: 'Huella Hídrica', href: '/huella-hidrica/', icon: Droplet, match: { path: '/huella-hidrica' } },
  { label: 'Plan de reducción', href: '/plan-reduccion/', icon: ClipboardCheck, match: { path: '/plan-reduccion' } },
  { label: 'Gasto ambiental', href: '/gasto-ambiental/', icon: Wallet, match: { path: '/gasto-ambiental' } },
  { label: 'Auditorías', href: '/inocuidad/', icon: ShieldCheck, match: { path: '/inocuidad' } },
  { label: '¿A qué crédito accedo?', href: '/financiamiento/', icon: Calculator, match: { path: '/financiamiento' } },
  { label: 'AI Copilot Kapi', href: '/copilot/', icon: Bot, match: { path: '/copilot' } },
  { label: 'Reportes', href: '/reportes/', icon: FileText, match: { path: '/reportes' } },
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
                  ? 'bg-white/15 text-white font-bold shadow-[inset_3px_0_0_0_#16A864]'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
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
    <div className="hidden xl:flex items-center gap-1">
      {topNavLinks.map((link) => {
        const active = pathname?.startsWith(link.match)
        return (
          <Link
            key={link.label}
            href={link.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              active
                ? 'bg-[rgba(90,190,145,0.12)] text-[#137C53] border border-[rgba(90,190,145,0.25)]'
                : 'text-[rgba(80,108,92,0.7)] hover:text-[#13301F] hover:bg-[rgba(90,190,145,0.06)]'
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
  const { huella, fuentes } = useHuellaConsolidada()

  // Ya no hay modo invitado: sin sesión (real o de administrador), fuera.
  useEffect(() => {
    if (!loading && !user) router.replace('/login/')
  }, [user, loading, router])

  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [guestName, setGuestName] = useState('Mi Empresa')
  const [showGuestTooltip, setShowGuestTooltip] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem(`agrofinance_guest_name_${auth.currentUser?.uid || 'invitado'}`)
    if (savedName) setGuestName(savedName)
  }, [])

  const handleSaveName = () => {
    if (editedName.trim()) {
      setGuestName(editedName.trim())
      localStorage.setItem(`agrofinance_guest_name_${auth.currentUser?.uid || 'invitado'}`, editedName.trim())
    }
    setIsEditingName(false)
  }


  useEffect(() => { setDrawerOpen(false) }, [pathname])
  useEffect(() => { setHasData(localStorage.getItem(`agrofinance_has_data_${auth.currentUser?.uid || 'invitado'}`) === 'true') }, [pathname])

  const handleExport = () => {
    if (onExport) {
      onExport()
    } else {
      generarReporteCorporativo({
        empresa: user?.empresa || 'Mi Empresa',
        campania: EMPRESA.campania,
        huella,
        fuentes,
      })
    }
  }

  const handleClearData = async () => {
    const uid = auth.currentUser?.uid || 'invitado'
    localStorage.removeItem(`agrofinance_has_data_${uid}`)
    localStorage.removeItem(`agrofinance_tour_active_${uid}`)
    localStorage.removeItem(`agrofinance_tour_step_${uid}`)
    localStorage.removeItem(`agrofinance_tour_completed_${uid}`)
    // guardarFuentes([]) en vez de removeItem: si la clave queda vacía/ausente,
    // leerFuentes() vuelve a caer en las 4 fuentes demo de fábrica (fallback
    // por diseño). Guardar un array vacío de verdad es lo único que deja el
    // análisis realmente en cero, sin datos precargados que lo sesguen.
    guardarFuentes([])
    try {
      await Promise.all([clearAnalysesFromFirestore(), clearChatHistoryFromFirestore()])
    } catch (e) { console.error(e) }
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-[#F4F6F2] dark:bg-[#0B1712] transition-colors">
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
        <header className="sticky top-0 z-30 h-[68px] bg-white/85 dark:bg-[#0F1D17]/90 backdrop-blur-xl border-b border-[rgba(90,190,145,0.15)] dark:border-[rgba(90,190,145,0.1)]">
          <div className="h-full px-4 sm:px-6 flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-10 h-10 -ml-1 rounded-xl bg-[rgba(199,224,207,0.4)] border border-[rgba(90,190,145,0.2)] flex items-center justify-center text-[#137C53]"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>


            <div className="min-w-0 flex-shrink-0 relative">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    onBlur={handleSaveName}
                    autoFocus
                    className="text-sm sm:text-base font-bold text-[#13301F] bg-white border border-[rgba(90,190,145,0.3)] rounded px-2 py-0.5 outline-none focus:border-[#137C53]"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <div className="text-sm sm:text-base font-bold text-[#13301F] dark:text-[#EAF6EF] truncate">
                    {user?.empresa || guestName}
                  </div>
                  {!user && (
                    <button
                      onClick={() => {
                        setEditedName(guestName)
                        setIsEditingName(true)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[rgba(80,108,92,0.5)] hover:text-[#137C53]"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <div className="relative">
                <div
                  className="text-[11px] sm:text-xs text-[rgba(80,108,92,0.6)] dark:text-[rgba(200,220,210,0.55)] truncate cursor-pointer hover:text-[#137C53] transition-colors"
                  onClick={() => setShowGuestTooltip(!showGuestTooltip)}
                >
                  {user ? `${user.nombre} · Campaña ${EMPRESA.campania}` : `Modo invitado · Campaña ${EMPRESA.campania}`}
                </div>

                <AnimatePresence>
                  {!user && showGuestTooltip && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40" onClick={() => setShowGuestTooltip(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                        className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-[rgba(90,190,145,0.2)] p-4 z-50"
                      >
                        <p className="text-xs text-[rgba(80,108,92,0.8)] mb-3">
                          Estás usando la plataforma en <strong className="text-[#13301F]">Modo Invitado</strong>. Los datos no se guardarán permanentemente.
                        </p>
                        <Link
                          href="/login/"
                          className="flex items-center justify-center w-full px-3 py-2 bg-[#137C53] text-white text-xs font-semibold rounded-lg hover:bg-[#0E7A4E] transition-colors"
                        >
                          Registrarse / Guardar progreso
                        </Link>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>


            {/* Top navigation tabs */}
            <div className="flex-1 flex justify-center">
              <Suspense fallback={null}><TopNavTabs /></Suspense>
            </div>

            <button
              onClick={() => setShowClearConfirm(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 transition-all"
              title="Eliminar datos (simular desde cero)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Limpiar</span>
            </button>

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

        {/* pb-24: deja espacio bajo el ultimo bloque para que la burbuja
            flotante de Kapi (fixed, bottom-20) nunca quede encima de una
            tarjeta o CTA al hacer scroll hasta el fondo. */}
        <main className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-24 max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>

      {/* ===== Modal Confirmación Limpiar Datos ===== */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-[rgba(11,46,33,0.55)] backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-[rgba(90,190,145,0.2)]"
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#13301F] mb-2">¿Estás seguro?</h3>
                <p className="text-sm text-[rgba(80,108,92,0.8)] mb-6">
                  Esta acción eliminará todos los datos almacenados y restablecerá la simulación desde cero. Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[rgba(90,190,145,0.25)] text-sm font-semibold text-[#13301F] hover:bg-[rgba(90,190,145,0.06)] transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setShowClearConfirm(false)
                      handleClearData()
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all shadow-sm"
                  >
                    Limpiar Datos
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
