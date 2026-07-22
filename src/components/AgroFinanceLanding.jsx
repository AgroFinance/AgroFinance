'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
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
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    const updatedMessages = [...messages, { role: 'user', content: userText }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
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
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <Link href="/" className="flex items-center gap-2">
          <Sprout className="w-8 h-8 text-emerald-600" />
          <span className="text-xl font-bold tracking-tight">AgroFinance <span className="text-emerald-600">AI</span></span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors hidden sm:block">
            Dashboard
          </Link>
          <Link href="/upload" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors hidden sm:block">
            Analizar Facturas
          </Link>
          <button 
            onClick={() => setDemoModalOpen(true)}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20"
          >
            Solicitar Demo
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative bg-gradient-to-b from-slate-900 to-emerald-950 text-white pt-20 pb-32 px-6 overflow-hidden">
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

          {/* AI Chat Widget */}
          <div className="relative z-10 w-full max-w-md mx-auto">
            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full"></div>
            <div className="relative bg-slate-800/80 backdrop-blur-xl border border-slate-700 p-6 rounded-3xl shadow-2xl space-y-6">
              
              {/* Chat Bubbles */}
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600">
                {messages.map((msg, index) => (
                  <React.Fragment key={index}>
                    {msg.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="bg-emerald-600 text-white text-sm p-4 rounded-2xl rounded-tr-sm shadow-md max-w-[85%] whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start items-end gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="bg-slate-700 text-slate-100 text-sm p-4 rounded-2xl rounded-tl-sm shadow-md max-w-[85%] whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}

                {isLoading && (
                  <div className="flex justify-start items-end gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-slate-700 text-slate-300 text-sm p-4 rounded-2xl rounded-tl-sm shadow-md flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Kapi AI está analizando...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendMessage} className="relative mt-4">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pregúntale a Kapi AI..." 
                  disabled={isLoading}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded-full py-4 pl-6 pr-14 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-2 bottom-2 w-10 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 rounded-full flex items-center justify-center transition-colors"
                >
                  <Send className="w-4 h-4 text-slate-900" />
                </button>
              </form>
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
