# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es esto

Plataforma de huella de carbono para agroexportadoras peruanas. Lee archivos que la empresa ya tiene (facturas SUNAT en XML UBL 2.1, Excel de campo, packing/logística) y los convierte en un inventario de emisiones auditable bajo GHG Protocol / ISO 14067, habilitando créditos verdes (SLL) y cumplimiento EUDR/CBAM.

## Comandos

```bash
npm install
cp .env.local.example .env.local   # rellenar valores reales; mínimos: MASTER_USER/MASTER_PASSWORD y GEMINI_API_KEY
npm run dev                        # http://localhost:3000
npm run red                        # servir en red local (ver nota de red corporativa abajo)
npm run red:tunel

npx tsc --noEmit                   # chequeo de tipos del cliente (no hay test runner de JS configurado)
npm run lint

cd functions
venv/Scripts/python -m pip install -r requirements.txt   # Linux/Mac: venv/bin/python
venv/Scripts/python -m pytest tests/ -v                  # correr todos los tests del motor Python
venv/Scripts/python -m pytest tests/test_parity.py -v    # un solo archivo
```

- El venv de `functions/` debe ser **Python 3.12 exacto** (coincide con el runtime del deploy); otra versión rompe el deploy con un error críptico de firebase-tools.
- `firebase emulators:start` necesita Java instalado (Firestore/Storage son procesos Java). Sin Java, la cobertura la dan los tests de `functions/tests/` con dobles de prueba.

## Arquitectura

Dos piezas independientes que solo se hablan a través de Firestore:

```
┌─ Next.js (Vercel) ────────────┐         ┌─ Cloud Function (Python) ───┐
│  UI + API routes              │         │  Procesamiento pesado       │
│  sube archivo ──> Storage     │         │   descarga de Storage       │
│  crea sesión ──> Firestore ───┼─trigger─┼─> parsea + clasifica        │
│  escucha  <──── onSnapshot ───┼─────────┼── escribe resultado         │
└───────────────────────────────┘         └─────────────────────────────┘
```

El cliente nunca calcula la huella de un archivo real: solo sube, encola y escucha (`estado: pendiente → procesando → completado|error`, con motivo declarado, nunca silencioso).

### Estructura de `src/`

```
src/
├── app/              Rutas (Next.js App Router). Una carpeta = una pantalla.
│   └── api/          Endpoints de servidor: chat (Kapi/Gemini) y login.
├── components/       UI por dominio: landing/ layout/ mascot/ ui/
├── contexts/         Estado global de React: sesión (Auth) y chat.
└── lib/              Toda la lógica, agrupada por responsabilidad:
    ├── engine/       Cálculo de huella: factores de emisión, clasificación
    │                 GHG, certificación, crédito. El núcleo del producto.
    ├── parsing/      Lectura de archivos (.xlsx/.csv/.xml UBL 2.1).
    ├── store/        Estado del cliente persistido (fuentes, anotaciones).
    ├── reports/      Generación de PDF/CSV (informe técnico, GRI, TCFD).
    ├── integrations/ Lo único que habla con servicios externos: Firebase,
    │                 Storage, audio. Aislar esto permite cambiar de
    │                 proveedor sin tocar el motor.
    └── kapi/         Asistente: cliente de Gemini y armado del contexto.

functions/            Cloud Function en Python — ver functions/README.md.
sample-data/          Datos de muestra reales para pruebas, no de un cliente real.
whatsapp-bot/         Bot de WhatsApp, proyecto aparte con su propio package.json.
vm-worker/            Worker de contingencia en VM (ver abajo).
```

**⚠️ Migración a medias — no confundir con `src/modules/`/`src/core/`.** Existe una segunda copia casi completa de la app bajo `src/modules/` + `src/core/` + `src/shared/` (arquitectura por dominio: `auth-tenant`, `carbon-accounting`, `compliance-reports`, `data-loader`, `green-financing`, `kapi-copilot`, `water-and-esg`). **No está vigente todavía** — lo que `src/app/` importa hoy de verdad es `src/lib/` + `src/components/` + `src/contexts/`. Antes de editar algo, confirma cuál de las dos copias usa la ruta que estás tocando; ya ha pasado dos veces que un fix se aplicó en la copia que no se usaba y la pantalla siguió mal.

### Reglas de dependencia (vigentes hoy, mantenerlas)

1. **`lib/` nunca importa de `app/` ni de `components/`.** La lógica no sabe que existe una UI — por eso el motor se pudo portar a Python sin arrastrar React.
2. **Solo `lib/integrations/` importa el SDK de Firebase.** Ninguna pantalla habla con la base de datos directamente.
3. **`lib/engine/` no depende de `parsing/`, `reports/` ni `kapi/`.** Es la capa más profunda: todos dependen de ella, ella de nadie.

Verificación rápida:

```bash
grep -rn "from '@/app\|from '@/components" src/lib/    # debe salir vacío
grep -rln "from 'firebase" src/lib/                    # solo integrations/
```

### El motor de cálculo existe dos veces, a propósito

TypeScript (`src/lib/engine/`) para el cliente, Python (`functions/engine/`) para la nube — portado 1:1. No es duplicación accidental: `functions/tests/test_parity.py` corre los mismos archivos de datos por ambos motores y falla si `emisionKg`, `scopes` o el factor asignado a cada línea divergen. Si tocas factores de emisión en un lado, tócalos en el otro.

Divergencia conocida que NO es un bug: al leer CSV, SheetJS (TS) convierte strings con forma de fecha en números de serie de Excel, generando una línea "ignorada"; Python los trata como texto y no genera línea. Por eso los tests de paridad comparan lo que ve el usuario (`leidas`/`emisionKg`/`scopes`) y no el conteo de `ignoradas`.

### Decisiones que parecen inconsistencias pero no lo son

- **4 módulos de `engine/` exportan además un hook de React** (`useHuellaConsolidada`, `useGastoAmbiental`, `useHuellaHidrica`, `useInocuidad`). Co-locado con su dominio a propósito. Las funciones puras siguen exportadas por separado y se pueden usar sin React.
- **El botón "Procesar Factura XML de Prueba (1-Clic Demo)" de `/upload` no usa la cola.** Corre síncrono en el navegador para que la demo funcione sin depender de Firestore ni de la Cloud Function. Los archivos reales sí pasan por la cola.

## Autenticación (estado real)

Dos mecanismos, no confundirlos:

| | Para qué sirve | Estado |
|---|---|---|
| Login maestro (`/api/login`) | Da acceso a la plataforma | Usuario fijo por variables de entorno. **No** es un sistema de cuentas por empresa. |
| Firebase Anonymous Auth | Aísla las sesiones de carga en Firestore | UID real emitido por Firebase, verificable por las reglas de seguridad. |

`orgId` es hoy una constante (`NEXT_PUBLIC_DEFAULT_ORG_ID`) porque existe un solo cliente real. El esquema de Firestore (`organizaciones/{orgId}/usuarios/{userId}/sesiones/{sesionId}`) ya está preparado para multi-tenant: cuando haya alta de cuentas reales, solo cambia de dónde sale `orgId`, no la forma de los documentos ni las reglas.

## Despliegue

- **App**: Vercel. El proyecto activo es `agrofinance-produccion` (https://agrofinance-produccion.vercel.app). La integración automática Git→Vercel no está conectada — cada release nueva necesita `vercel --prod` a mano. Hay proyectos viejos en la misma cuenta (`agrofinance-v2`, `agrofinance-ai-v15`, `agrofinance-main-fixed`) que **no** son el real.
- **Dominio en Firebase Auth**: cualquier dominio nuevo donde se sirva la app debe agregarse en Firebase Console → Authentication → Settings → Authorized domains, o el login falla en producción aunque funcione en local.
- **Reglas y Cloud Function**: `firebase deploy --only firestore:rules,storage:rules,functions` bajo tu propia sesión de `firebase login`. Requiere plan Blaze, y los roles `roles/datastore.user` + `roles/storage.objectViewer` en la service account del runtime. No se genera ni descarga archivo de credenciales — producción usa Application Default Credentials.
- **Bucket de Storage**: usar `firebasestorage.app`, no `appspot.com` (ver commits `92c7841`/`a16772c` para el error que causó y cómo se detectó).

## Worker de contingencia en VM (`vm-worker/`)

Respaldo en frío para cuando la Cloud Function no procese una sesión (falla de Eventarc, cold start roto, etc.) — reutiliza el mismo motor Python que `functions/engine/`. Ver [`vm-worker/README.md`](vm-worker/README.md). La VM (`kapi-agrofinance-vm`) tiene los permisos IAM listos pero no corre como servicio permanente todavía, solo probado manualmente.

## Red corporativa

Si trabajas desde una red que bloquea Vercel, el despliegue/preview no es alcanzable — usar `npm run red` en su lugar.
