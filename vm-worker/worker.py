"""AgroFinance — worker de contingencia (VM).

Este proceso NO reemplaza a la Cloud Function `procesar_sesion`
(functions/main.py) — es un respaldo en frío. Corre en segundo plano y
solo actúa sobre sesiones que la Cloud Function claramente no está
atendiendo:

  - estado == 'pendiente' con más de UMBRAL_PENDIENTE_S segundos desde su
    creación (el trigger de Firestore nunca disparó, o el proyecto tuvo
    una falla de Eventarc como la que vimos el 20-ago).
  - estado == 'procesando' con más de UMBRAL_PROCESANDO_S segundos desde
    su última actualización (el contenedor de la función murió a media
    ejecución sin poder escribir 'error').

Reutiliza el mismo motor de parseo/clasificación que la Cloud Function
(engine/, services/ — copiados tal cual de functions/), para que ambos
caminos calculen exactamente lo mismo.

Reclama cada sesión con una transacción de Firestore antes de procesarla,
para no pisarse con la Cloud Function si esta se recupera a mitad de
camino y también la toma.
"""

import logging
import time
from datetime import datetime, timedelta, timezone

import firebase_admin
from firebase_admin import credentials, firestore, storage

from engine.parse_archivo import parsear_archivo, ErrorArchivo, ResultadoUBL
from engine.ghg_classify import ghg_classify, resumir_lineas
from services.storage_client import descargar_original

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("agrofinance-worker")

PROJECT_ID = "agrofinance-b089a"
INTERVALO_POLL_S = 30
UMBRAL_PENDIENTE_S = 90
UMBRAL_PROCESANDO_S = 150
MAX_LINEAS_PREVIEW = 400

app = firebase_admin.initialize_app(
    credentials.ApplicationDefault(),
    # OJO: proyectos Firebase creados desde 2024 usan el dominio nuevo
    # "<project>.firebasestorage.app", no el "<project>.appspot.com" legado
    # — con el bucket equivocado esto falla con 404 "bucket does not exist"
    # aunque las credenciales y permisos estén perfectos (nos pasó en la VM
    # el 21/08). Confirmar contra storageBucket real en .env.local si esto
    # se reutiliza en otro proyecto.
    {"projectId": PROJECT_ID, "storageBucket": f"{PROJECT_ID}.firebasestorage.app"},
)
db = firestore.client()


def _segundos_desde(campo) -> float:
    if campo is None:
        return float("inf")
    if campo.tzinfo is None:
        campo = campo.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - campo).total_seconds()


def _candidatas():
    """Recorre todas las sesiones de todas las organizaciones/usuarios
    (collection_group) y filtra en memoria las que llevan colgadas más
    del umbral — con solo 5 agroexportadoras el volumen es bajo, no
    hace falta un índice compuesto para esto."""
    for doc in db.collection_group("sesiones").stream():
        data = doc.to_dict() or {}
        estado = data.get("estado")
        if estado == "pendiente" and _segundos_desde(data.get("creadoEn")) > UMBRAL_PENDIENTE_S:
            yield doc.reference
        elif estado == "procesando" and _segundos_desde(data.get("actualizadoEn")) > UMBRAL_PROCESANDO_S:
            yield doc.reference


@firestore.transactional
def _reclamar(transaction, ref):
    """Solo toma la sesión si sigue en el mismo estado colgado que vimos
    al listarla — evita la carrera si la Cloud Function la resolvió justo
    entre el listado y este punto."""
    snap = ref.get(transaction=transaction)
    data = snap.to_dict() or {}
    estado = data.get("estado")
    colgada = (
        (estado == "pendiente" and _segundos_desde(data.get("creadoEn")) > UMBRAL_PENDIENTE_S)
        or (estado == "procesando" and _segundos_desde(data.get("actualizadoEn")) > UMBRAL_PROCESANDO_S)
    )
    if not colgada:
        return None
    transaction.update(ref, {"estado": "procesando", "actualizadoEn": firestore.SERVER_TIMESTAMP,
                              "procesadoPor": "vm-contingencia"})
    return data


def _procesar(ref, data: dict) -> None:
    archivo_info = data["archivo"]
    log.info("Procesando %s (%s)", ref.path, archivo_info.get("nombre"))
    try:
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
                "filasPreview": [{"fila": fila} for fila in parseado.filas_preview],
                "lineasPreview": [l.to_dict() for l in clasificadas[:MAX_LINEAS_PREVIEW]],
                "lineasCompletasPath": None,
            },
            "procesadoEn": firestore.SERVER_TIMESTAMP,
            "actualizadoEn": firestore.SERVER_TIMESTAMP,
        })
        log.info("Completado %s", ref.path)
    except ErrorArchivo as exc:
        ref.update({"estado": "error", "error": {"mensaje": str(exc), "codigo": "ARCHIVO_INVALIDO"},
                    "actualizadoEn": firestore.SERVER_TIMESTAMP})
        log.warning("Archivo inválido %s: %s", ref.path, exc)
    except Exception as exc:  # noqa: BLE001 — igual que main.py, nunca se traga en silencio
        ref.update({"estado": "error", "error": {"mensaje": str(exc), "codigo": "PROCESAMIENTO_FALLIDO_VM"},
                    "actualizadoEn": firestore.SERVER_TIMESTAMP})
        log.exception("Fallo procesando %s", ref.path)


def main() -> None:
    log.info("Worker de contingencia iniciado — poll cada %ss", INTERVALO_POLL_S)
    while True:
        try:
            for ref in _candidatas():
                data = _reclamar(db.transaction(), ref)
                if data is not None:
                    _procesar(ref, data)
        except Exception:
            log.exception("Error en el ciclo de polling — se reintenta en el próximo tick")
        time.sleep(INTERVALO_POLL_S)


if __name__ == "__main__":
    main()
