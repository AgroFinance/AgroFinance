'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import {
  Brain, BarChart3, FileCheck2, Globe2, Zap,
  Shield, TrendingDown, Layers, ArrowRight
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI Copilot ESG',
    description: 'Asistente conversacional que analiza tus datos de emisiones y genera insights accionables en tiempo real.',
    badge: 'IA Generativa',
    color: 'blue',
    glow: 'rgba(61,127,176,0.15)',
    border: 'rgba(61,127,176,0.2)',
  },
  {
    icon: Layers,
    title: 'Scope 1, 2 y 3 Automatizado',
    description: 'Calcula automáticamente todas las categorías de emisiones desde tus datos operativos y de cadena de suministro.',
    badge: 'Automatización',
    color: 'emerald',
    glow: 'rgba(90,190,145,0.15)',
    border: 'rgba(90,190,145,0.2)',
  },
  {
    icon: FileCheck2,
    title: 'Reportes HC Perú',
    description: 'Genera reportes de Huella de Carbono certificados bajo el estándar nacional peruano con un solo clic.',
    badge: 'Certificación',
    color: 'amber',
    glow: 'rgba(210,145,47,0.12)',
    border: 'rgba(210,145,47,0.2)',
  },
  {
    icon: Globe2,
    title: 'Cumplimiento ESG Global',
    description: 'GRI, TCFD, CDP, ISO 14064 y frameworks internacionales. Cumple con todos los estándares globales de sostenibilidad.',
    badge: 'Multi-Framework',
    color: 'emerald',
    glow: 'rgba(90,190,145,0.15)',
    border: 'rgba(90,190,145,0.2)',
  },
  {
    icon: TrendingDown,
    title: 'Análisis de Riesgo Climático',
    description: 'Identifica los activos más expuestos al riesgo físico y de transición climática en tu cadena de valor.',
    badge: 'Risk Intelligence',
    color: 'red',
    glow: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.2)',
  },
  {
    icon: Zap,
    title: 'Procesamiento Instantáneo',
    description: 'Sube tus datos y obtén análisis completo de huella de carbono en minutos. Flujo de trabajo 10x más rápido.',
    badge: 'Ultra Rápido',
    color: 'neon',
    glow: 'rgba(0,255,179,0.1)',
    border: 'rgba(0,255,179,0.2)',
  },
]

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.15 })
  const Icon = feature.icon

  const colorMap: Record<string, string> = {
    blue: '#3D7FB0',
    emerald: '#137C53',
    amber: '#D2A24A',
    red: '#D9756A',
    neon: '#10B981',
  }

  const color = colorMap[feature.color] || '#137C53'

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-3xl p-6 relative overflow-hidden group cursor-default hover-lift"
      style={{ border: `1px solid ${feature.border}` }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-50"
        style={{ background: feature.glow }}
      />

      {/* Icon */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 relative"
        style={{ background: `${feature.glow}`, border: `1px solid ${feature.border}` }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>

      {/* Badge */}
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider mb-3"
        style={{
          background: `${feature.glow}`,
          border: `1px solid ${feature.border}`,
          color,
        }}
      >
        {feature.badge}
      </div>

      <h3 className="text-[#13301F] font-bold text-lg mb-3">{feature.title}</h3>
      <p className="text-[rgba(80,108,92,0.6)] text-sm leading-relaxed">{feature.description}</p>

      {/* Bottom hover line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
    </motion.div>
  )
}

export default function FeaturesSection() {
  const [titleRef, titleInView] = useInView({ triggerOnce: true, threshold: 0.2 })

  return (
    <section className="relative py-28 bg-[#FBF4D6] overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-1/2 left-0 w-96 h-96 rounded-full bg-gradient-radial from-[rgba(90,190,145,0.06)] to-transparent blur-3xl" />
      <div className="absolute top-1/2 right-0 w-96 h-96 rounded-full bg-gradient-radial from-[rgba(61,127,176,0.05)] to-transparent blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 30 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="badge badge-emerald mb-6 inline-flex">
            <Zap className="w-3 h-3" />
            Plataforma Completa
          </div>
          <h2 className="text-[2.5rem] sm:text-[3rem] font-black tracking-tight mb-5">
            <span className="text-[#13301F]">Todo lo que necesitas</span><br />
            <span className="gradient-text">para liderar en ESG.</span>
          </h2>
          <p className="text-[rgba(80,108,92,0.6)] text-lg max-w-2xl mx-auto">
            Una sola plataforma para toda tu inteligencia climática. Sin hojas de cálculo, sin consultoras costosas, sin retrasos.
          </p>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {features.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>

        {/* CTA Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center"
        >
          <a
            href="/dashboard/"
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Shield className="w-4 h-4" />
            Ver todas las funcionalidades
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
