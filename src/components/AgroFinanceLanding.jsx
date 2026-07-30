'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import CapybaraBot from './mascot/CapybaraBot';
import Footer from './layout/Footer';
import Logo from './layout/Logo';
import { cooperativa } from '@/lib/pilotEngine';
import { empresa, scopes, topFuentes, fmtInt } from '@/lib/analyticsData';
import { construirAcciones, reduccionTon, reduccionPct, METALL } from '@/lib/reduccionActions';
import {
  Leaf,
  LineChart,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Bot,
  Send,
  FileCode,
  Sparkles,
  Calendar,
  Building,
  Mail,
  User,
  Phone,
  X,
  Landmark,
  ClipboardCheck,
  ChevronDown,
} from 'lucide-react';

const NAV = [
  { id: 'problema', label: 'Problema' },
  { id: 'motor', label: 'Motor' },
  { id: 'transformacion', label: 'Transformación' },
  { id: 'kapi', label: 'Kapi' },
  { id: 'producto', label: 'Producto' },
  { id: 'plan', label: 'Plan' },
  { id: 'bancos', label: 'Para bancos' },
  { id: 'precios', label: 'Precios' },
];

const PROBLEMA = [
  {
    tag: 'Regulación · UE', vigente: 'dic 2025', titulo: 'EUDR entró en vigor',
    texto: 'Desde diciembre 2025, exportar a la UE exige geolocalización de origen y trazabilidad de carbono por lote. Sin esto, no hay contenedor que pase aduana europea.',
  },
  {
    tag: 'Regulación · UE', vigente: 'ene 2026', titulo: 'CBAM acelera',
    texto: 'El mecanismo de ajuste de carbono en frontera aplica gradualmente desde enero 2026. Su margen depende de demostrar emisiones bajas con datos auditables.',
  },
  {
    tag: 'Mercado · Retailers', vigente: 'hoy', titulo: 'Retailers piden reportes',
    texto: 'Tesco, Carrefour y Aldi exigen carbon disclosure auditado. Su consultora actual cobra US$30K-50K por reporte anual, sin reducir ni una tonelada real.',
  },
]

const PASOS_SOLUCION = [
  { paso: '01', titulo: 'Leemos sus facturas SUNAT', texto: 'Descarga automática de los XML de SUNAT para convertir litros de diésel y kWh reales en emisiones de Alcance 1 y 2. Sin ingreso manual de datos.', nota: 'Volúmenes físicos exactos · UBL 2.1 · factores SEIN Perú' },
  { paso: '02', titulo: 'Calculamos su huella', texto: 'Factores oficiales peruanos (MINAM-INGEI, SEIN) con metodología GHG Protocol + ISO 14064. Alcance 1, 2 y 3 cubiertos y clasificados.', nota: 'Únicos con factores Perú - matriz SEIN - MINAM-INGEI' },
  { paso: '03', titulo: 'Desbloqueamos financiamiento', texto: 'Traducimos sus resultados al formato exacto que exigen BBVA, BCP y AgroBanco, más la delimitación GPS y el QR de empaque que pide la EUDR.', nota: 'Dossier listo para comités - GPS + QR - cálculo ROSI' },
]

const TRANSFORMACION = [
  { fase: '01', badge: 'CAPTURA DE CAMPO', titulo: 'Digitalizar', texto: 'El dato nace en el campo, no en la oficina. Su operario registra desde donde está, con lo que tiene en el bolsillo.' },
  { fase: '02', badge: 'CENTRALIZACIÓN', titulo: 'Centralizar', texto: 'Cuadernos, Excel y correos dejan de vivir en sitios distintos. Una sola fuente para toda la operación, por hectárea o por módulo.' },
  { fase: '03', badge: 'HUELLA DE CARBONO', titulo: 'Automatizar', texto: 'Con el dato ya ordenado, el cálculo deja de ser un proyecto anual y pasa a correr solo, cada vez que llega un comprobante.' },
]

const AGENTE = [
  { tag: 'EUROPA', titulo: '¿Cumplo la EUDR?', texto: 'Le digo si cumple la EUDR para vender en Europa, lote por lote, con la geolocalización de sus fundos ya cargada.' },
  { tag: 'BANCA', titulo: '¿Cuánto baja mi tasa?', texto: 'Calculo cuánto bajaría su tasa de crédito según los KPIs que puede comprometer y le armo el dossier para el comité.' },
  { tag: 'OPERACIÓN', titulo: '¿Cuál es mi huella por kg?', texto: 'Le doy su huella por kilo exportado y la comparo contra el benchmark del sector, sin esperar el reporte anual.' },
]

const BANCOS_REPORTE = [
  { banco: 'BBVA Sostenibilidad', nota: 'SLL activo - primer green loan SA' },
  { banco: 'BCP', nota: 'Green Bond USD 30M - 2023' },
  { banco: 'AgroBanco Verde', nota: '€50M UE + €5M AFD disponibles' },
  { banco: 'Interbank', nota: 'Green loans agro activos' },
  { banco: 'BID Invest', nota: 'ESRS + GHG KPIs como condición' },
  { banco: 'Rabobank', nota: 'Banca agro ESG líder global' },
]

const FAQ = [
  { q: '¿De dónde salen los datos si no instalo sensores?', a: 'De sus facturas electrónicas. El carbon accounting no mide CO₂ con sensores físicos: calcula a partir de datos de actividad que su empresa ya emite. Descargamos los XML de SUNAT (UBL 2.1) y convertimos litros de diésel y kWh en emisiones de Alcance 1 y 2.' },
  { q: '¿Cuánto tiempo toma implementarlo?', a: 'Menos de 30 días desde la primera factura hasta el dossier certificado, sin instalar hardware ni contratar consultoras.' },
  { q: '¿Es lo mismo que la Huella de Carbono Perú del MINAM?', a: 'Usamos los mismos factores oficiales (MINAM-INGEI, matriz SEIN) para que su reporte sea compatible y auditable frente al programa nacional.' },
  { q: '¿Cuánto cuesta?', a: 'Desde US$300/año según alcance y tamaño de su operación. El plan gratuito le permite calcular su huella completa hoy mismo, sin tarjeta.' },
]

export default function AgroFinanceLanding() {
  const [messages, setMessages] = useState([
    {
      role: 'user',
      content: 'Kapi, procesa las facturas XML de la SUNAT de la última campaña de Palta Hass y verifica cumplimiento EUDR.'
    },
    {
      role: 'assistant',
      content: '¡Listo! Leí 12 facturas XML. Identifiqué 3,400L de diésel y 12,000 kWh (red SEIN).\n\n• Emisiones: 0.42 kg CO₂e / kg de palta.\n• Trazabilidad GPS: Libre de deforestación (EUDR OK).\n• Tienes listo el dossier para solicitar la reducción de tasa en tu Crédito Verde (SLL).'
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);
  const [demoForm, setDemoForm] = useState({ nombre: '', empresa: '', email: '', telefono: '' });
  const [faqAbierta, setFaqAbierta] = useState(0);
  const acciones = construirAcciones();
  const accionesPreview = acciones.slice(0, 3);
  const chatContainerRef = useRef(null);
  const chatInputRef = useRef(null);

  const irASeccion = (e, id, alEnfocar) => {
    if (e) e.preventDefault();
    const destino = document.getElementById(id);
    if (!destino) return;
    const y = destino.getBoundingClientRect().top + window.scrollY - 72;
    try {
      window.scrollTo({ top: y, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, y);
    }
    setTimeout(() => {
      if (Math.abs(window.scrollY - y) > 80) window.scrollTo(0, y);
      alEnfocar?.();
    }, 420);
  };

  const irAKapi = (e) =>
    irASeccion(e, 'kapi', () => chatInputRef.current?.focus({ preventScroll: true }));

  const frasesKapi = [
    'Pregúntame lo que sea sobre tu huella 🌱',
    'Leo tus facturas SUNAT en segundos',
    '¿Exportas a Europa? Te cuadro el EUDR',
    'Te digo cuánto puedes bajar tu tasa',
  ];
  const [fraseIndex, setFraseIndex] = useState(0);
  const [fraseVisible, setFraseVisible] = useState(false);

  useEffect(() => {
    if (isLoading) { setFraseVisible(false); return; }
    let vivo = true;
    const mostrar = setTimeout(() => vivo && setFraseVisible(true), 900);
    const ocultar = setTimeout(() => vivo && setFraseVisible(false), 4300);
    const siguiente = setTimeout(() => {
      if (vivo) setFraseIndex((i) => (i + 1) % frasesKapi.length);
    }, 5900);
    return () => { vivo = false; [mostrar, ocultar, siguiente].forEach(clearTimeout); };
  }, [fraseIndex, isLoading]);

  const actividadesIsla = [
    { id: 'facturas', Icono: FileCode, titulo: 'Leyendo facturas SUNAT', valor: '12/12' },
    { id: 'eudr', Icono: ShieldCheck, titulo: 'Trazabilidad EUDR', valor: 'OK' },
    { id: 'huella', Icono: Leaf, titulo: 'Huella por kg', valor: '0.42' },
  ];

  const [islaIndex, setIslaIndex] = useState(0);
  const [islaAbierta, setIslaAbierta] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    let vivo = true;
    const abrir = setTimeout(() => vivo && setIslaAbierta(true), 600);
    const cerrar = setTimeout(() => vivo && setIslaAbierta(false), 3200);
    const siguiente = setTimeout(() => {
      if (!vivo) return;
      setIslaIndex((i) => (i + 1) % actividadesIsla.length);
    }, 4800);
    return () => { vivo = false; [abrir, cerrar, siguiente].forEach(clearTimeout); };
  }, [islaIndex, isLoading]);

  const actividad = actividadesIsla[islaIndex];
  const islaExpandida = isLoading || islaAbierta;

  const scrollToBottom = () => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (e, presetText) => {
    if (e) e.preventDefault();
    const userText = (presetText ?? input).trim();
    if (!userText || isLoading) return;

    setInput('');
    const updatedMessages = [...messages, { role: 'user', content: userText }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, messages: updatedMessages }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error de conexión con Kapi AI');
      }

      const aiReply = data.response || data.reply || data.message || 'No se recibió respuesta.';
      setMessages((prev) => [...prev, { role: 'assistant', content: aiReply }]);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Hubo un inconveniente al consultar a Kapi AI: ${error.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSubmit = (e) => {
    e.preventDefault();
    setDemoSuccess(true);
    setTimeout(() => {
      setDemoSuccess(false);
      setDemoModalOpen(false);
      setDemoForm({ nombre: '', empresa: '', email: '', telefono: '' });
    }, 2800);
  };

  return (
    <div className="min-h-screen font-sans text-[#13301F]" style={{ background: '#FBF4D6' }}>
      {/* NAVBAR */}
      <nav className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 sticky top-0 z-50 bg-[#FBF4D6]/90 backdrop-blur-xl border-b border-[rgba(19,48,31,0.08)]">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo height={30} />
        </Link>

        <div className="hidden lg:flex items-center gap-6">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              onClick={n.id === 'kapi' ? irAKapi : (e) => irASeccion(e, n.id)}
              className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                n.id === 'kapi' ? '' : 'text-[rgba(19,48,31,0.65)] hover:text-[#0F3D2C]'
              }`}
              style={n.id === 'kapi' ? { color: '#137C53' } : undefined}
            >
              {n.id === 'kapi' && <KapiMark className="w-3.5 h-3.5" />}
              {n.label}
            </a>
          ))}
        </div>

        <Link
          href="/dashboard/"
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-full transition-colors shadow-md whitespace-nowrap flex items-center gap-1.5"
          style={{ background: '#137C53' }}
        >
          Entrar gratis <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </nav>

      {/* HERO */}
      <section id="kapi" className="relative pt-16 pb-24 px-4 sm:px-6 overflow-hidden scroll-mt-20" style={{ background: '#0F3D2C' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(120% 90% at 85% 100%, rgba(90,190,145,0.22), transparent 60%),
              repeating-linear-gradient(100deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 34px),
              linear-gradient(180deg, #0A2A1E 0%, #0F3D2C 45%, #0B2E21 100%)
            `,
          }}
        />
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center relative">
          <div className="space-y-7 z-10">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide" style={{ background: 'rgba(90,190,145,0.12)', border: '1px solid rgba(90,190,145,0.35)', color: '#5ABE91' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#5ABE91' }} /> KAPI AI · CLIMATECH B2B · PERÚ
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-[3.4rem] font-extrabold leading-[1.05] tracking-tight text-white">
              Financiamiento verde<br />y carbono agro,<br /><span style={{ color: '#5ABE91' }}>desde tus facturas.</span>
            </h1>
            <p className="text-lg text-white/70 max-w-lg leading-relaxed">
              Automatizamos la medición de carbono leyendo sus facturas electrónicas SUNAT (UBL 2.1). Cumple EUDR
              para Europa y baja la tasa de sus créditos con BCP, BBVA y AgroBanco.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/upload"
                className="px-8 py-3.5 text-base font-semibold rounded-full hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
                style={{ background: '#5ABE91', color: '#0F3D2C' }}
              >
                Empieza gratis <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/dashboard"
                className="px-8 py-3.5 text-base font-semibold text-white bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                Ver plataforma en acción
              </Link>
            </div>
            <div className="flex items-center gap-6 pt-2">
              <StatMini value="0.42" label="kgCO₂e por kg exportado" dark />
              <StatMini value="EUDR" label="Trazabilidad verificada" dark green />
              <StatMini value="-35 bps" label="Descuento en tasa SLL" dark />
            </div>
          </div>

          {/* Kapi Phone — chat interactivo */}
          <div className="relative z-10 w-full max-w-[360px] mx-auto">
            <div className="absolute -inset-6 rounded-full blur-3xl" style={{ background: 'rgba(19,124,83,0.18)' }} />

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
              transition={{ opacity: { delay: 0.6 }, x: { delay: 0.6 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
              className="hidden md:flex absolute -left-20 xl:-left-24 top-1/3 z-20 items-center gap-2.5 px-3.5 py-2.5 rounded-2xl backdrop-blur-md border border-white/10 shadow-xl"
              style={{ background: 'rgba(15,61,44,0.9)' }}
            >
              <span className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center"><Leaf className="w-4 h-4 text-emerald-400" /></span>
              <span className="leading-tight">
                <span className="block text-[10px] text-slate-300">Huella por kg</span>
                <span className="block text-sm font-bold text-emerald-400">0.42 kgCO₂e</span>
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0, y: [0, 9, 0] }}
              transition={{ opacity: { delay: 0.9 }, x: { delay: 0.9 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 } }}
              className="hidden md:flex absolute -right-16 xl:-right-20 top-16 z-20 items-center gap-2.5 px-3.5 py-2.5 rounded-2xl backdrop-blur-md border border-white/10 shadow-xl"
              style={{ background: 'rgba(15,61,44,0.9)' }}
            >
              <span className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-emerald-400" /></span>
              <span className="leading-tight">
                <span className="block text-[10px] text-slate-300">EUDR</span>
                <span className="block text-sm font-bold text-emerald-400">Cumple</span>
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0, y: [0, -7, 0] }}
              transition={{ opacity: { delay: 1.2 }, x: { delay: 1.2 }, y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1 } }}
              className="hidden md:flex absolute -right-20 xl:-right-24 bottom-24 z-20 items-center gap-2.5 px-3.5 py-2.5 rounded-2xl backdrop-blur-md border border-white/10 shadow-xl"
              style={{ background: 'rgba(15,61,44,0.9)' }}
            >
              <span className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center"><LineChart className="w-4 h-4 text-emerald-400" /></span>
              <span className="leading-tight">
                <span className="block text-[10px] text-slate-300">Ahorro crédito</span>
                <span className="block text-sm font-bold text-emerald-400">−35 bps</span>
              </span>
            </motion.div>

            <div
              className="relative rounded-[3.2rem] p-[3px] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.5)]"
              style={{ background: 'linear-gradient(150deg, #6b7280 0%, #1f2937 22%, #4b5563 48%, #111827 74%, #6b7280 100%)' }}
            >
              <span className="absolute -left-[3px] top-[104px] w-[3px] h-8 rounded-l bg-gradient-to-b from-slate-500 to-slate-700" />
              <span className="absolute -left-[3px] top-[150px] w-[3px] h-14 rounded-l bg-gradient-to-b from-slate-500 to-slate-700" />
              <span className="absolute -right-[3px] top-[132px] w-[3px] h-20 rounded-r bg-gradient-to-b from-slate-500 to-slate-700" />

              <div className="relative bg-black rounded-[3rem] p-2">
                <motion.div
                  className="absolute top-[14px] left-1/2 z-40 flex items-center overflow-hidden"
                  style={{ x: '-50%', background: '#000' }}
                  animate={{
                    width: islaExpandida ? 232 : 112,
                    height: islaExpandida ? 42 : 30,
                    borderRadius: 22,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.9 }}
                >
                  <motion.div
                    className="absolute rounded-full"
                    animate={{
                      width: islaExpandida ? 22 : 11,
                      height: islaExpandida ? 22 : 11,
                      right: islaExpandida ? 12 : 14,
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    style={{ background: 'radial-gradient(circle at 34% 28%, #23232a 0%, #050505 72%)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)' }}
                  >
                    <motion.span
                      className="absolute rounded-full bg-emerald-400"
                      style={{ top: '24%', left: '24%', width: '24%', height: '24%' }}
                      animate={isLoading ? { scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] } : { scale: 1, opacity: 0.85 }}
                      transition={{ duration: 0.9, repeat: isLoading ? Infinity : 0 }}
                    />
                  </motion.div>

                  <AnimatePresence mode="wait">
                    {islaExpandida && (
                      <motion.div
                        key={isLoading ? 'pensando' : actividad.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.18 }}
                        className="flex items-center gap-2 pl-3 pr-11 w-full whitespace-nowrap"
                      >
                        {isLoading ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-[10px] font-semibold text-white/90">Kapi está pensando</span>
                            <span className="flex items-center gap-0.5 ml-auto">
                              {[0, 1, 2].map((i) => (
                                <motion.span
                                  key={i}
                                  className="w-1 h-1 rounded-full bg-emerald-400"
                                  animate={{ y: [0, -3, 0] }}
                                  transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12 }}
                                />
                              ))}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                              <actividad.Icono className="w-3.5 h-3.5 text-emerald-400" />
                            </span>
                            <span className="text-[10px] font-medium text-white/80">{actividad.titulo}</span>
                            <span className="text-[11px] font-bold text-emerald-400 ml-auto">{actividad.valor}</span>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <div className="relative backdrop-blur-xl rounded-[2.55rem] overflow-hidden" style={{ background: '#0F3D2C' }}>
                  <div className="h-14" />

                  <div className="relative flex items-center gap-2.5 px-4 pb-3 border-b border-white/10">
                    <motion.div
                      className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: '#FBF4D6' }}
                      animate={isLoading ? { scale: 1 } : { scale: [1, 1.06, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <KapiMark className="w-5 h-5" style={{ color: '#0F3D2C' }} />
                    </motion.div>
                    <div>
                      <div className="text-sm font-bold text-white leading-none">Kapi</div>
                      <div className="text-[11px] text-emerald-400 mt-0.5">
                        {isLoading ? 'escribiendo…' : 'tu agente climático · en línea'}
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {fraseVisible && !isLoading && (
                        <motion.div
                          key={fraseIndex}
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.95 }}
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute right-3 top-0 max-w-[62%] px-2.5 py-1.5 rounded-xl rounded-tr-sm bg-emerald-500 text-white text-[10.5px] font-medium leading-snug shadow-lg"
                        >
                          {frasesKapi[fraseIndex]}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div ref={chatContainerRef} className="p-4 space-y-3 h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600">
                    <AnimatePresence initial={false}>
                      {messages.map((msg, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        >
                          {msg.role === 'user' ? (
                            <div className="flex justify-end">
                              <div className="text-white text-sm p-3.5 rounded-2xl rounded-tr-sm shadow-md max-w-[85%] whitespace-pre-wrap" style={{ background: '#137C53' }}>
                                {msg.content}
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-start items-end gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#FBF4D6' }}>
                                <KapiMark className="w-3.5 h-3.5" style={{ color: '#0F3D2C' }} />
                              </div>
                              <div className="bg-[#173B2A] text-slate-100 text-sm p-3.5 rounded-2xl rounded-tl-sm shadow-md max-w-[85%] whitespace-pre-wrap leading-relaxed">
                                {renderKapiText(msg.content)}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}

                      {isLoading && (
                        <motion.div
                          key="typing"
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex justify-start items-end gap-2"
                        >
                          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#FBF4D6' }}>
                            <KapiMark className="w-3.5 h-3.5" style={{ color: '#0F3D2C' }} />
                          </div>
                          <div className="bg-[#173B2A] text-slate-300 text-sm px-4 py-3.5 rounded-2xl rounded-tl-sm shadow-md flex items-center gap-1">
                            {[0, 1, 2].map((i) => (
                              <motion.span
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                                animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <form onSubmit={handleSendMessage} className="p-3 pt-0">
                    <div className="relative">
                      <input
                        ref={chatInputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pregúntale lo que sea a Kapi"
                        disabled={isLoading}
                        className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded-full py-3.5 pl-5 pr-14 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 rounded-full flex items-center justify-center transition-colors shrink-0"
                      >
                        <Send className="w-4 h-4 text-slate-900" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EL PROBLEMA */}
      <section id="problema" className="py-20 px-4 sm:px-6 scroll-mt-20" style={{ background: '#F4EDE1' }}>
        <div className="max-w-6xl mx-auto">
          <Eyebrow>El problema</Eyebrow>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 max-w-2xl">Sus compradores europeos ya decidieron por usted.</h2>
          <p className="text-[rgba(19,48,31,0.65)] max-w-2xl mb-12">
            Tres regulaciones activas están redefiniendo el comercio agroalimentario entre Perú y Europa. No son opcionales ni futuras. Ya están vigentes.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {PROBLEMA.map((p) => (
              <div key={p.titulo} className="bg-white rounded-2xl p-6 border border-[rgba(19,48,31,0.08)]">
                <span className="text-[11px] font-semibold tracking-wide text-[rgba(19,48,31,0.5)] uppercase">{p.tag}</span>
                <h3 className="text-lg font-bold mt-2 mb-2">{p.titulo}</h3>
                <p className="text-sm text-[rgba(19,48,31,0.65)] leading-relaxed mb-5">{p.texto}</p>
                <div className="pt-4 border-t border-[rgba(19,48,31,0.08)] flex items-center justify-between text-xs">
                  <span className="text-[rgba(19,48,31,0.45)] font-medium uppercase tracking-wide">{p.tag.includes('Regulación') ? 'Vigente' : 'Situación'}</span>
                  <span className="font-bold" style={{ color: '#137C53' }}>{p.vigente}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LA SOLUCIÓN */}
      <section id="motor" className="py-20 px-4 sm:px-6 scroll-mt-20" style={{ background: '#0F3D2C' }}>
        <div className="max-w-6xl mx-auto text-white">
          <Eyebrow dark>La solución</Eyebrow>
          <h2 className="text-3xl md:text-4xl font-bold mb-12 max-w-2xl">AgroFinance lo hace en 30 días.</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {PASOS_SOLUCION.map((p) => (
              <div key={p.paso}>
                <span className="text-xs font-bold tracking-widest" style={{ color: '#5ABE91' }}>PASO {p.paso}</span>
                <h3 className="text-xl font-bold mt-3 mb-3">{p.titulo}</h3>
                <p className="text-sm text-white/70 leading-relaxed mb-4">{p.texto}</p>
                <p className="text-xs font-medium" style={{ color: '#5ABE91' }}>{p.nota}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRANSFORMACIÓN */}
      <section id="transformacion" className="py-20 px-4 sm:px-6 scroll-mt-20" style={{ background: '#F4EDE1' }}>
        <div className="max-w-6xl mx-auto">
          <Eyebrow>Transformación</Eyebrow>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 max-w-2xl">De cuadernos y Excel a un sistema que se alimenta solo.</h2>
          <p className="text-[rgba(19,48,31,0.65)] max-w-2xl mb-12">
            Ninguna agroexportadora empieza con la huella de carbono. Empieza con datos dispersos en papel, WhatsApp y hojas de cálculo. El camino tiene tres tramos, y puede recorrerlos uno por uno.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {TRANSFORMACION.map((t) => (
              <div key={t.fase} className="bg-white rounded-2xl p-6 border border-[rgba(19,48,31,0.08)]">
                <span className="inline-block text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-full mb-4" style={{ background: 'rgba(19,124,83,0.1)', color: '#137C53' }}>{t.badge}</span>
                <h3 className="text-xl font-bold mb-2">{t.titulo}</h3>
                <p className="text-sm text-[rgba(19,48,31,0.65)] leading-relaxed">{t.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EL AGENTE — KAPI */}
      <section className="py-20 px-4 sm:px-6" style={{ background: '#FBF4D6' }}>
        <div className="max-w-6xl mx-auto">
          <Eyebrow>El agente</Eyebrow>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 max-w-2xl">Kapi lee, calcula y le responde.</h2>
          <p className="text-[rgba(19,48,31,0.65)] max-w-2xl mb-12">
            Su equipo no necesita aprender un software nuevo. Kapi procesa los XML, arma el cálculo y contesta en lenguaje llano lo que un comité de crédito o un comprador europeo le va a preguntar.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {AGENTE.map((a) => (
              <button
                key={a.titulo}
                onClick={irAKapi}
                className="text-left bg-white rounded-2xl p-6 border border-[rgba(19,48,31,0.08)] hover:border-[#137C53]/40 hover:shadow-md transition-all"
              >
                <span className="text-[11px] font-semibold tracking-wide text-[rgba(19,48,31,0.5)] uppercase">{a.tag}</span>
                <h3 className="text-lg font-bold mt-2 mb-2">{a.titulo}</h3>
                <p className="text-sm text-[rgba(19,48,31,0.65)] leading-relaxed">{a.texto}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* EL PRODUCTO — panel de emisiones en vivo, con datos reales */}
      <section id="producto" className="py-20 px-4 sm:px-6 scroll-mt-20" style={{ background: '#F4EDE1' }}>
        <div className="max-w-6xl mx-auto">
          <Eyebrow>El producto</Eyebrow>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 max-w-2xl">El dossier del banco, listo cuando lo pida.</h2>
          <p className="text-[rgba(19,48,31,0.65)] max-w-2xl mb-10">
            {empresa.nombre} · campaña {empresa.campania}. Los XML de SUNAT se leen sin intervención y la huella
            queda consolidada por Alcance 1, 2 y 3, siempre al día.
          </p>

          <div className="bg-white rounded-2xl border border-[rgba(19,48,31,0.08)] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[rgba(19,48,31,0.08)]">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: '#137C53' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#137C53' }} /> En vivo
              </span>
              <Link href="/dashboard/" className="text-xs font-semibold hover:underline flex items-center gap-1" style={{ color: '#137C53' }}>
                Ver panel de emisiones <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[rgba(19,48,31,0.08)]">
              <div className="px-6 py-6">
                <span className="text-xs font-semibold text-[rgba(19,48,31,0.5)] uppercase tracking-wide">Emisión total</span>
                <div className="text-3xl font-extrabold mt-1">{fmtInt(empresa.huellaTotal)} <span className="text-base font-semibold text-[rgba(19,48,31,0.5)]">tCO₂e</span></div>
              </div>
              <div className="px-6 py-6">
                <span className="text-xs font-semibold text-[rgba(19,48,31,0.5)] uppercase tracking-wide">Intensidad</span>
                <div className="text-3xl font-extrabold mt-1">{cooperativa.intensidadKgPorKg.toFixed(2)} <span className="text-base font-semibold text-[rgba(19,48,31,0.5)]">kgCO₂e/kg</span></div>
                <p className="text-xs text-[rgba(19,48,31,0.5)] mt-1">Benchmark del sector: 0.52</p>
              </div>
              <div className="px-6 py-6">
                <span className="text-xs font-semibold text-[rgba(19,48,31,0.5)] uppercase tracking-wide">Alcance</span>
                <div className="flex items-center gap-3 mt-2">
                  {scopes.map((s) => (
                    <span key={s.id} className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${s.color}1A`, color: s.color }}>
                      S{s.id} {s.pct}%
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6">
              <span className="text-xs font-semibold text-[rgba(19,48,31,0.5)] uppercase tracking-wide">Top fuentes de emisión</span>
              <div className="mt-3 space-y-2">
                {topFuentes.slice(0, 4).map((f) => (
                  <div key={f.fuenteKey} className="flex items-center gap-3 text-sm">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
                    <span className="flex-1 text-[rgba(19,48,31,0.75)] truncate">{f.fuente}</span>
                    <span className="font-semibold text-[rgba(19,48,31,0.4)] w-10 text-right">{f.pct}%</span>
                    <span className="font-bold w-24 text-right">{fmtInt(f.emisiones)} tCO₂e</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CADA TONELADA VALE DINERO */}
      <section className="py-20 px-4 sm:px-6" style={{ background: '#F4EDE1' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 max-w-xl">Cada tonelada de CO₂ que reduce vale dinero.</h2>
          <p className="text-[rgba(19,48,31,0.65)] max-w-xl mb-10">
            Reemplazamos consultorías de miles de soles por software automatizado que libera capital de trabajo.
          </p>

          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            <StatCard value="S/ 150K+" label="Ahorro en consultorías" sub="Elimina los costos anuales de auditorías estáticas y lentas." />
            <StatCard value="< 30 días" label="Reportes de exportación" sub="Formatos listos para Tesco, Carrefour y la banca local." />
            <StatCard value="100%" label="Incentivo financiero" sub="El software se paga solo con el descuento de tasa del Crédito Verde." />
          </div>

          <div className="bg-white rounded-2xl border border-[rgba(19,48,31,0.08)] overflow-hidden max-w-2xl">
            <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(19,48,31,0.08)] text-xs font-semibold text-[rgba(19,48,31,0.45)] uppercase tracking-wide">
              <span>Deuda activa (referencia)</span><span>US$25M</span>
            </div>
            <Row label="Tasa sin SLL" value="9.00% anual" />
            <Row label="Tasa con SLL (−35 bps)" value="8.65% anual" />
            <Row label="Costo AgroFinance" value="desde US$300/año" />
            <div className="flex items-center justify-between px-6 py-4" style={{ background: '#0F3D2C' }}>
              <span className="text-sm font-semibold text-white">Ahorro neto estimado</span>
              <span className="text-lg font-extrabold" style={{ color: '#5ABE91' }}>≈ US$87,500 / año</span>
            </div>
          </div>
        </div>
      </section>

      {/* PLAN DE REDUCCIÓN — widget con datos reales, dos capas */}
      <section id="plan" className="py-20 px-4 sm:px-6 scroll-mt-20" style={{ background: '#0F3D2C' }}>
        <div className="max-w-6xl mx-auto text-white">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><ClipboardCheck className="w-4.5 h-4.5" style={{ color: '#5ABE91' }} /></span>
            <Eyebrow dark>Plan de reducción</Eyebrow>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 max-w-2xl">Reducir no es un gesto verde.</h2>
          <p className="text-white/70 max-w-2xl mb-10">
            Es el covenant que activa el descuento en su tasa. El {METALL.banco} no baja la tasa por medir bien: la
            baja si se compromete a reducir {METALL.pctObjetivo}% en 12 meses. Dos capas: arriba el objetivo, abajo
            el plan de ejecución, acción por acción.
          </p>

          <div className="rounded-2xl bg-white/[0.06] border border-white/10 overflow-hidden mb-6">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/50">Meta comprometida · {METALL.banco}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(90,190,145,0.15)', color: '#5ABE91' }}>
                  Umbral bloqueado · −{METALL.bpsDescuento} bps
                </span>
              </div>
              <p className="text-lg font-bold mb-3">Reducir {METALL.pctObjetivo}% de la huella en 12 meses</p>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: '0%', background: '#5ABE91' }} />
              </div>
              <p className="text-xs text-white/50 mt-2">
                Faltan {(cooperativa.huellaTotalTon * METALL.pctObjetivo / 100).toFixed(0)} tCO₂e para activar el
                descuento sobre la línea de US${METALL.lineaAprobableUSD.toLocaleString('en-US')}.
              </p>
            </div>
            <div className="divide-y divide-white/10">
              {accionesPreview.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 px-6 py-3.5 text-sm">
                  <span className="text-white/80 truncate">{a.titulo}</span>
                  <span className="font-bold shrink-0" style={{ color: '#5ABE91' }}>{reduccionTon(a).toFixed(0)} tCO₂e</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/plan-reduccion/"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-white shadow-lg hover:opacity-90 transition-opacity"
              style={{ background: '#137C53' }}
            >
              <KapiMark className="w-4 h-4" /> Que Kapi arme el plan <ArrowRight className="w-4 h-4" />
            </Link>
            <span className="text-sm text-white/50">{acciones.length} acciones priorizadas · meta {METALL.banco} {METALL.pctObjetivo}% en 12 meses</span>
          </div>
        </div>
      </section>

      {/* EL REPORTE QUE EXIGEN LOS BANCOS */}
      <section id="bancos" className="py-20 px-4 sm:px-6 scroll-mt-20" style={{ background: '#F4EDE1' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 max-w-xl">El reporte que exigen BBVA, BCP y AgroBanco.</h2>
          <p className="text-[rgba(19,48,31,0.65)] max-w-xl mb-10">
            Generamos el formato exacto que cada banco requiere para aprobar un Sustainability-Linked Loan. Un clic, sin consultoras intermediarias.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {BANCOS_REPORTE.map((b) => (
              <div key={b.banco} className="bg-white rounded-xl p-5 border border-[rgba(19,48,31,0.08)]">
                <h3 className="font-bold text-sm mb-1">{b.banco}</h3>
                <p className="text-xs text-[rgba(19,48,31,0.55)]">{b.nota}</p>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { t: 'SUNAT UBL 2.1', s: 'Ingesta directa de comprobantes electrónicos.' },
              { t: 'ISO 14064 + GHG', s: 'Estándar mundial de contabilidad de emisiones.' },
              { t: 'HC Perú · GLOBAL G.A.P.', s: 'Compatible con lo que ya le exigen sus certificadoras.' },
            ].map((x) => (
              <div key={x.t} className="rounded-xl p-5 border border-[rgba(19,48,31,0.08)]" style={{ background: '#FBF4D6' }}>
                <h3 className="font-bold text-sm mb-1">{x.t}</h3>
                <p className="text-xs text-[rgba(19,48,31,0.55)]">{x.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRECIOS */}
      <section id="precios" className="py-20 px-4 sm:px-6 scroll-mt-20" style={{ background: '#FBF4D6' }}>
        <div className="max-w-6xl mx-auto">
          <Eyebrow>Servicios</Eyebrow>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 max-w-2xl">No vendemos reportes, vendemos respaldo.</h2>
          <p className="text-[rgba(19,48,31,0.65)] max-w-2xl mb-10">
            Tres servicios que puede contratar juntos o por separado, según lo que su operación necesite hoy.
          </p>

          <div className="mb-10 rounded-3xl p-8 md:p-10" style={{ background: '#0F3D2C' }}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-8 text-white">
              <div className="flex-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider mb-4" style={{ background: '#137C53' }}>
                  <Sparkles className="w-3.5 h-3.5" /> Plan gratuito
                </span>
                <h3 className="text-2xl md:text-3xl font-bold mb-3">Pruébelo completo hoy. Sin comercial de por medio.</h3>
                <p className="text-white/70 mb-6 max-w-xl text-sm">
                  No le pedimos que solicite una demo y espere días a que alguien la apruebe. Entra, calcula su huella con datos de prueba y se lleva el reporte. Gratis, de verdad.
                </p>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
                  {['Alcance 1, 2 y 3 completo', 'Todos los tableros y gráficos', 'Descarga en PDF, Excel y CSV', 'Kapi AI para resolver sus dudas'].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#5ABE91' }} /> {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:w-64 shrink-0 lg:border-l lg:border-white/15 lg:pl-8">
                <div className="text-4xl font-extrabold">US$ 0</div>
                <p className="text-sm text-white/50 mb-5">Sin tarjeta. Sin registro obligatorio.</p>
                <Link
                  href="/dashboard/"
                  className="flex items-center justify-center gap-2 w-full px-6 py-3.5 text-[#0F3D2C] font-bold rounded-xl transition-colors shadow-lg"
                  style={{ background: '#5ABE91' }}
                >
                  Entrar a la plataforma <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-[11px] text-white/40 mt-3 text-center">
                  Los reportes del plan gratuito llevan marca de agua.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <PriceCard icon={Bot} titulo="Captura de campo" texto="Su operario registra información directo desde el campo, por WhatsApp: foto, audio o texto. Sin apps que instalar, sin capacitación." items={['Registro por foto, audio o texto', 'Sincroniza cuando hay señal', 'Cero curva de aprendizaje']} footer="Incluido con Centralización" />
            <PriceCard icon={LineChart} destacado titulo="Centralización y digitalización" texto="Unifica cuadernos, Excel y data dispersa en un solo lugar. Por hectárea o por módulo, para exportadoras o cualquier empresa agro." items={['Un solo panel para toda su operación', 'Precio por hectárea o por módulo', 'Sin depender de Excel ni papel']} footer="$1,000 – $10,000 / año" />
            <PriceCard icon={Leaf} titulo="Cálculo de huella de carbono" texto="Clasificación de emisiones por Alcance 1, 2 y 3, con reportes listos para certificadoras y bancos." items={['Alcance 1, 2 y 3 (según plan)', 'Reportes listos para auditoría', 'Dossier para su Crédito Verde']} footer="$300 – $10,000 / año" />
          </div>
          <p className="text-xs text-[rgba(19,48,31,0.4)] mt-8">
            Rangos de referencia según benchmark del mercado (ERPs agro, consultoras y SaaS de huella de carbono). Precio final según alcance y tamaño de su operación.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6" style={{ background: '#F4EDE1' }}>
        <div className="max-w-3xl mx-auto">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-3xl md:text-4xl font-bold mb-10">Preguntas frecuentes.</h2>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <div key={f.q} className="bg-white rounded-xl border border-[rgba(19,48,31,0.08)] overflow-hidden">
                <button
                  onClick={() => setFaqAbierta(faqAbierta === i ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-semibold text-sm">{f.q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${faqAbierta === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {faqAbierta === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 text-sm text-[rgba(19,48,31,0.65)] leading-relaxed">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-4 sm:px-6" style={{ background: '#0F3D2C' }}>
        <div className="max-w-4xl mx-auto text-center space-y-8 text-white">
          <h2 className="text-4xl md:text-5xl font-bold">Convierta su cumplimiento ambiental en rentabilidad.</h2>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Únase a las agroexportadoras que ya automatizan sus reportes y aseguran capital preferencial. O simplemente entre al plan gratuito y calcule su huella hoy.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Link
              href="/dashboard/"
              className="w-full sm:w-auto px-8 py-4 font-bold text-[#0F3D2C] rounded-full hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg"
              style={{ background: '#5ABE91' }}
            >
              Entrar gratis
            </Link>
            <button
              onClick={() => setDemoModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 font-bold text-white bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors whitespace-nowrap"
            >
              Agendar demo corporativa
            </button>
          </div>
        </div>
      </section>

      <Footer />

      {/* DEMO REQUEST MODAL */}
      {demoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative space-y-6">
            <button
              onClick={() => setDemoModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {demoSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">¡Solicitud registrada!</h3>
                <p className="text-slate-600 text-sm">
                  Un especialista en financiamiento verde de AgroFinance se pondrá en contacto contigo a la brevedad.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" /> Demo personalizado
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Solicitar demo de AgroFinance</h3>
                  <p className="text-slate-500 text-xs">
                    Descubra cómo automatizar sus reportes de carbono y reducir tasas en sus créditos agrícolas SLL.
                  </p>
                </div>

                <form onSubmit={handleDemoSubmit} className="space-y-4 text-left">
                  <FormField Icon={User} label="Nombre completo" placeholder="Ej. Juan Pérez" value={demoForm.nombre} onChange={(v) => setDemoForm({ ...demoForm, nombre: v })} />
                  <FormField Icon={Building} label="Empresa / Agroexportadora" placeholder="Ej. Agrícola Chavín S.A.C." value={demoForm.empresa} onChange={(v) => setDemoForm({ ...demoForm, empresa: v })} />
                  <FormField Icon={Mail} label="Correo corporativo" type="email" placeholder="juan@agricolachavin.pe" value={demoForm.email} onChange={(v) => setDemoForm({ ...demoForm, email: v })} />
                  <FormField Icon={Phone} label="Teléfono de contacto" type="tel" placeholder="+51 987 654 321" value={demoForm.telefono} onChange={(v) => setDemoForm({ ...demoForm, telefono: v })} />

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-colors text-sm"
                  >
                    Confirmar solicitud de demo
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Piezas reutilizables ─────────────────────────────────────────────────

function renderKapiText(text) {
  if (typeof text !== 'string') return text
  const pattern = /(\d[\d.,]*\s?(?:kg\s?CO₂e\s?\/\s?kg|kgCO₂e|tCO₂e|kWh|bps|L\b|%))|(EUDR(?:\sOK)?|GPS)/g
  const parts = []
  let last = 0
  let m
  let key = 0
  while ((m = pattern.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[1]) parts.push(<strong key={key++} className="font-bold" style={{ color: '#5ABE91' }}>{m[1]}</strong>)
    else if (m[2]) parts.push(<strong key={key++} className="font-bold" style={{ color: '#7EC8E3' }}>{m[2]}</strong>)
    last = pattern.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function KapiMark({ className, style }) {
  const color = (style && style.color) || 'currentColor'
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        backgroundColor: color,
        WebkitMaskImage: 'url(/kapi-mark.png)',
        maskImage: 'url(/kapi-mark.png)',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  )
}

function Eyebrow({ children, dark }) {
  return (
    <span
      className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
      style={dark ? { background: 'rgba(255,255,255,0.1)', color: '#5ABE91' } : { background: 'rgba(19,124,83,0.1)', color: '#137C53' }}
    >
      {children}
    </span>
  )
}

function StatMini({ value, label, green, dark }) {
  const valueColor = green ? '#5ABE91' : dark ? '#FFFFFF' : '#13301F'
  return (
    <div>
      <div className="text-lg font-extrabold" style={{ color: valueColor }}>{value}</div>
      <div className={`text-[11px] leading-tight max-w-[110px] ${dark ? 'text-white/55' : 'text-[rgba(19,48,31,0.55)]'}`}>{label}</div>
    </div>
  )
}

function StatCard({ value, label, sub }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[rgba(19,48,31,0.08)] text-center">
      <div className="text-4xl font-extrabold mb-2" style={{ color: '#137C53' }}>{value}</div>
      <h3 className="text-sm font-bold mb-1.5">{label}</h3>
      <p className="text-xs text-[rgba(19,48,31,0.55)] leading-relaxed">{sub}</p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-b border-[rgba(19,48,31,0.06)] text-sm">
      <span className="text-[rgba(19,48,31,0.6)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function PriceCard({ icon: Icon, titulo, texto, items, footer, destacado }) {
  return (
    <div className={`p-8 rounded-3xl flex flex-col bg-white ${destacado ? 'border-2 shadow-lg relative' : 'border border-[rgba(19,48,31,0.1)]'}`} style={destacado ? { borderColor: '#137C53' } : undefined}>
      {destacado && (
        <span className="absolute -top-3 left-8 px-3 py-1 text-white text-xs font-bold rounded-full" style={{ background: '#137C53' }}>Más contratado</span>
      )}
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'rgba(19,124,83,0.1)' }}>
        <Icon className="w-6 h-6" style={{ color: '#137C53' }} />
      </div>
      <h3 className="text-xl font-bold mb-2">{titulo}</h3>
      <p className="text-[rgba(19,48,31,0.6)] text-sm mb-6 flex-1">{texto}</p>
      <ul className="space-y-2 mb-6">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#137C53' }} /> {item}
          </li>
        ))}
      </ul>
      <div className="pt-4 border-t border-[rgba(19,48,31,0.08)]">
        <span className="text-sm font-semibold text-[rgba(19,48,31,0.7)]">{footer}</span>
      </div>
    </div>
  )
}

function FormField({ Icon, label, placeholder, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <Icon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type={type}
          required
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
      </div>
    </div>
  )
}
