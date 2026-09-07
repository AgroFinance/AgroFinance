'use client'

// ============================================================
// AgroFinance — Bloqueo temporal de vista ("Próximamente")
// ------------------------------------------------------------
// Para módulos que siguen visibles en la navegación (el cliente sabe que
// existen y vienen) pero cuyo contenido se bloquea temporalmente — a
// pedido explícito, no por estar rotos. El contenido real se sigue
// renderizando detrás (desenfocado) para que la decisión de "qué se ve"
// sea puramente visual/temporal y no borre la lógica del módulo.
// ============================================================

import { Lock } from 'lucide-react'

export default function ProximamenteOverlay({
  titulo = 'Próximamente habilitado',
  detalle,
  children,
}: {
  titulo?: string
  detalle?: string
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-60">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/95 dark:bg-[rgba(18,40,32,0.95)] backdrop-blur-sm rounded-3xl border border-[rgba(90,190,145,0.2)] shadow-xl px-8 py-7 text-center max-w-sm mx-4">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(90,190,145,0.12)] flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-[#137C53]" />
          </div>
          <h3 className="font-bold text-[#13301F] dark:text-[#EAF6EF] text-base mb-1">{titulo}</h3>
          {detalle && <p className="text-xs text-[rgba(80,108,92,0.65)] dark:text-[rgba(200,220,210,0.6)] leading-relaxed">{detalle}</p>}
        </div>
      </div>
    </div>
  )
}
