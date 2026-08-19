'use client'

import Link from 'next/link'
import { Leaf, Twitter, Linkedin, Github, ArrowUpRight } from 'lucide-react'

const links = {
  producto: [
    { label: 'Dashboard ESG', href: '/dashboard' },
    { label: 'Análisis de Datos', href: '/upload' },
    { label: 'AI Copilot', href: '/copilot' },
    { label: 'Reportes HC Perú', href: '/dashboard' },
  ],
  empresa: [
    { label: 'Acerca de nosotros', href: '/' },
    { label: 'Metodología', href: '/' },
    { label: 'Seguridad', href: '/' },
    { label: 'Blog', href: '/' },
  ],
  recursos: [
    { label: 'Documentación', href: '/' },
    { label: 'API Reference', href: '/' },
    { label: 'Casos de estudio', href: '/' },
    { label: 'Soporte', href: '/' },
  ],
}

export default function Footer() {
  return (
    <footer className="relative border-t border-[rgba(90,190,145,0.1)] bg-[#FBF4D6]">
      {/* Top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-[rgba(90,190,145,0.4)] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-[0_0_15px_rgba(90,190,145,0.3)]">
                <Leaf className="w-5 h-5 text-[#FBF4D6]" />
              </div>
              <div>
                <span className="font-bold text-lg text-[#13301F]">AgroFinance</span>
                <span className="font-bold text-lg gradient-text ml-1">AI</span>
              </div>
            </div>
            <p className="text-[rgba(80,108,92,0.6)] text-sm leading-relaxed max-w-xs mb-6">
              Plataforma de inteligencia climática para agroexportadoras. Automatiza tu huella de carbono, Scope 1/2/3, y cumplimiento ESG en minutos con IA.
            </p>
            <div className="flex items-center gap-3">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="/"
                  className="w-9 h-9 rounded-xl glass flex items-center justify-center text-[rgba(80,108,92,0.5)] hover:text-[#137C53] hover:border-[rgba(90,190,145,0.3)] transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-[rgba(80,108,92,0.4)] mb-4">
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-[rgba(80,108,92,0.6)] hover:text-[#137C53] transition-colors flex items-center gap-1 group"
                    >
                      {item.label}
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-[rgba(90,190,145,0.08)] gap-4">
          <p className="text-xs text-[rgba(80,108,92,0.35)]">
            © 2025 AgroFinance AI. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#137C53] animate-pulse" />
            <span className="text-xs text-[rgba(80,108,92,0.4)]">Sistemas operativos · 99.9% uptime</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-[rgba(80,108,92,0.35)]">
            <Link href="/" className="hover:text-[#137C53] transition-colors">Privacidad</Link>
            <Link href="/" className="hover:text-[#137C53] transition-colors">Términos</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
