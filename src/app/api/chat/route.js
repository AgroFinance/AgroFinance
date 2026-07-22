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

    const systemInstruction = "Eres Kapi, el asistente de inteligencia artificial de AgroFinance AI. Tu rol es asesorar a agroexportadores peruanos en cálculo de huella de carbono (Alcances 1, 2 y 3), normativas internacionales (EUDR, CBAM), reportes para HC Perú (Minam) e incentivos de financiamiento verde (descuentos en tasas de interés de créditos agrícolas SLL con BCP, BBVA y AgroBanco). Responde de forma clara, profesional y concisa.";

    // Intentar con modelos en orden de disponibilidad
    const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let responseText = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const result = await ai.models.generateContent({
          model: modelName,
          contents: userMessage,
          config: {
            systemInstruction: systemInstruction,
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
