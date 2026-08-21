# Worker de contingencia (VM)

Respaldo en frío de `procesar_sesion` (la Cloud Function real,
`functions/main.py`). Normalmente no hace nada: solo entra en acción cuando
detecta una sesión de Firestore colgada (`pendiente` hace rato, o
`procesando` sin actualizarse) — el mismo criterio que el watchdog del
cliente, pero visto desde el servidor. Reutiliza `engine/` y `services/`
copiados tal cual de `functions/`, para calcular exactamente lo mismo.

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

## Dejarlo corriendo permanentemente (pendiente)

Falta envolver `worker.py` en un servicio `systemd` con reinicio automático
— hoy solo se probó corriendo en primer plano. Sin esto, un reinicio de la
VM lo apaga y no vuelve a levantar solo.
