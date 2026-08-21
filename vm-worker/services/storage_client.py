"""Descarga el archivo original de Cloud Storage al disco efímero /tmp
de la Cloud Function. Usa Application Default Credentials — el runtime
de Cloud Functions 2a gen ya corre bajo una service account gestionada
por Google, así que firebase_admin.storage la reutiliza automáticamente
sin ningún archivo de llave.
"""

import tempfile
from pathlib import Path

from firebase_admin import storage


def descargar_original(storage_path: str) -> str:
    """storage_path viene tal como lo guardó el cliente en el doc de la
    sesión: 'organizaciones/{orgId}/usuarios/{userId}/sesiones/{sesionId}/original.<ext>'.
    Devuelve la ruta local del archivo descargado."""
    bucket = storage.bucket()
    blob = bucket.blob(storage_path)

    sufijo = Path(storage_path).suffix or ".bin"
    destino = Path(tempfile.gettempdir()) / f"{Path(storage_path).parent.name}{sufijo}"
    blob.download_to_filename(str(destino))
    return str(destino)
