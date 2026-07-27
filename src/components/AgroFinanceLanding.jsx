'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import CapybaraBot from './mascot/CapybaraBot';
import {
  Leaf, 
  LineChart, 
  Sprout, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Bot,
  Send,
  FileCode,
  QrCode,
  Loader2,
  X,
  Sparkles,
  Calendar,
  Building,
  Mail,
  User,
  Phone
} from 'lucide-react';

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
  const chatContainerRef = useRef(null);
  const chatInputRef = useRef(null);

  // El salto por #ancla no es confiable (scroll-behavior:smooth falla en
  // algunos navegadores y deja el botón muerto). Scrolleamos a mano y, ya
  // que estamos, dejamos el cursor listo para escribirle a Kapi.
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
    // Si el suave no movió nada, forzamos el salto directo.
    setTimeout(() => {
      if (Math.abs(window.scrollY - y) > 80) window.scrollTo(0, y);
      alEnfocar?.();
    }, 420);
  };

  const irAKapi = (e) =>
    irASeccion(e, 'kapi', () => chatInputRef.current?.focus({ preventScroll: true }));

  // Frases que suelta Kapi para que se note que es un agente con el que se
  // puede hablar, no un dibujo decorativo.
  const frasesKapi = [
    'Pregúntame lo que sea sobre tu huella 🌱',
    'Leo tus facturas SUNAT en segundos',
    '¿Exportas a Europa? Te cuadro el EUDR',
    'Te digo cuánto puedes bajar tu tasa',
  ];
  const [fraseIndex, setFraseIndex] = useState(0);
  const [fraseVisible, setFraseVisible] = useState(false);

  // Aparece 3.4s, descansa 1.6s y pasa a la siguiente.
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

  // Live Activities que rota la Dynamic Island, como en iOS real.
  const actividadesIsla = [
    { id: 'facturas', Icono: FileCode, titulo: 'Leyendo facturas SUNAT', valor: '12/12' },
    { id: 'eudr', Icono: ShieldCheck, titulo: 'Trazabilidad EUDR', valor: 'OK' },
    { id: 'huella', Icono: Leaf, titulo: 'Huella por kg', valor: '0.42' },
  ];

  const [islaIndex, setIslaIndex] = useState(0);
  const [islaAbierta, setIslaAbierta] = useState(false);

  // Ciclo: se expande ~2.6s, se contrae ~1.6s y pasa a la siguiente actividad.
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

  // `presetText` permite disparar el chat desde las preguntas sugeridas.
  const handleSendMessage = async (e, presetText) => {
    if (e) e.preventDefault();
    const userText = (presetText ?? input).trim();
    if (!userText || isLoading) return;

    setInput('');
    const updatedMessages = [...messages, { role: 'user', content: userText }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // La barra final es obligatoria: con `trailingSlash: true`, /api/chat
      // responde 308 y el POST se pierde en el redirect.
      const res = await fetch('/api/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        {
          role: 'assistant',
          content: `Hubo un inconveniente al consultar a Kapi AI: ${error.message}`
        }
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
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/20 sticky top-0 bg-white/60 backdrop-blur-xl backdrop-saturate-150 z-50 supports-[backdrop-filter]:bg-white/55">
        <Link href="/" className="flex items-center gap-2">
          <Sprout className="w-8 h-8 text-emerald-600" />
          <span className="text-xl font-bold tracking-tight">AgroFinance <span className="text-emerald-600">AI</span></span>
        </Link>

        {/* Enlaces y CTA en grupos separados: el botón necesita su propio aire */}
        <div className="flex items-center gap-6 lg:gap-10">
          <div className="hidden sm:flex items-center gap-7 lg:gap-9">
            <a
              href="#servicios"
              onClick={(e) => irASeccion(e, 'servicios')}
              className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors"
            >
              Servicios
            </a>
            <Link href="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">
              Dashboard
            </Link>
            <Link href="/upload" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">
              Analizar Facturas
            </Link>
            <a
              href="#kapi"
              onClick={irAKapi}
              className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Kapi
            </a>
          </div>
          <button
            onClick={() => setDemoModalOpen(true)}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 whitespace-nowrap"
          >
            Solicitar Demo
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section id="kapi" className="relative bg-gradient-to-b from-slate-900 to-emerald-950 text-white pt-20 pb-32 px-6 overflow-hidden scroll-mt-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          
          {/* Hero Copy */}
          <div className="space-y-8 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-medium">
              <Bot className="w-4 h-4" />
              <span>Kapi AI · Sistema Operativo ClimateTech</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
              Financiamiento Verde y <span className="text-emerald-400">Carbono Agro</span>
            </h1>
            <p className="text-lg text-slate-300 max-w-lg leading-relaxed">
              Automatiza la medición de carbono desde tus facturas electrónicas SUNAT (UBL 2.1). Cumple con la norma EUDR para Europa y reduce las tasas de tus créditos con BCP, BBVA y AgroBanco.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/upload"
                className="px-8 py-4 text-base font-semibold text-slate-900 bg-emerald-400 rounded-full hover:bg-emerald-300 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-400/20"
              >
                Empieza ahora <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="/dashboard"
                className="px-8 py-4 text-base font-semibold text-white bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors flex items-center justify-center"
              >
                Ver plataforma en acción
              </Link>
            </div>
          </div>

          {/* AI Chat Widget — iPhone mockup */}
          <div className="relative z-10 w-full max-w-[360px] mx-auto">
            <div className="absolute -inset-6 bg-emerald-500/20 blur-3xl rounded-full" />

            {/* Tarjetas flotantes alrededor del equipo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
              transition={{ opacity: { delay: 0.6 }, x: { delay: 0.6 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
              className="hidden lg:flex absolute -left-24 top-1/3 z-20 items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-xl"
            >
              <span className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center"><Leaf className="w-4 h-4 text-emerald-400" /></span>
              <span className="leading-tight">
                <span className="block text-[10px] text-slate-400">Huella por kg</span>
                <span className="block text-sm font-bold text-emerald-400">0.42 kgCO₂e</span>
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0, y: [0, 9, 0] }}
              transition={{ opacity: { delay: 0.9 }, x: { delay: 0.9 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 } }}
              className="hidden lg:flex absolute -right-20 top-16 z-20 items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-xl"
            >
              <span className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-emerald-400" /></span>
              <span className="leading-tight">
                <span className="block text-[10px] text-slate-400">EUDR</span>
                <span className="block text-sm font-bold text-emerald-400">Cumple</span>
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0, y: [0, -7, 0] }}
              transition={{ opacity: { delay: 1.2 }, x: { delay: 1.2 }, y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1 } }}
              className="hidden lg:flex absolute -right-24 bottom-24 z-20 items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-xl"
            >
              <span className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center"><LineChart className="w-4 h-4 text-emerald-400" /></span>
              <span className="leading-tight">
                <span className="block text-[10px] text-slate-400">Ahorro crédito</span>
                <span className="block text-sm font-bold text-emerald-400">−35 bps</span>
              </span>
            </motion.div>

            {/* Chasis de titanio */}
            <div
              className="relative rounded-[3.2rem] p-[3px] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8)]"
              style={{ background: 'linear-gradient(150deg, #6b7280 0%, #1f2937 22%, #4b5563 48%, #111827 74%, #6b7280 100%)' }}
            >
              {/* Botones laterales */}
              <span className="absolute -left-[3px] top-[104px] w-[3px] h-8 rounded-l bg-gradient-to-b from-slate-500 to-slate-700" />
              <span className="absolute -left-[3px] top-[150px] w-[3px] h-14 rounded-l bg-gradient-to-b from-slate-500 to-slate-700" />
              <span className="absolute -right-[3px] top-[132px] w-[3px] h-20 rounded-r bg-gradient-to-b from-slate-500 to-slate-700" />

              <div className="relative bg-black rounded-[3rem] p-2">
                {/* ===== Dynamic Island ===== */}
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
                  {/* Lente: siempre presente, se corre al expandir */}
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

                  {/* Contenido de la Live Activity */}
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

              {/* Screen */}
              <div className="relative bg-slate-800/95 backdrop-blur-xl rounded-[2.55rem] overflow-hidden">
                {/* Deja aire para que la isla expandida no pise el header */}
                <div className="h-14" />

                {/* Chat header */}
                <div className="relative flex items-center gap-2.5 px-4 pb-3 border-b border-slate-700/70">
                  {/* El avatar respira para que se lea como agente vivo */}
                  <motion.div
                    className="relative w-9 h-9 rounded-full bg-slate-900/60 flex items-center justify-center shrink-0 overflow-hidden"
                    animate={isLoading ? { scale: 1 } : { scale: [1, 1.06, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div style={{ transform: 'scale(0.45)' }}>
                      <CapybaraBot size="sm" mood={isLoading ? 'thinking' : 'happy'} showGlow={false} />
                    </div>
                  </motion.div>
                  <div>
                    <div className="text-sm font-bold text-white leading-none">Kapi</div>
                    <div className="text-[11px] text-emerald-400 mt-0.5">
                      {isLoading ? 'escribiendo…' : 'tu agente climático · en línea'}
                    </div>
                  </div>

                  {/* Frase flotante: invita a hablarle */}
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

                {/* Chat Bubbles */}
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
                            <div className="bg-emerald-600 text-white text-sm p-3.5 rounded-2xl rounded-tr-sm shadow-md max-w-[85%] whitespace-pre-wrap">
                              {msg.content}
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-start items-end gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-900/60 flex items-center justify-center shrink-0 overflow-hidden">
                              <div style={{ transform: 'scale(0.36)' }}>
                                <CapybaraBot size="sm" mood="happy" showGlow={false} />
                              </div>
                            </div>
                            <div className="bg-slate-700 text-slate-100 text-sm p-3.5 rounded-2xl rounded-tl-sm shadow-md max-w-[85%] whitespace-pre-wrap leading-relaxed">
                              {msg.content}
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
                        <div className="w-7 h-7 rounded-full bg-slate-900/60 flex items-center justify-center shrink-0 overflow-hidden">
                          <div style={{ transform: 'scale(0.36)' }}>
                            <CapybaraBot size="sm" mood="thinking" showGlow={false} />
                          </div>
                        </div>
                        <div className="bg-slate-700 text-slate-300 text-sm px-4 py-3.5 rounded-2xl rounded-tl-sm shadow-md flex items-center gap-1">
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

                {/* Chat Input Form */}
                <form onSubmit={handleSendMessage} className="relative z-10 p-3 pt-0">
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
                    className="absolute right-4 top-1.5 bottom-1.5 w-9 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 rounded-full flex items-center justify-center transition-colors"
                  >
                    <Send className="w-4 h-4 text-slate-900" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="py-10 border-b border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Integrado con estándares y normativas clave</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale">
            <span className="text-xl font-black font-serif">SUNAT UBL 2.1</span>
            <span className="text-xl font-bold">EUDR (Europa)</span>
            <span className="text-xl font-bold">HC PERÚ (Minam)</span>
            <span className="text-xl font-bold tracking-tighter">GLOBAL G.A.P.</span>
            <span className="text-xl font-bold">ISO 14064</span>
          </div>
        </div>
      </section>

      {/* METRICS SECTION */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ahorro real e impacto financiero directo</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Reemplazamos consultorías de miles de soles por un software automatizado que libera capital de trabajo.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
            <div className="space-y-3">
              <div className="text-6xl font-extrabold text-emerald-600">S/ 150K+</div>
              <h3 className="text-lg font-bold">Ahorro en consultorías</h3>
              <p className="text-slate-500 text-sm">Elimina los costos anuales de auditorías estáticas y lentas.</p>
            </div>
            <div className="space-y-3">
              <div className="text-6xl font-extrabold text-emerald-600">&lt; 30 Días</div>
              <h3 className="text-lg font-bold">Reportes de Exportación</h3>
              <p className="text-slate-500 text-sm">Formatos listos para Tesco, Carrefour y la banca local.</p>
            </div>
            <div className="space-y-3">
              <div className="text-6xl font-extrabold text-emerald-600">100%</div>
              <h3 className="text-lg font-bold">Incentivo Financiero</h3>
              <p className="text-slate-500 text-sm">El software se paga solo con el descuento de tasa del Crédito Verde.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES CARDS SECTION */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">El motor de AgroFinance AI</h2>
            <p className="text-slate-500 max-w-2xl">Tres herramientas diseñadas para la realidad del agroexportador peruano.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                <FileCode className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex gap-2 mb-4">
                <span className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md">SUNAT</span>
                <span className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md">UBL 2.1</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Ingesta de Facturas XML</h3>
              <p className="text-slate-500 text-sm mb-6">
                Descarga automática de XMLs de SUNAT para convertir litros de diésel y kWh reales en emisiones de Alcance 1 y 2.
              </p>
              <ul className="space-y-2">
                {['Lectura de volúmenes físicos exactos', 'Factores de emisión SEIN Perú', 'Sin ingreso de datos manual'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <LineChart className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex gap-2 mb-4">
                <span className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md">Banca Local</span>
                <span className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md">Crédito Verde</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Bridge para Créditos SLL</h3>
              <p className="text-slate-500 text-sm mb-6">
                Transforma tus métricas sostenibles en dossiers certificados para reducir tasas de interés en BCP, BBVA y Agrobanco.
              </p>
              <ul className="space-y-2">
                {['Certificación de KPIs ambientales', 'Cálculo de retorno financiero (ROSI)', 'Dossier listo para comités'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <QrCode className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex gap-2 mb-4">
                <span className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md">EUDR</span>
                <span className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md">GPS / QR</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Trazabilidad y EUDR</h3>
              <p className="text-slate-500 text-sm mb-6">
                Delimitación GPS de parcelas agrícolas libre de deforestación con código QR integrado directamente en el empaque.
              </p>
              <ul className="space-y-2">
                {['Mapeo GPS de fundos y lotes', 'Generación de QR de empaque', 'Aprobado para supermercados UE'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICIOS Y PRECIOS */}
      <section id="servicios" className="py-24 bg-white scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16 max-w-2xl">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">Servicios</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">No vendemos reportes, vendemos respaldo</h2>
            <p className="text-slate-500">
              Tres servicios que puedes contratar juntos o por separado, según lo que tu operación necesite hoy.
            </p>
          </div>

          {/* PLAN GRATUITO — la queja #1 de las pymes contra la competencia
              es que no hay forma de probar sin pasar por un comercial. */}
          <div className="mb-10 rounded-3xl border-2 border-emerald-600 bg-gradient-to-br from-emerald-50 to-white p-8 md:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
              <div className="flex-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider mb-4">
                  <Sparkles className="w-3.5 h-3.5" /> Plan Gratuito
                </span>
                <h3 className="text-2xl md:text-3xl font-bold mb-3">
                  Pruébalo completo hoy. Sin comercial de por medio.
                </h3>
                <p className="text-slate-600 mb-6 max-w-xl">
                  No pedimos que solicites una demo y esperes días a que alguien te la apruebe. Entras, calculas tu
                  huella con datos de prueba y te llevas el reporte. Gratis, de verdad.
                </p>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
                  {[
                    'Alcance 1, 2 y 3 completo',
                    'Todos los tableros y gráficos',
                    'Descarga en PDF, Excel y CSV',
                    'Kapi AI para resolver tus dudas',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-800 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:w-64 shrink-0 lg:border-l lg:border-emerald-200 lg:pl-8">
                <div className="text-4xl font-extrabold text-slate-900">US$ 0</div>
                <p className="text-sm text-slate-500 mb-5">Sin tarjeta. Sin registro obligatorio.</p>
                <Link
                  href="/dashboard/"
                  className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Entrar a la plataforma <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-[11px] text-slate-400 mt-3 text-center">
                  Los reportes del plan gratuito llevan marca de agua.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Servicio 1 */}
            <div className="p-8 rounded-3xl border border-slate-200 flex flex-col">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                <Bot className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Captura de Campo</h3>
              <p className="text-slate-500 text-sm mb-6 flex-1">
                Tu operario registra información directo desde el campo, por WhatsApp: foto, audio o texto. Sin apps que instalar, sin capacitación.
              </p>
              <ul className="space-y-2 mb-6">
                {['Registro por foto, audio o texto', 'Sincroniza cuando hay señal', 'Cero curva de aprendizaje'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
              <div className="pt-4 border-t border-slate-100">
                <span className="text-sm font-semibold text-slate-400">Incluido con Centralización</span>
              </div>
            </div>

            {/* Servicio 2 */}
            <div className="p-8 rounded-3xl border-2 border-emerald-600 flex flex-col relative shadow-lg shadow-emerald-600/10">
              <span className="absolute -top-3 left-8 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">Más contratado</span>
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                <LineChart className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Centralización y Digitalización</h3>
              <p className="text-slate-500 text-sm mb-6 flex-1">
                Unifica cuadernos, Excel y data dispersa en un solo lugar. Por hectárea o por módulo, para exportadoras o cualquier empresa agro.
              </p>
              <ul className="space-y-2 mb-6">
                {['Un solo panel para toda tu operación', 'Precio por hectárea o por módulo', 'Sin depender de Excel ni papel'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
              <div className="pt-4 border-t border-slate-100">
                <span className="text-lg font-extrabold text-slate-900">$1,000 – $10,000</span>
                <span className="text-sm text-slate-400"> / año</span>
              </div>
            </div>

            {/* Servicio 3 */}
            <div className="p-8 rounded-3xl border border-slate-200 flex flex-col">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                <Leaf className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Cálculo de Huella de Carbono</h3>
              <p className="text-slate-500 text-sm mb-6 flex-1">
                Clasificación de emisiones por Alcance 1, 2 y 3, con reportes listos para certificadoras y bancos.
              </p>
              <ul className="space-y-2 mb-6">
                {['Alcance 1, 2 y 3 (según plan)', 'Reportes listos para auditoría', 'Dossier para tu Crédito Verde'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
              <div className="pt-4 border-t border-slate-100">
                <span className="text-lg font-extrabold text-slate-900">Desde $300</span>
                <span className="text-sm text-slate-400"> hasta $10,000 / año</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-8">
            Rangos de referencia según benchmark del mercado (ERPs agro, consultoras y SaaS de huella de carbono). Precio final según alcance y tamaño de tu operación.
          </p>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 bg-emerald-900 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold">Convierte tu cumplimiento ambiental en rentabilidad</h2>
          <p className="text-emerald-100 text-lg max-w-2xl mx-auto">
            Únete a las agroexportadoras que ya están automatizando sus reportes y asegurando capital preferencial.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-md mx-auto pt-4">
            <button 
              onClick={() => setDemoModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 font-bold text-emerald-900 bg-emerald-400 rounded-full hover:bg-emerald-300 transition-colors whitespace-nowrap shadow-lg"
            >
              Agendar Demo Corporativo
            </button>
          </div>
        </div>
      </section>

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
                <h3 className="text-2xl font-bold text-slate-900">¡Solicitud Registrada!</h3>
                <p className="text-slate-600 text-sm">
                  Un especialista en financiamiento verde de AgroFinance AI se pondrá en contacto contigo a la brevedad.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" /> Demo Personalizado
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Solicitar Demo de AgroFinance AI</h3>
                  <p className="text-slate-500 text-xs">
                    Descubre cómo automatizar tus reportes de carbono y reducir tasas en tus créditos agrícolas SLL.
                  </p>
                </div>

                <form onSubmit={handleDemoSubmit} className="space-y-4 text-left">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input 
                        type="text" 
                        required
                        placeholder="Ej. Juan Pérez" 
                        value={demoForm.nombre}
                        onChange={(e) => setDemoForm({ ...demoForm, nombre: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Empresa / Agroexportadora</label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input 
                        type="text" 
                        required
                        placeholder="Ej. Agrícola Chavín S.A.C." 
                        value={demoForm.empresa}
                        onChange={(e) => setDemoForm({ ...demoForm, empresa: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Correo Corporativo</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input 
                        type="email" 
                        required
                        placeholder="juan@agricolachavin.pe" 
                        value={demoForm.email}
                        onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono de Contacto</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input 
                        type="tel" 
                        required
                        placeholder="+51 987 654 321" 
                        value={demoForm.telefono}
                        onChange={(e) => setDemoForm({ ...demoForm, telefono: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-colors text-sm"
                  >
                    Confirmar Solicitud de Demo
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
