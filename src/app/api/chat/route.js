import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, messages } = body;

    // Obtener el último mensaje del usuario
    const userMessage = message || (Array.isArray(messages) && messages[messages.length - 1]?.content) || '';

    if (!userMessage) {
      return NextResponse.json(
        { error: 'El mensaje del usuario es requerido.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'La variable de entorno GEMINI_API_KEY no está configurada.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = "Eres Kapi, el asistente de inteligencia artificial de AgroFinance AI. Tu rol es asesorar a agroexportadores peruanos en cálculo de huella de carbono (Alcances 1, 2 y 3), normativas internacionales (EUDR, CBAM), reportes para HC Perú (Minam) e incentivos de financiamiento verde (descuentos en tasas de interés de créditos agrícolas SLL con BCP, BBVA y AgroBanco).\n\nReglas estrictas de respuesta:\n- Máximo 3-4 líneas por respuesta, salvo que el usuario pida explícitamente más detalle.\n- Ve directo al punto, sin introducciones ni cierres genéricos.\n- No uses encabezados (#), negritas (**) ni listas largas. Texto plano, como una conversación de chat real.\n- Si la pregunta es simple (saludo, sí/no, dato puntual), responde en una sola frase.\n\nDatos reales del producto (NO inventes otros; si no sabes algo, dilo y ofrece contacto):\n- Plan Gratuito: sí existe y no requiere aprobación ni esperar una demo. Incluye el cálculo completo de huella (Alcances 1, 2 y 3) con datos de prueba, todos los dashboards y la descarga de reportes en PDF, Excel y CSV con marca de agua. Se entra directo desde la web.\n- El plan de pago quita la marca de agua, permite cargar los datos reales de la empresa y habilita los reportes oficiales para Minam (HC Perú) y el dossier bancario para créditos verdes (SLL).\n- Contexto de mercado: las consultoras de huella cobran entre 300 y 490 euros a una pyme, y hasta 10,000 euros con Alcance 3. Los software SaaS del rubro cobran entre 1,000 y 10,000 dólares al año. AgroFinance está pensado para ser accesible a la pyme agroexportadora peruana, que es justo el segmento que hoy queda fuera por precio.\n- Nunca digas que el plan gratuito se limita solo a Alcances 1 y 2.";

    // Intentar con modelos en orden de disponibilidad
    const candidateModels = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    let responseText = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const result = await ai.models.generateContent({
          model: modelName,
          contents: userMessage,
          config: {
            systemInstruction: systemInstruction,
            maxOutputTokens: 1024,
          },
        });
        if (result && result.text) {
          responseText = result.text;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Intento con modelo ${modelName} falló:`, err?.message || err);
      }
    }

    if (!responseText) {
      throw lastError || new Error('No se pudo generar respuesta con los modelos de Gemini.');
    }

    return NextResponse.json({
      response: responseText,
      reply: responseText,
      message: responseText
    });
  } catch (error) {
    console.error('Error en API Chat:', error);
    return NextResponse.json(
      { 
        error: 'Hubo un error al procesar tu solicitud con Kapi AI.', 
        details: error?.message || 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}
