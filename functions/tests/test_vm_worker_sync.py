"""Paridad functions/engine <-> vm-worker/engine.

vm-worker/ (ver su README y worker.py) reutiliza el motor de la Cloud
Function como respaldo en frío para cuando esta no procese una sesión —
su propio docstring dice explícitamente "para que ambos caminos calculen
exactamente lo mismo". Eso solo es cierto si los archivos son copias
literales; si uno se actualiza y el otro no (como pasó hasta el
2026-09-20: vm-worker/engine/*.py llevaba meses sin los fixes de
refrigerantes, tipo de fertilizante por nombre, layout de factura y
encabezado real en XLSX), el worker de contingencia calcula distinto
-y en silencio- justo el día que la Cloud Function falla y hace falta
que responda igual.

Este test no reemplaza test_parity.py (que compara TS vs Python
ejecutando ambos motores) — aquí no hace falta ejecutar nada, basta con
que el contenido sea idéntico byte a byte.
"""

from pathlib import Path

import pytest

FUNCTIONS_ENGINE = Path(__file__).resolve().parent.parent / "engine"
VM_WORKER_ENGINE = Path(__file__).resolve().parent.parent.parent / "vm-worker" / "engine"

ARCHIVOS_MOTOR = ["emission_factors.py", "ghg_classify.py", "parse_archivo.py"]


@pytest.mark.parametrize("nombre", ARCHIVOS_MOTOR)
def test_vm_worker_engine_identico_a_functions(nombre):
    original = (FUNCTIONS_ENGINE / nombre).read_text(encoding="utf-8")
    copia = (VM_WORKER_ENGINE / nombre).read_text(encoding="utf-8")
    assert copia == original, (
        f"vm-worker/engine/{nombre} se desincronizó de functions/engine/{nombre} — "
        f"copia functions/engine/{nombre} sobre vm-worker/engine/{nombre} para resincronizar."
    )
