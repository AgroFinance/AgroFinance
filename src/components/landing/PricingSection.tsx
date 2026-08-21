'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const pricingData = [
  {
    tier: 'Piloto',
    price: 'Gratuito',
    subtitle: 'Ideal para pymes.',
    features: ['Carga manual de Excel', 'Huella Scope 1 y 2', 'Reporte PDF simple'],
    buttonText: 'Empezar Piloto',
    buttonClass: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50',
    cardClass: 'bg-white border-gray-200'
  },
  {
    tier: 'Corporativo',
    price: 'US$ 199/mes',
    subtitle: 'Ideal para agroexportadoras. (Importe neto, sin IGV)',
    features: ['Lector automático de XML SUNAT', 'Huella Scope 1, 2 y 3', 'AI Copilot (Kapi) activo', 'Simulación de Tasa SLL'],
    buttonText: 'Probar Corporativo',
    buttonClass: 'bg-[#137C53] text-white hover:bg-[#0F6543] shadow-md border border-transparent',
    cardClass: 'bg-emerald-50/20 border-emerald-500/30 hover:bg-emerald-50/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]',
    recommended: true
  },
  {
    tier: 'Enterprise',
    price: 'Personalizado',
    subtitle: 'Ideal para corporaciones. (Importes netos, sin IGV)',
    features: ['Integración API con ERP', 'Auditoría ISO 14064', 'Conexión directa con comités bancarios', 'Soporte 24/7'],
    buttonText: 'Contactar Ventas',
    buttonClass: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50',
    cardClass: 'bg-white border-gray-200'
  }
]

export default function PricingSection() {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.15 } }
      }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-10"
    >
      {pricingData.map((plan, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, y: 30 },
            show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } }
          }}
          className={`relative flex flex-col rounded-3xl border p-8 transition-all duration-300 ${plan.cardClass}`}
        >
          {plan.recommended && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="bg-[#137C53] text-white text-[10px] font-bold uppercase tracking-widest py-1.5 px-4 rounded-full shadow-sm">
                Recomendado
              </span>
            </div>
          )}
          <h3 className="text-xl font-bold text-[#13301F] mb-1">{plan.tier}</h3>
          <div className="text-3xl font-black text-[#13301F] tracking-tight mb-2">{plan.price}</div>
          <p className="text-sm font-medium text-[rgba(80,108,92,0.6)] mb-8">{plan.subtitle}</p>
          
          <ul className="flex-1 space-y-4 mb-8">
            {plan.features.map((f, j) => (
              <li key={j} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100/50 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-[#137C53]" />
                </div>
                <span className="text-sm font-semibold text-[#13301F]/80 leading-snug">{f}</span>
              </li>
            ))}
          </ul>
          
          <a href="/dashboard/" className={`w-full py-3 rounded-xl text-sm font-bold text-center transition-all ${plan.buttonClass}`}>
            {plan.buttonText}
          </a>
        </motion.div>
      ))}
    </motion.div>
  )
}
