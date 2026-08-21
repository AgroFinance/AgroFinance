import { NextResponse } from 'next/server';

// ============================================================
// Login del usuario maestro — validación en servidor
// ------------------------------------------------------------
// Antes el login no validaba nada: cualquier nombre/empresa/correo
// escrito en el formulario entraba a la plataforma sin comprobar nada,
// solo guardaba esos datos en localStorage. No existía usuario ni
// contraseña reales en ningún lado.
//
// Esta ruta compara contra MASTER_USER / MASTER_PASSWORD, definidos SOLO
// en el servidor (sin prefijo NEXT_PUBLIC_, así que nunca viajan al bundle
// del navegador — a diferencia de una variable NEXT_PUBLIC, que cualquiera
// puede leer abriendo el código fuente de la página).
//
// Es un usuario fijo, no un sistema de cuentas por empresa: alcanza para
// controlar quién entra mientras se prueba la plataforma. Firebase Auth
// (ya instalado, sin usar) es el camino cuando se necesiten cuentas reales
// por cliente.
// ============================================================

export async function POST(req) {
  try {
    const { usuario, contrasena } = await req.json();

    const MASTER_USER = process.env.MASTER_USER;
    const MASTER_PASSWORD = process.env.MASTER_PASSWORD;

    if (!MASTER_USER || !MASTER_PASSWORD) {
      return NextResponse.json(
        { error: 'El acceso maestro no está configurado en este entorno.' },
        { status: 503 },
      );
    }

    const ok =
      typeof usuario === 'string' &&
      typeof contrasena === 'string' &&
      usuario.trim().toLowerCase() === MASTER_USER.toLowerCase() &&
      contrasena === MASTER_PASSWORD;

    if (!ok) {
      // Mismo mensaje si el usuario no existe o si la clave es incorrecta:
      // no hay que darle a quien intenta entrar pistas de cuál de las dos falló.
      return NextResponse.json({ error: 'Usuario o contraseña incorrectos.' }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }
}
