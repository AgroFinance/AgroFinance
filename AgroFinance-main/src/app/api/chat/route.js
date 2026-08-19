import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// ============================================================
// Kapi AI — único punto de salida hacia Gemini
// ------------------------------------------------------------
// La clave vive SOLO aquí, en el servidor. Antes el navegador llamaba a
// Google directamente con las claves escritas en el código del cliente:
// eso las publica en el bundle, o sea a cualquiera que abra la web, y
// también quedaron dentro del export estático versionado en el repo.
//
// Esta ruta acepta tres formas de entrada para que el cliente nunca
// necesite una clave propia:
//   · { message }                    → texto suelto (turno aislado)
//   · { messages: [{role,content}] } → CONVERSACIÓN COMPLETA. Antes se
//     tomaba solo el último mensaje y se descartaba el resto, así que Kapi
//     contestaba cada turno como si fuera el primero: no podía resolver un
//     "¿y eso por qué?" ni recordar de qué cultivo se venía hablando.
//     Ahora el historial se mapea al formato multi-turno de Gemini.
//   · { parts: [...] }               → partes crudas de Gemini, que es lo
//     que necesitan la transcripción de audio y la lectura de imágenes
//     (inlineData con base64).
// ============================================================

// Cadena de respaldo. Se recorre en orden hasta que uno responda.
//
// Los tres modelos anteriores estaban rotos: 'gemini-2.5-flash' y
// 'gemini-2.0-flash' devuelven 404 (Google los retiró), así que cuando
// 'gemini-flash-latest' contestaba 503 por demanda alta —cosa que pasa— no
// quedaba ningún respaldo vivo y Kapi caía del todo delante del cliente.
// Los de esta lista están verificados contra la API.
const MODELOS = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-flash-lite-latest'];

const INSTRUCCION_KAPI =
  "Eres Kapi, el asistente de inteligencia artificial de AgroFinance AI. Tu rol es asesorar a agroexportadores peruanos en cálculo de huella de carbono (Alcances 1, 2 y 3), normativas internacionales (EUDR, CBAM), reportes para HC Perú (Minam) e incentivos de financiamiento verde (descuentos en tasas de interés de créditos agrícolas SLL con BCP, BBVA y AgroBanco).\n\nReglas estrictas de respuesta:\n- Máximo 3-4 líneas por respuesta, salvo que el usuario pida explícitamente más detalle.\n- Ve directo al punto, sin introducciones ni cierres genéricos.\n- No uses encabezados (#), negritas (**) ni listas largas. Texto plano, como una conversación de chat real.\n- Si la pregunta es simple (saludo, sí/no, dato puntual), responde en una sola frase.\n\nDatos reales del producto (NO inventes otros; si no sabes algo, dilo y ofrece contacto):\n- Plan Gratuito: sí existe y no requiere aprobación ni esperar una demo. Incluye el cálculo completo de huella (Alcances 1, 2 y 3) con datos de prueba, todos los dashboards y la descarga de reportes en PDF, Excel y CSV. Se entra directo desde la web.\n- El plan de pago permite cargar los datos reales de la empresa y habilita los reportes oficiales para Minam (HC Perú) y el dossier bancario para créditos verdes (SLL).\n- Contexto de mercado: las consultoras de huella cobran entre 300 y 490 euros a una pyme, y hasta 10,000 euros con Alcance 3. Los software SaaS del rubro cobran entre 1,000 y 10,000 dólares al año. AgroFinance está pensado para ser accesible a la pyme agroexportadora peruana, que es justo el segmento que hoy queda fuera por precio.\n- Nunca digas que el plan gratuito se limita solo a Alcances 1 y 2.";

// ============================================================
// Historial → turnos de Gemini
// ------------------------------------------------------------
// Gemini espera [{ role: 'user' | 'model', parts: [{ text }] }]. Los
// clientes de la app rotulan al asistente como 'ai' o como 'model' según
// la pantalla, así que ambos se normalizan a 'model'.
//
// Dos reglas que Gemini impone y que rompen la llamada si se ignoran:
//   · La conversación tiene que ARRANCAR con un turno de 'user'.
//   · No puede TERMINAR en 'model' — el modelo no tendría a qué responder.
// Por eso se recorta por delante y por detrás en vez de mandar el arreglo
// crudo tal como lo tenga el estado de React.
//
// Se limita a los últimos turnos para no crecer sin techo: una sesión larga
// terminaría mandando toda la charla en cada pregunta.
// ============================================================
const MAX_TURNOS = 20;

function aTurnosGemini(messages) {
  const turnos = [];
  for (const m of messages) {
    const texto = typeof m?.content === 'string' ? m.content.trim() : '';
    if (!texto) continue;
    const rol = m.role === 'user' ? 'user' : 'model';
    turnos.push({ role: rol, parts: [{ text: texto }] });
  }

  const recortado = turnos.slice(-MAX_TURNOS);
  // Arrancar en el primer turno de usuario.
  const inicio = recortado.findIndex((t) => t.role === 'user');
  if (inicio === -1) return [];
  const desdeUsuario = recortado.slice(inicio);
  // Y cerrar en un turno de usuario.
  let fin = desdeUsuario.length;
  while (fin > 0 && desdeUsuario[fin - 1].role !== 'user') fin--;
  return desdeUsuario.slice(0, fin);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, messages, parts, systemInstruction, temperature, maxOutputTokens } = body;

    // Arma el contenido según la forma que haya mandado el cliente.
    let contents;
    if (Array.isArray(parts) && parts.length) {
      contents = [{ parts }];
    } else if (Array.isArray(messages) && messages.length) {
      contents = aTurnosGemini(messages);
      if (!contents.length) {
        return NextResponse.json({ error: 'El mensaje del usuario es requerido.' }, { status: 400 });
      }
    } else {
      if (!message) {
        return NextResponse.json({ error: 'El mensaje del usuario es requerido.' }, { status: 400 });
      }
      contents = message;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // 503 y no 500: no es un fallo del código, es una dependencia sin
      // configurar. El cliente lo distingue y muestra su respuesta local
      // en vez de un error rojo delante del cliente.
      return NextResponse.json(
        {
          error: 'Kapi no está configurado en este entorno.',
          details: 'Falta la variable de entorno GEMINI_API_KEY en el servidor.',
          sinConfigurar: true,
        },
        { status: 503 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    let responseText = null;
    let lastError = null;
    for (const model of MODELOS) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: systemInstruction ?? INSTRUCCION_KAPI,
            maxOutputTokens: maxOutputTokens ?? 1024,
            ...(typeof temperature === 'number' ? { temperature } : {}),
          },
        });
        if (result && result.text) {
          responseText = result.text;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Intento con modelo ${model} falló:`, err?.message || err);
      }
    }

    if (!responseText) {
      throw lastError || new Error('No se pudo generar respuesta con los modelos de Gemini.');
    }

    return NextResponse.json({
      response: responseText,
      reply: responseText,
      message: responseText,
    });
  } catch (error) {
    console.error('Error en API Chat:', error);
    return NextResponse.json(
      {
        error: 'Hubo un error al procesar tu solicitud con Kapi AI.',
        details: error?.message || 'Error interno del servidor',
      },
      { status: 500 },
    );
  }
}
