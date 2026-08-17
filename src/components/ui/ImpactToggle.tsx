'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ShieldCheck, TrendingDown, Clock, Building2 } from 'lucide-react'

export default function ImpactToggle() {
  const [isActive, setIsActive] = useState(false)

  return (
    <div className="w-full mx-auto my-12">
      <div className="flex flex-col items-center mb-8">
        <h2 className="text-xl sm:text-2xl font-black text-[#13301F] tracking-tight mb-6 text-center">
          Diferencia Operativa
        </h2>
        
        {/* Toggle Switch */}
        <div className="relative flex items-center p-1 bg-white rounded-full border border-gray-200 shadow-sm">
          <button
            onClick={() => setIsActive(false)}
            className={`relative px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 z-10 ${
              !isActive ? 'text-[#13301F]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Gestión Tradicional
          </button>
          <button
            onClick={() => setIsActive(true)}
            className={`relative flex items-center gap-1.5 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 z-10 ${
              isActive ? 'text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {isActive && <Zap className="w-4 h-4 text-emerald-200" />} Con AgroFinance
          </button>

          {/* Animated Background Pill */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`absolute top-1 bottom-1 rounded-full ${
              isActive 
                ? 'right-1 w-[calc(50%+1rem)] bg-gradient-to-r from-emerald-500 to-[#137C53] shadow-[0_0_16px_rgba(16,185,129,0.4)]' 
                : 'left-1 w-[calc(50%-1rem)] bg-gray-100'
            }`}
            style={{ zIndex: 0 }}
          />
        </div>
      </div>

      {/* Cards Area */}
      <div className="relative min-h-[200px]">
        <AnimatePresence mode="wait">
          {!isActive ? (
            <motion.div
              key="tradicional"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {[
                { title: 'Reportes de Huella', value: '3 a 6 meses', icon: Clock, desc: 'Consultoras externas' },
                { title: 'Precisión Contable', value: 'Estimaciones', icon: Building2, desc: 'Basado en promedios' },
                { title: 'Tasas de Crédito', value: 'Estándar', icon: ShieldCheck, desc: 'Sin incentivo verde' },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[rgba(90,190,145,0.12)] p-6 flex flex-col items-center text-center opacity-70 grayscale">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4 text-gray-400">
                    <c.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">{c.title}</h3>
                  <div className="text-xl font-bold text-gray-700 mb-1">{c.value}</div>
                  <p className="text-sm text-gray-400">{c.desc}</p>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="agrofinance"
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.1 } }
              }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {[
                { title: 'Reportes de Huella', value: '5x más rápidos', highlight: 'En tiempo real', icon: Zap },
                { title: 'Precisión Contable', value: '100% exacto', highlight: 'Importes netos', icon: ShieldCheck },
                { title: 'Tasas de Crédito', value: '−35 bps', highlight: 'Desbloqueados', icon: TrendingDown },
              ].map((c, i) => (
                <motion.div
                  key={i}
                  variants={{
                    hidden: { opacity: 0, scale: 0.9, y: 20 },
                    show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } }
                  }}
                  whileHover={{ scale: 1.03 }}
                  className="group relative bg-white rounded-2xl border border-[rgba(90,190,145,0.12)] p-6 flex flex-col items-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] hover:border-[rgba(90,190,145,0.3)] hover:bg-emerald-50/50 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative z-10 w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 text-[#137C53] group-hover:scale-110 transition-transform duration-300">
                    <c.icon className="w-5 h-5" />
                  </div>
                  <h3 className="relative z-10 text-[11px] font-bold text-[rgba(80,108,92,0.6)] uppercase tracking-widest mb-2">{c.title}</h3>
                  <div className="relative z-10 text-2xl font-black text-[#13301F] mb-1">{c.value}</div>
                  <p className="relative z-10 text-sm font-semibold text-[#137C53] bg-emerald-50 px-3 py-1 rounded-full mt-2 border border-emerald-100">{c.highlight}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
