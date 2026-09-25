import { NextResponse } from 'next/server';

// Descarga el contenido binario de UN archivo de Drive ya listado por
// /api/drive/listar — separado de esa ruta porque bajar 100 archivos en
// una sola respuesta agotaría memoria/tiempo de la función; el cliente pide
// uno a la vez y los va encolando igual que con el selector de carpeta.
export async function GET(req: Request) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_DRIVE_API_KEY no está configurada.' }, { status: 501 });
  }

  const fileId = new URL(req.url).searchParams.get('fileId') || '';
  if (!fileId) {
    return NextResponse.json({ error: 'Falta fileId.' }, { status: 400 });
  }

  const url = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}`);
  url.searchParams.set('alt', 'media');
  url.searchParams.set('key', apiKey);

  const resp = await fetch(url.toString());
  if (!resp.ok) {
    return NextResponse.json({ error: `No se pudo descargar el archivo (Drive respondió ${resp.status}).` }, { status: resp.status });
  }

  return new NextResponse(resp.body, {
    headers: { 'Content-Type': resp.headers.get('content-type') || 'application/octet-stream' },
  });
}
