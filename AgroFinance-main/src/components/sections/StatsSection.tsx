'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import CountUp from 'react-countup'
import Link from 'next/link'
import CapybaraBot from '@/components/mascot/CapybaraBot'
import { MessageSquare, Sparkles } from 'lucide-react'

const stats = [
  { value: 180, suffix: '+', label: 'Agroexportadoras activas', decimals: 0 },
  { value: 2.4, suffix: 'M', label: 'tCO₂e analizadas', decimals: 1 },
  { value: 99.9, suffix: '%', label: 'Precisión en reportes', decimals: 1 },
  { value: 10, suffix: 'x', label: 'Más rápido que manual', decimals: 0 },
]

const testimonials = [
  {
    quote: 'AgroFinance AI transformó cómo gestionamos nuestro reporte HC Perú. Lo que antes tomaba 3 meses, ahora lo tenemos en 2 días.',
    author: 'Carla Mendoza',
    role: 'Directora de Sostenibilidad',
    company: 'AgriExport Peru SAC',
    avatar: 'CM',
  },
  {
    quote: 'El AI Copilot identificó que nuestro transporte marítimo representaba el 67% de nuestro Scope 3. Sin IA, jamás lo hubiéramos detectado tan rápido.',
    author: 'Roberto Quispe',
    role: 'CFO & Head ESG',
    company: 'Selva Verde Exports',
    avatar: 'RQ',
  },
  {
    quote: 'El dashboard ESG de AgroFinance AI es la herramienta más elegante y poderosa que he visto para reportes climáticos en agroindustria.',
    author: 'Ana Torres',
    role: 'Gerente de Compliance',
    company: 'Costa Rica Organic',
    avatar: 'AT',
  },
]

export default function StatsSection() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 })

  return (
    <section className="relative py-28 overflow-hidden" style={{ background: 'linear-gradient(180deg, #FBF4D6 0%, #FFFFFF 50%, #FBF4D6 100%)' }}>
      {/* Decorative glow */}
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-gradient-radial from-[rgba(90,190,145,0.06)] to-transparent blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-24"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <div className="text-4xl sm:text-5xl font-black gradient-text counter-glow mb-2">
                {inView ? (
                  <CountUp
                    end={stat.value}
                    duration={2.5}
                    decimals={stat.decimals}
                    delay={i * 0.1}
                    suffix={stat.suffix}
                  />
                ) : (
                  `0${stat.suffix}`
                )}
              </div>
              <div className="text-sm text-[rgba(80,108,92,0.5)] font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonials + Mascot */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card rounded-3xl p-6 relative overflow-hidden group hover-lift"
            >
              {/* Quote mark */}
              <div className="text-5xl text-[rgba(90,190,145,0.12)] font-serif leading-none mb-4">"</div>

              <p className="text-[rgba(19,48,31,0.8)] text-sm leading-relaxed mb-6 italic">
                {t.quote}
              </p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-xs font-bold text-white">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#13301F]">{t.author}</div>
                  <div className="text-xs text-[rgba(80,108,92,0.5)]">{t.role} · {t.company}</div>
                </div>
              </div>

              {/* Hover border */}
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ border: '1px solid rgba(90,190,145,0.2)' }} />
            </motion.div>
          ))}
        </div>

        {/* AI CTA with Mascot */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-3xl border border-[rgba(90,190,145,0.15)] p-8 sm:p-12 flex flex-col lg:flex-row items-center gap-10"
        >
          <div className="flex-shrink-0">
            <CapybaraBot size="lg" mood="happy" showGlow />
          </div>
          <div className="flex-1 text-center lg:text-left">
            <div className="badge badge-emerald mb-4 inline-flex">
              <Sparkles className="w-3 h-3" />
              Kapi · Tu AI de Clima
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-[#13301F] mb-3">
              Habla con tu IA de sostenibilidad.
            </h3>
            <p className="text-[rgba(80,108,92,0.6)] mb-6 text-sm leading-relaxed">
              Kapi analiza tus emisiones, detecta riesgos climáticos y genera reportes ESG automáticamente. Disponible 24/7, en español, con contexto de tu empresa.
            </p>
            <Link href="/copilot/" className="btn-primary inline-flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4" />
              Conversar con Kapi
            </Link>
          </div>
          {/* AI chat preview */}
          <div className="hidden xl:flex flex-col gap-3 flex-shrink-0 w-72">
            {[
              { role: 'ai', text: '🌱 Tus emisiones Scope 3 aumentaron 14% este mes.' },
              { role: 'ai', text: '🚢 El transporte marítimo representa el 67% del impacto.' },
              { role: 'user', text: '¿Qué acciones puedo tomar para reducirlo?' },
            ].map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: msg.role === 'ai' ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className={`px-4 py-2.5 text-xs ${msg.role === 'ai' ? 'ai-bubble text-[rgba(80,108,92,0.9)]' : 'user-bubble text-[rgba(19,48,31,0.8)] self-end'}`}
              >
                {msg.text}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
