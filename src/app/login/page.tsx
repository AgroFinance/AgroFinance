'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Leaf, User, Building2, Mail, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const BP = process.env.NEXT_PUBLIC_BASE_PATH || ''

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const router = useRouter()

  const [nombre, setNombre] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard/')
  }, [user, loading, router])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!nombre.trim()) e.nombre = 'Ingresa tu nombre completo'
    if (!empresa.trim()) e.empresa = 'Ingresa el nombre de tu empresa'
    if (!email.trim() || !email.includes('@')) e.email = 'Ingresa un correo válido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 600))
    login(nombre.trim(), empresa.trim(), email.trim())
    router.replace('/dashboard/')
  }

  if (loading) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F2] px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center mb-4 overflow-hidden">
            <img src={`${BP}/logo.png`} alt="AgroFinance" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-2xl font-black text-[#13301F] tracking-tight">AgroFinance</h1>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#137C53] uppercase mt-0.5">Carbon Intelligence</p>
          <p className="text-sm text-[rgba(80,108,92,0.65)] mt-3 text-center">
            Ingresa tus datos para acceder a tu panel ESG
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white rounded-3xl border border-[rgba(90,190,145,0.15)] shadow-[0_8px_40px_rgba(16,40,28,0.08)] p-8"
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            <Field
              label="Nombre completo"
              icon={<User className="w-4 h-4" />}
              type="text"
              placeholder="Ej. Miguel Ríofrío"
              value={nombre}
              onChange={setNombre}
              error={errors.nombre}
            />
            <Field
              label="Empresa / Cooperativa"
              icon={<Building2 className="w-4 h-4" />}
              type="text"
              placeholder="Ej. Chavín de Huántar S.A.C."
              value={empresa}
              onChange={setEmpresa}
              error={errors.empresa}
            />
            <Field
              label="Correo electrónico"
              icon={<Mail className="w-4 h-4" />}
              type="email"
              placeholder="correo@empresa.pe"
              value={email}
              onChange={setEmail}
              error={errors.email}
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-[#1A6B45] to-[#137C53] text-white font-bold text-sm shadow-[0_4px_16px_rgba(19,124,83,0.25)] hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando…</>
                : <><Leaf className="w-4 h-4" /> Ingresar al panel <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>
        </motion.div>

        <p className="text-center text-[11px] text-[rgba(80,108,92,0.45)] mt-6">
          Campaña 2025-2026 · Datos protegidos por sesión de usuario
        </p>
      </div>
    </div>
  )
}

function Field({
  label, icon, type, placeholder, value, onChange, error,
}: {
  label: string
  icon: React.ReactNode
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#13301F] mb-1.5">{label}</label>
      <div className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border bg-[#F7FAF7] transition-all ${
        error
          ? 'border-red-300 bg-red-50'
          : 'border-[rgba(90,190,145,0.2)] focus-within:border-[#137C53] focus-within:bg-white'
      }`}>
        <span className={`flex-shrink-0 ${error ? 'text-red-400' : 'text-[rgba(80,108,92,0.4)]'}`}>{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-[#13301F] placeholder-[rgba(80,108,92,0.35)] outline-none"
        />
      </div>
      {error && <p className="text-[11px] text-red-500 mt-1 ml-1">{error}</p>}
    </div>
  )
}
