"""AgroFinance — Cloud Function que procesa sesiones de carga de archivos.

Disparada cuando el cliente crea un documento en
organizaciones/{orgId}/usuarios/{userId}/sesiones/{sesionId} con estado
'pendiente'. Descarga el archivo original de Cloud Storage, lo parsea y
clasifica con el mismo motor que usa el cliente (portado a Python en
engine/), y escribe el resultado de vuelta — o un error, si algo falla.
Nunca se traga un error en silencio: si algo revienta, el documento
queda en estado 'error' con el motivo, nunca en 'pendiente' colgado.

Autenticación: Application Default Credentials — el runtime de Cloud
Functions 2a gen ya corre bajo una service account gestionada por
Google. Nunca se genera ni se descarga un archivo de credenciales.
"""

from firebase_admin import initialize_app, firestore
from firebase_functions import firestore_fn, options

from engine.parse_archivo import parsear_archivo, ErrorArchivo, ResultadoUBL
from engine.ghg_classify import ghg_classify, resumir_lineas
from services.storage_client import descargar_original

initialize_app()

MAX_LINEAS_PREVIEW = 400


@firestore_fn.on_document_created(
    document="organizaciones/{orgId}/usuarios/{userId}/sesiones/{sesionId}",
    region="us-central1",
    memory=options.MemoryOption.MB_512,
    timeout_sec=120,
)
def procesar_sesion(event: firestore_fn.Event) -> None:
    snapshot = event.data
    if snapshot is None:
        return

    data = snapshot.to_dict() or {}
    if data.get("estado") != "pendiente":
        return  # guarda defensiva — solo procesamos sesiones recien creadas

    ref = firestore.client().document(snapshot.reference.path)
    ref.update({"estado": "procesando", "actualizadoEn": firestore.SERVER_TIMESTAMP})

    try:
        archivo_info = data["archivo"]
        ruta_local = descargar_original(archivo_info["storagePath"])
        parseado = parsear_archivo(ruta_local, archivo_info["tipo"])
        clasificadas = ghg_classify(parseado.lineas)
        resumen = resumir_lineas(clasificadas)
        cabecera = None
        if isinstance(parseado, ResultadoUBL) and parseado.cabecera:
            c = parseado.cabecera
            cabecera = {
                "invoiceId": c.invoice_id, "ruc": c.ruc, "proveedor": c.proveedor,
                "fecha": c.fecha, "moneda": c.moneda, "montoTotal": c.monto_total,
            }

        ref.update({
            "estado": "completado",
            "resultado": {
                "resumen": resumen,
                "cabecera": cabecera,
                "hojas": parseado.hojas,
                "columnas": parseado.columnas,
                # Firestore no admite un array conteniendo arrays directamente
                # ("array values cannot directly contain other array values") —
                # cada fila (list[list]) se envuelve en un mapa. El cliente
                # (sesiones.ts) la desenvuelve al leer.
                "filasPreview": [{"fila": fila} for fila in parseado.filas_preview],
                "lineasPreview": [l.to_dict() for l in clasificadas[:MAX_LINEAS_PREVIEW]],
                "lineasCompletasPath": None,
            },
            "procesadoEn": firestore.SERVER_TIMESTAMP,
            "actualizadoEn": firestore.SERVER_TIMESTAMP,
        })
    except ErrorArchivo as exc:
        ref.update({
            "estado": "error",
            "error": {"mensaje": str(exc), "codigo": "ARCHIVO_INVALIDO"},
            "actualizadoEn": firestore.SERVER_TIMESTAMP,
        })
    except Exception as exc:  # noqa: BLE001 — se declara el error, nunca se traga en silencio
        ref.update({
            "estado": "error",
            "error": {"mensaje": str(exc), "codigo": "PROCESAMIENTO_FALLIDO"},
            "actualizadoEn": firestore.SERVER_TIMESTAMP,
        })
