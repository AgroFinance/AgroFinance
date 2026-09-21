# Worker de contingencia (VM)

Respaldo en frío de `procesar_sesion` (la Cloud Function real,
`functions/main.py`). Normalmente no hace nada: solo entra en acción cuando
detecta una sesión de Firestore colgada (`pendiente` hace rato, o
`procesando` sin actualizarse) — el mismo criterio que el watchdog del
cliente, pero visto desde el servidor. Reutiliza `engine/` y `services/`
copiados tal cual de `functions/`, para calcular exactamente lo mismo.

**⚠️ Estos archivos no se importan por referencia — son copias físicas.**
El 2026-09-20 se encontró `vm-worker/engine/` desincronizado de
`functions/engine/` (le faltaban meses de fixes: refrigerantes, tipo de
fertilizante por nombre, layout de factura, encabezado real en XLSX,
código UBL "BAG"→sacos) — el worker de contingencia habría calculado
distinto justo el día que la Cloud Function fallara, que es su único
propósito. `functions/tests/test_vm_worker_sync.py` ahora falla si
vuelven a divergir. **Si tocas algo en `functions/engine/`, copia el
mismo archivo a `vm-worker/engine/` en el mismo commit** y corre
`pytest functions/tests/test_vm_worker_sync.py` antes de dar por
terminado el cambio.

## Instalar en una VM nueva

Requiere que la VM tenga:
- Scope `cloud-platform` (`gcloud compute instances set-service-account`).
- Roles IAM sobre el proyecto de Firebase: `roles/datastore.user` y
  `roles/storage.objectAdmin`, otorgados a la cuenta de servicio de la VM
  (`<numero-proyecto-vm>-compute@developer.gserviceaccount.com`) **en el
  proyecto de Firebase**, no en el proyecto de la VM si son distintos.

```bash
sudo apt update && sudo apt install -y python3-pip python3-venv git
git clone https://github.com/AgroFinance/AgroFinance.git ~/agrofinance
cd ~/agrofinance/vm-worker
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install firebase-admin google-cloud-firestore google-cloud-storage pdfplumber python-docx openpyxl
./venv/bin/python worker.py
```

Si sale `RefreshError: ... service account info is missing 'email' field`,
estás corriendo esto en **Cloud Shell**, no en la VM — Cloud Shell no tiene
un service account de Compute Engine real adjunto. Hay que estar dentro de
una sesión SSH sobre la VM misma (`gcloud compute ssh <nombre-vm> --zone=<zona>`).

Si sale `NotFound: 404 ... The specified bucket does not exist` al intentar
descargar el archivo original: revisa `storageBucket` en `worker.py` — los
proyectos de Firebase creados desde 2024 usan el dominio
`<project>.firebasestorage.app`, no el legado `<project>.appspot.com`.
Confirma el valor real contra `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` en
`.env.local`.

## Procesamiento en paralelo (2026-09-21)

`worker.py` procesa hasta `MAX_HILOS` (4 por defecto) sesiones **en
simultáneo** con un `ThreadPoolExecutor` — antes era un `for` secuencial:
si dos clientes pesados caían ambos al worker de contingencia al mismo
tiempo, el segundo esperaba en fila detrás del primero. El trabajo es de
I/O (esperar a Storage/Firestore), no de CPU, así que hilos alcanzan sin
reescribir la lógica de negocio:

- `_reclamar()` ya usa una transacción de Firestore — dos hilos reclamando
  sesiones *distintas* en simultáneo no se pisan (y si por alguna razón
  ambos intentaran reclamar la misma, la transacción solo deja pasar a uno).
- El archivo temporal de descarga se nombra por `sesionId` (ver
  `services/storage_client.py`), nunca una ruta fija — sesiones distintas
  nunca colisionan en `/tmp` aunque se descarguen al mismo tiempo.

**Verificar esto en la VM real** (no se pudo probar en la máquina de
desarrollo — `worker.py` exige credenciales reales de GCP al importarse):
correr `python3 worker.py` con varias sesiones colgadas de cuentas
distintas y confirmar en el log (ahora incluye `[threadName]`) que
aparecen varios `sesion_N` procesando al mismo tiempo, no uno detrás de
otro.

## Dejarlo corriendo permanentemente (pendiente)

Falta envolver `worker.py` en un servicio `systemd` con reinicio automático
— hoy solo se probó corriendo en primer plano. Sin esto, un reinicio de la
VM lo apaga y no vuelve a levantar solo.
