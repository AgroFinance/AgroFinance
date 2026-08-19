'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Leaf, KeyRound, User2, ArrowRight, Loader2, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/core/providers/AuthContext'

const BP = process.env.NEXT_PUBLIC_BASE_PATH || ''

// ============================================================
// Login con usuario maestro (RF: acceso con credenciales reales)
// ------------------------------------------------------------
// Antes esta pantalla no validaba nada: cualquier nombre/empresa/correo
// entraba. Ahora usuario y contraseña se verifican en el servidor, vía
// /api/login (la contraseña nunca viaja al bundle del cliente).
//
// El stepper de abajo (Credenciales → Validando → Acceso) es el mismo
// patrón del flujo de referencia que se pidió seguir: un proceso visible
// con estado, no una pantalla que aparece/desaparece sin explicar en qué
// paso está el usuario.
// ============================================================

type Paso = 'credenciales' | 'validando' | 'acceso'

const PASOS: { id: Paso; label: string }[] = [
  { id: 'credenciales', label: 'Credenciales' },
  { id: 'validando', label: 'Validando' },
  { id: 'acceso', label: 'Acceso' },
]

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const router = useRouter()

  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [paso, setPaso] = useState<Paso>('credenciales')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard/')
  }, [user, loading, router])

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError('')
    if (!usuario.trim() || !contrasena) {
      setError('Ingresa usuario y contraseña.')
      return
    }

    setPaso('validando')
    try {
      const res = await fetch('/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuario.trim(), contrasena }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || 'No se pudo validar el acceso.')
        setPaso('credenciales')
        return
      }

      setPaso('acceso')
      // Sesión igual que antes (localStorage), pero solo se llega aquí
      // después de que el servidor confirmó la contraseña.
      login('Administrador General', 'AgroFinance', usuario.trim().toLowerCase() + '@agrofinance.ai')
      await new Promise((r) => setTimeout(r, 500))
      router.replace('/dashboard/')
    } catch {
      setError('No se pudo conectar con el servidor. Intenta de nuevo.')
      setPaso('credenciales')
    }
  }

  if (loading) return null

  const salir = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/')
  }

  const pasoActivo = PASOS.findIndex((p) => p.id === paso)

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F2] px-4">
      <button
        type="button"
        onClick={salir}
        aria-label="Volver"
        className="fixed top-5 left-5 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-[rgba(19,48,31,0.6)] hover:text-[#13301F] hover:bg-white/70 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#137C53]"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>
      <div className="w-full max-w-md">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <Link
            href="/"
            aria-label="Ir al inicio"
            className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center mb-4 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#137C53]"
          >
            <img src={`${BP}/logo.png`} alt="AgroFinance" className="w-10 h-10 object-contain" />
          </Link>
          <h1 className="text-2xl font-black text-[#13301F] tracking-tight">AgroFinance</h1>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#137C53] uppercase mt-0.5">Carbon Intelligence</p>
          <p className="text-sm text-[rgba(80,108,92,0.65)] mt-3 text-center">
            Acceso con usuario y contraseña
          </p>
        </motion.div>

        {/* Stepper del proceso de ingreso */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {PASOS.map((p, i) => {
            const activo = i === pasoActivo
            const hecho = i < pasoActivo
            return (
              <div key={p.id} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      hecho
                        ? 'bg-[#137C53] border-[#137C53] text-white'
                        : activo
                          ? 'bg-white border-[#137C53] text-[#137C53]'
                          : 'bg-white border-[rgba(90,190,145,0.3)] text-[rgba(80,108,92,0.4)]'
                    }`}
                  >
                    {hecho
                      ? <CheckCircle2 className="w-4 h-4" />
                      : activo && p.id === 'validando'
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : p.id === 'credenciales'
                          ? <KeyRound className="w-3.5 h-3.5" />
                          : <ShieldCheck className="w-3.5 h-3.5" />}
                  </div>
                  <span className={`text-[10px] font-semibold ${activo ? 'text-[#13301F]' : 'text-[rgba(80,108,92,0.5)]'}`}>
                    {p.label}
                  </span>
                </div>
                {i < PASOS.length - 1 && (
                  <div className={`w-8 h-0.5 rounded-full mb-4 ${hecho ? 'bg-[#137C53]' : 'bg-[rgba(90,190,145,0.25)]'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-[0_8px_40px_rgba(16,40,28,0.08)] p-8"
        >
          <AnimatePresence mode="wait">
            {paso === 'acceso' ? (
              <motion.div
                key="acceso"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-3 py-6"
              >
                <div className="w-12 h-12 rounded-full bg-[rgba(90,190,145,0.12)] flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-[#137C53]" />
                </div>
                <p className="text-sm font-bold text-[#13301F]">Acceso concedido</p>
                <p className="text-xs text-[rgba(80,108,92,0.6)]">Entrando al panel…</p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleSubmit}
                noValidate
                className="space-y-5"
              >
                <Field
                  label="Usuario"
                  icon={<User2 className="w-4 h-4" />}
                  type="text"
                  placeholder="admin"
                  value={usuario}
                  onChange={setUsuario}
                  disabled={paso === 'validando'}
                  autoComplete="username"
                />
                <Field
                  label="Contraseña"
                  icon={<KeyRound className="w-4 h-4" />}
                  type="password"
                  placeholder="••••••••"
                  value={contrasena}
                  onChange={setContrasena}
                  disabled={paso === 'validando'}
                  autoComplete="current-password"
                />

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={paso === 'validando'}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-[#1A6B45] to-[#137C53] text-white font-bold text-sm shadow-[0_4px_16px_rgba(19,124,83,0.25)] hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {paso === 'validando'
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Validando…</>
                    : <><Leaf className="w-4 h-4" /> Ingresar al panel <ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="text-center text-[11px] text-[rgba(80,108,92,0.45)] mt-6">
          Campaña 2026-2027 · Acceso restringido con usuario y contraseña
        </p>
      </div>
    </div>
  )
}

function Field({
  label, icon, type, placeholder, value, onChange, disabled, autoComplete,
}: {
  label: string
  icon: React.ReactNode
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  autoComplete?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#13301F] mb-1.5">{label}</label>
      <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border bg-[#F7FAF7] transition-all border-[rgba(90,190,145,0.2)] focus-within:border-[#137C53] focus-within:bg-white">
        <span className="flex-shrink-0 text-[rgba(80,108,92,0.4)]">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent text-sm text-[#13301F] placeholder-[rgba(80,108,92,0.35)] outline-none disabled:opacity-60"
        />
      </div>
    </div>
  )
}
