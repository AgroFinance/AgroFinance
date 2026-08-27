'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Leaf, KeyRound, User2, ArrowRight, Loader2, ArrowLeft, AlertCircle, Mail, Building2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const BP = process.env.NEXT_PUBLIC_BASE_PATH || ''

// ============================================================
// Login — una sola forma de entrar (RF: acceso multiusuario real)
// ------------------------------------------------------------
// Antes había dos mecanismos (usuario maestro fijo + cuenta real) con un
// selector, un stepper animado y Google. Con varias personas usando la
// plataforma a la vez, el usuario maestro compartido ya no alcanza: cada
// quien necesita su propia cuenta con sus propios datos aislados. Se
// simplifica a un único formulario de email/contraseña contra Firebase
// Auth (ver AuthContext), sin selector ni animaciones de más.
// ============================================================

type Accion = 'entrar' | 'crear'

export default function LoginPage() {
  const { user, loading, registrarCuenta, iniciarSesion } = useAuth()
  const router = useRouter()

  const [accion, setAccion] = useState<Accion>('entrar')
  const [nombre, setNombre] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard/')
  }, [user, loading, router])

  const mensajeError = (e: unknown): string => {
    const code = (e as { code?: string })?.code || ''
    if (code.includes('email-already-in-use')) return 'Ya existe una cuenta con ese correo. Prueba iniciar sesión.'
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Correo o contraseña incorrectos.'
    if (code.includes('weak-password')) return 'La contraseña debe tener al menos 6 caracteres.'
    if (code.includes('invalid-email')) return 'Ese correo no es válido.'
    if (code.includes('unauthorized-domain'))
      return 'Este dominio no está autorizado en Firebase. Agrégalo en Authentication → Settings → Authorized domains.'
    if (code.includes('operation-not-allowed'))
      return 'El método de acceso está desactivado en Firebase (Authentication → Sign-in method).'
    if (code.includes('api-key-not-valid') || code.includes('invalid-api-key'))
      return 'Falta la configuración de Firebase en este entorno (variables NEXT_PUBLIC_FIREBASE_*).'
    if (code.includes('network-request-failed'))
      return 'No hay conexión con Firebase. Puede que la red esté bloqueando googleapis.com.'
    if (code.includes('too-many-requests'))
      return 'Demasiados intentos seguidos. Espera un momento y vuelve a intentar.'
    return code
      ? `No se pudo completar la acción (${code}).`
      : 'No se pudo completar la acción. Intenta de nuevo.'
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.')
      return
    }
    if (accion === 'crear' && !nombre.trim()) {
      setError('Ingresa tu nombre.')
      return
    }
    if (accion === 'crear' && !empresa.trim()) {
      setError('Ingresa el nombre de tu agroexportadora.')
      return
    }

    setCargando(true)
    try {
      if (accion === 'crear') {
        await registrarCuenta(nombre.trim(), empresa.trim(), email.trim(), password)
      } else {
        await iniciarSesion(email.trim(), password)
      }
      router.replace('/dashboard/')
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }

  if (loading) return null

  const salir = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/')
  }

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

        <div className="flex flex-col items-center mb-8">
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
            {accion === 'crear' ? 'Crea tu cuenta' : 'Inicia sesión en tu cuenta'}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-[0_8px_40px_rgba(16,40,28,0.08)] p-8">
          <div className="flex justify-center gap-4 mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setAccion('entrar'); setError('') }}
              className={accion === 'entrar' ? 'text-[#137C53] underline underline-offset-4' : 'text-[rgba(80,108,92,0.5)]'}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => { setAccion('crear'); setError('') }}
              className={accion === 'crear' ? 'text-[#137C53] underline underline-offset-4' : 'text-[rgba(80,108,92,0.5)]'}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {accion === 'crear' && (
              <>
                <Field
                  label="Nombre"
                  icon={<User2 className="w-4 h-4" />}
                  type="text"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={setNombre}
                  disabled={cargando}
                  autoComplete="name"
                />
                <Field
                  label="Agroexportadora"
                  icon={<Building2 className="w-4 h-4" />}
                  type="text"
                  placeholder="Nombre de tu agroexportadora"
                  value={empresa}
                  onChange={setEmpresa}
                  disabled={cargando}
                  autoComplete="organization"
                />
              </>
            )}
            <Field
              label="Correo"
              icon={<Mail className="w-4 h-4" />}
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={setEmail}
              disabled={cargando}
              autoComplete="email"
            />
            <Field
              label="Contraseña"
              icon={<KeyRound className="w-4 h-4" />}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              disabled={cargando}
              autoComplete={accion === 'crear' ? 'new-password' : 'current-password'}
            />

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-[#1A6B45] to-[#137C53] text-white font-bold text-sm shadow-[0_4px_16px_rgba(19,124,83,0.25)] hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {cargando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {accion === 'crear' ? 'Creando cuenta…' : 'Entrando…'}</>
                : <><Leaf className="w-4 h-4" /> {accion === 'crear' ? 'Crear cuenta' : 'Ingresar al panel'} <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[rgba(80,108,92,0.45)] mt-6">
          Campaña 2026-2027 · Cada cuenta ve solo sus propios datos
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
