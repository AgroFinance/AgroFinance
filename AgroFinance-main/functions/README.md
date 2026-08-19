# Cloud Function — procesamiento de archivos

Procesa las cargas de archivo de forma asíncrona y aislada por sesión.
Se dispara sola cuando el cliente crea un documento en
`organizaciones/{orgId}/usuarios/{userId}/sesiones/{sesionId}` con
`estado: 'pendiente'`.

```
pendiente ──> procesando ──> completado
                        └──> error   (con motivo declarado, nunca silencioso)
```

El cliente ve cada transición en vivo por `onSnapshot`.

## Estructura

```
main.py              Trigger de Firestore. Orquesta el pipeline y escribe
                     el resultado. Es lo único que sabe de Firestore.
engine/              Motor de cálculo, portado 1:1 desde src/lib/engine/
  parse_archivo.py     Lee .xlsx (openpyxl), .csv y .xml (SUNAT UBL 2.1)
  ghg_classify.py      Reconoce consumos y les asigna factor + scope
  emission_factors.py  Factores de emisión y método IPCC de N2O
services/            Acceso a Cloud Storage
tests/               Tests de paridad contra el motor TypeScript
```

## Desarrollo local

```bash
python -m venv venv
venv/Scripts/python -m pip install -r requirements.txt   # Linux/Mac: venv/bin/python
venv/Scripts/python -m pytest tests/ -v
```

## Los tests

Son 12 y cubren dos cosas distintas:

- **Paridad TS↔Python** (`test_parity.py`): corre los mismos archivos reales
  de `DATA/` por ambos motores y exige que `emisionKg`, `scopes` y el factor
  asignado a cada línea coincidan. Las fixtures `*.expected.json` se
  generaron ejecutando el motor TypeScript **real**, no a mano.
  Si tocas los factores de emisión en un lado y no en el otro, esto falla.
- **Comportamiento del trigger** (`test_procesar_sesion.py`): simula el
  evento de Firestore con dobles de prueba y verifica las transiciones de
  estado, el manejo de errores y que no se toque una sesión que no está
  `pendiente`.

### Divergencia conocida (no es un bug)

Al leer un CSV, SheetJS (motor TS) convierte los strings con forma de fecha
en números de serie de Excel, generando una línea "ignorada" que nunca fue
un consumo. Python los trata como texto y no genera línea. Por eso los tests
comparan `leidas` / `emisionKg` / `scopes` — lo que ve el usuario — y **no**
el conteo de `ignoradas`.

## Sobre los emuladores

`firebase emulators:start` necesita **Java instalado**: los emuladores de
Firestore y Storage son procesos Java (decisión de Google, no evitable desde
la CLI de Node). Sin Java, la cobertura la dan los tests de arriba, que
ejercitan el pipeline completo con dobles de prueba.

Lo que los tests **no** cubren y solo se comprueba contra un proyecto real:
que el trigger se dispare solo, y que `firestore.rules` / `storage.rules`
rechacen de verdad lo que deben rechazar.

## Despliegue

```bash
firebase deploy --only functions
```

Corre bajo tu propia sesión de `firebase login`. **En ningún momento se
genera ni se descarga un archivo de credenciales**: en producción la función
usa Application Default Credentials con la service account que Google le
asigna al runtime.

Requisitos del proyecto: plan **Blaze** (las funciones de 2ª generación no
existen en Spark) y los roles `roles/datastore.user` y
`roles/storage.objectViewer` en la service account del runtime.
