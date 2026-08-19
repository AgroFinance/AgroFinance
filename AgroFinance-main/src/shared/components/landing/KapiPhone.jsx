'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, ShieldCheck, LineChart, Send, FileCode, Sparkles } from 'lucide-react';

// Este componente se monta en una raíz de React aparte (ver
// ReferenceLandingShell.jsx), fuera del árbol de la app — no tiene acceso
// a ChatContext ni a useChat(). Entrega la pregunta al chat oficial vía un
// evento de window, que sí cruza esa frontera (mismo patrón que ya usa
// datosPrueba.ts para sincronizar entre instancias).
const entregarAlChatOficial = (texto) => {
  window.dispatchEvent(new CustomEvent('agrofinance:kapi-pregunta', { detail: { texto } }));
};

function KapiMark({ className, style }) {
  const color = (style && style.color) || 'currentColor';
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
  );
}

function renderKapiText(text) {
  if (typeof text !== 'string') return text;
  const pattern = /(\d[\d.,]*\s?(?:kg\s?CO₂e\s?\/\s?kg|kgCO₂e|tCO₂e|kWh|bps|L\b|%))|(EUDR(?:\sOK)?|GPS)/g;
  const parts = [];
  let last = 0, m, key = 0;
  while ((m = pattern.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={key++} className="font-bold" style={{ color: '#5ABE91' }}>{m[1]}</strong>);
    else if (m[2]) parts.push(<strong key={key++} className="font-bold" style={{ color: '#7EC8E3' }}>{m[2]}</strong>);
    last = pattern.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** El teléfono con el chat real de Kapi — conectado a /api/chat, con Dynamic Island y tarjetas flotantes. */
export default function KapiPhone() {
  const [messages, setMessages] = useState([
    {
      role: 'user',
      content: 'Kapi, procesa las facturas XML de la SUNAT de la última campaña de Palta Hass y verifica cumplimiento EUDR.',
    },
    {
      role: 'assistant',
      content: '¡Listo! Leí 12 facturas XML. Identifiqué 3,400L de diésel y 12,000 kWh (red SEIN).\n\n• Emisiones: 0.42 kg CO₂e / kg de palta.\n• Trazabilidad GPS: Libre de deforestación (EUDR OK).\n• Tienes listo el dossier para solicitar la reducción de tasa en tu Crédito Verde (SLL).',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);
  const chatInputRef = useRef(null);

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
    const siguiente = setTimeout(() => { if (vivo) setFraseIndex((i) => (i + 1) % frasesKapi.length); }, 5900);
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
    const siguiente = setTimeout(() => { if (vivo) setIslaIndex((i) => (i + 1) % actividadesIsla.length); }, 4800);
    return () => { vivo = false; [abrir, cerrar, siguiente].forEach(clearTimeout); };
  }, [islaIndex, isLoading]);

  const actividad = actividadesIsla[islaIndex];
  const islaExpandida = isLoading || islaAbierta;

  useEffect(() => {
    const c = chatContainerRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [messages, isLoading]);

  // Esta vitrina de la landing no mantiene su propia conversación: en
  // cuanto el visitante escribe algo real, se lo entrega al chat oficial
  // de Kapi (el drawer, con historial persistido) en vez de duplicar la
  // lógica de envío — así solo hay un Kapi que de verdad responde.
  const handleSendMessage = (e, presetText) => {
    if (e) e.preventDefault();
    const userText = (presetText ?? input).trim();
    if (!userText || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setIsLoading(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sigamos por aquí 🐾 — abrí el chat completo de Kapi con tu pregunta.' }]);
      setIsLoading(false);
      entregarAlChatOficial(userText);
    }, 500);
  };

  return (
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
            animate={{ width: islaExpandida ? 232 : 112, height: islaExpandida ? 42 : 30, borderRadius: 22 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.9 }}
          >
            <motion.div
              className="absolute rounded-full"
              animate={{ width: islaExpandida ? 22 : 11, height: islaExpandida ? 22 : 11, right: islaExpandida ? 12 : 14 }}
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
                          <motion.span key={i} className="w-1 h-1 rounded-full bg-emerald-400"
                            animate={{ y: [0, -3, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12 }} />
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

            <div className="relative flex items-center justify-between px-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
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
              </div>

              <AnimatePresence mode="wait">
                {fraseVisible && !isLoading && (
                  <motion.div
                    key={fraseIndex}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="px-2.5 py-1 rounded-xl bg-emerald-500 text-white text-[10px] font-semibold leading-snug shadow-md shrink-0 max-w-[150px] truncate"
                  >
                    {frasesKapi[fraseIndex]}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div ref={chatContainerRef} className="p-4 space-y-3 h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600">
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => (
                  <motion.div key={index} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
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
                  <motion.div key="typing" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start items-end gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#FBF4D6' }}>
                      <KapiMark className="w-3.5 h-3.5" style={{ color: '#0F3D2C' }} />
                    </div>
                    <div className="bg-[#173B2A] text-slate-300 text-sm px-4 py-3.5 rounded-2xl rounded-tl-sm shadow-md flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
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
  );
}
