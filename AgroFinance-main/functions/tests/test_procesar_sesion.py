"""Prueba de main.procesar_sesion SIN el emulador de Firestore (no hay
Java disponible en esta máquina — ver decisión de la sesión). Se simula
el evento de Firestore y se reemplazan los clientes de Firestore/Storage
por dobles de prueba, para ejercitar la función completa tal cual la
invocaría el trigger real: leer el evento, bajar el archivo (acá, uno ya
local), parsear+clasificar con el motor portado, y escribir de vuelta el
estado y el resultado — o el error — con las mismas transiciones de
estado (pendiente -> procesando -> completado/error) que vería el
cliente por onSnapshot.

Lo que esto NO prueba (por eso sigue haciendo falta una subida real una
vez exista Firestore en el proyecto): que el trigger se dispare solo al
crear el documento, y que firestore.rules/storage.rules realmente
rechacen lo que deben rechazar en un servidor de verdad.
"""

from pathlib import Path
from unittest.mock import MagicMock

import pytest

import main

FIXTURES = Path(__file__).parent / "fixtures"


class FakeRef:
    """Doble del DocumentReference: solo registra las escrituras que le
    llegan, en orden, para poder inspeccionar la secuencia de estados."""

    def __init__(self):
        self.updates: list[dict] = []

    def update(self, data: dict):
        self.updates.append(data)


class FakeSnapshot:
    def __init__(self, path: str, data: dict):
        self.reference = MagicMock(path=path)
        self._data = data

    def to_dict(self):
        return self._data


class FakeEvent:
    def __init__(self, data):
        self.data = data


def _preparar_mocks(monkeypatch, ref: FakeRef, ruta_local_devuelta: str):
    fake_client = MagicMock()
    fake_client.document.return_value = ref
    monkeypatch.setattr(main.firestore, "client", lambda: fake_client)
    monkeypatch.setattr(main, "descargar_original", lambda storage_path: ruta_local_devuelta)


def test_procesa_csv_pendiente_a_completado(monkeypatch):
    ref = FakeRef()
    _preparar_mocks(monkeypatch, ref, str(FIXTURES / "mype_packing_fijos.csv"))

    evento = FakeEvent(FakeSnapshot(
        "organizaciones/org1/usuarios/user1/sesiones/ses1",
        {"estado": "pendiente", "archivo": {"storagePath": "irrelevante", "tipo": "csv"}},
    ))

    main.procesar_sesion.__wrapped__(evento)

    estados = [u["estado"] for u in ref.updates]
    assert estados == ["procesando", "completado"]

    resultado = ref.updates[-1]["resultado"]
    assert resultado["resumen"]["leidas"] == 4
    assert resultado["resumen"]["emisionKg"] == pytest.approx(126337.605)
    assert resultado["cabecera"] is None  # CSV no trae cabecera UBL
    assert len(resultado["lineasPreview"]) == resultado["resumen"]["leidas"] + resultado["resumen"]["ignoradas"]


def test_procesa_xml_incluye_cabecera(monkeypatch):
    ref = FakeRef()
    ruta_xml = Path(__file__).parents[2] / "DATA_Agroexportadora_Prueba" / "01_Facturas_XML_SUNAT" / "F001-001234.xml"
    _preparar_mocks(monkeypatch, ref, str(ruta_xml))

    evento = FakeEvent(FakeSnapshot(
        "organizaciones/org1/usuarios/user1/sesiones/ses2",
        {"estado": "pendiente", "archivo": {"storagePath": "irrelevante", "tipo": "xml"}},
    ))

    main.procesar_sesion.__wrapped__(evento)

    resultado = ref.updates[-1]["resultado"]
    assert resultado["cabecera"]["ruc"] == "20100123456"
    assert resultado["cabecera"]["proveedor"] == "PETROPERU S.A."
    assert resultado["resumen"]["emisionKg"] == pytest.approx(1200 * 2.68)


def test_archivo_invalido_deja_estado_error(monkeypatch, tmp_path):
    ref = FakeRef()
    archivo_vacio = tmp_path / "vacio.csv"
    archivo_vacio.write_text("")
    _preparar_mocks(monkeypatch, ref, str(archivo_vacio))

    evento = FakeEvent(FakeSnapshot(
        "organizaciones/org1/usuarios/user1/sesiones/ses3",
        {"estado": "pendiente", "archivo": {"storagePath": "irrelevante", "tipo": "csv"}},
    ))

    main.procesar_sesion.__wrapped__(evento)

    estados = [u["estado"] for u in ref.updates]
    assert estados == ["procesando", "error"]
    assert ref.updates[-1]["error"]["codigo"] == "ARCHIVO_INVALIDO"


def test_ignora_sesion_que_no_esta_pendiente(monkeypatch):
    ref = FakeRef()
    _preparar_mocks(monkeypatch, ref, "no-deberia-usarse")

    evento = FakeEvent(FakeSnapshot(
        "organizaciones/org1/usuarios/user1/sesiones/ses4",
        {"estado": "completado", "archivo": {"storagePath": "x", "tipo": "csv"}},
    ))

    main.procesar_sesion.__wrapped__(evento)

    assert ref.updates == []  # guarda defensiva: no toca una sesion que no esta 'pendiente'
