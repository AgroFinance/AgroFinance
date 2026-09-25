import { NextResponse } from 'next/server';

// ============================================================
// Listar archivos de una carpeta PÚBLICA de Google Drive ("cualquiera con
// el enlace"), a partir del link que el usuario pega en /upload.
// ------------------------------------------------------------
// Deliberadamente sin OAuth: una API key de Google Cloud (Drive API
// habilitada, sin scopes ni consentimiento) alcanza para listar/descargar
// archivos de una carpeta compartida por enlace — el mismo mecanismo que
// usa cualquier visor público de Drive embebido en una web. Conectar el
// Drive PRIVADO de un usuario (sin compartir el link) es un proyecto
// aparte que sí necesita OAuth — no está implementado todavía.
// ============================================================

const EXTENSIONES_SOPORTADAS = ['xlsx', 'xls', 'csv', 'xml', 'ods', 'pdf', 'docx'];

// Acepta las formas típicas de un link de carpeta de Drive:
// .../drive/folders/<ID>, .../drive/u/0/folders/<ID>, ...?id=<ID>
function extraerIdDeCarpeta(link: string): string | null {
  const porRuta = link.match(/folders\/([a-zA-Z0-9_-]{10,})/);
  if (porRuta) return porRuta[1];
  const porQuery = link.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (porQuery) return porQuery[1];
  return null;
}

export async function GET(req: Request) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_DRIVE_API_KEY no está configurada en el servidor — no se puede leer Google Drive todavía.' },
      { status: 501 },
    );
  }

  const link = new URL(req.url).searchParams.get('link') || '';
  const folderId = extraerIdDeCarpeta(link);
  if (!folderId) {
    return NextResponse.json(
      { error: 'No se reconoce ese link como una carpeta de Google Drive. Copia el link con el botón "Compartir → Copiar enlace" de la carpeta.' },
      { status: 400 },
    );
  }

  const MIME_CARPETA = 'application/vnd.google-apps.folder';
  type ArchivoDrive = { id: string; name: string; mimeType: string; size?: string };

  async function listarHijos(idPadre: string): Promise<ArchivoDrive[]> {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${idPadre}' in parents and trashed = false`);
    url.searchParams.set('fields', 'files(id,name,mimeType,size)');
    url.searchParams.set('key', apiKey!);
    url.searchParams.set('pageSize', '1000');
    const resp = await fetch(url.toString());
    if (!resp.ok) {
      const detalle = await resp.text();
      const motivo = resp.status === 404
        ? 'La carpeta no existe o no está compartida como "Cualquiera con el enlace puede ver".'
        : `Google Drive respondió ${resp.status}.`;
      throw new Error(`${motivo} ${detalle}`.trim());
    }
    const data = await resp.json();
    return (data.files ?? []) as ArchivoDrive[];
  }

  // Recorrido en anchura de subcarpetas — el dataset real de campo viene
  // organizado en subcarpetas por área (campo/, maquinaria/, compras/...),
  // igual que el selector de carpeta local: listar solo el primer nivel
  // devolvía "sin archivos soportados" aunque la carpeta sí tuviera datos,
  // solo que un nivel más abajo. Acotado a 30 subcarpetas y 500 archivos
  // para no perseguir un árbol gigante o mal compartido sin límite.
  const MAX_CARPETAS = 30;
  const MAX_ARCHIVOS = 500;
  const archivos: ArchivoDrive[] = [];
  const colaCarpetas = [folderId];
  let carpetasVisitadas = 0;

  try {
    while (colaCarpetas.length > 0 && carpetasVisitadas < MAX_CARPETAS && archivos.length < MAX_ARCHIVOS) {
      const idActual = colaCarpetas.shift()!;
      carpetasVisitadas++;
      const hijos = await listarHijos(idActual);
      for (const hijo of hijos) {
        if (hijo.mimeType === MIME_CARPETA) {
          colaCarpetas.push(hijo.id);
          continue;
        }
        const ext = (hijo.name.split('.').pop() || '').toLowerCase();
        if (EXTENSIONES_SOPORTADAS.includes(ext)) archivos.push(hijo);
      }
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error leyendo Google Drive.' }, { status: 502 });
  }

  if (archivos.length === 0) {
    return NextResponse.json(
      { error: 'La carpeta (y sus subcarpetas) se pudieron leer pero no tienen archivos en un formato soportado (.xlsx, .csv, .xml, .pdf, .docx).' },
      { status: 422 },
    );
  }

  return NextResponse.json({ archivos });
}
