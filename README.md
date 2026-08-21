# AgroFinance AI

Plataforma de huella de carbono para agroexportadoras peruanas. Lee los
archivos que la empresa **ya tiene** (facturas electrónicas SUNAT en XML,
Excel de campo, packing y logística) y los convierte en un inventario de
emisiones auditable bajo GHG Protocol / ISO 14067, con el objetivo de
habilitar créditos verdes (SLL) y cumplimiento EUDR/CBAM.

---

## Cómo levantarlo

```bash
npm install
cp .env.local.example .env.local   # y rellena los valores reales
npm run dev                        # http://localhost:3000
```

Las variables de entorno están documentadas una por una en
[`.env.local.example`](.env.local.example). Las mínimas para arrancar son
`MASTER_USER` / `MASTER_PASSWORD` (login) y `GEMINI_API_KEY` (asistente Kapi).

Verificación:

```bash
npx tsc --noEmit          # tipos del cliente
cd functions && venv/Scripts/python -m pytest tests/   # motor de cálculo
```

---

## Arquitectura

Dos piezas independientes que solo se hablan a través de Firestore:

```
┌─ Next.js (Vercel) ────────────┐         ┌─ Cloud Function (Python) ───┐
│  UI + API routes              │         │  Procesamiento pesado       │
│                               │         │                             │
│  sube archivo ──> Storage     │         │   descarga de Storage       │
│  crea sesión ──> Firestore ───┼─trigger─┼─> parsea + clasifica        │
│  escucha  <──── onSnapshot ───┼─────────┼── escribe resultado         │
└───────────────────────────────┘         └─────────────────────────────┘
```

El cliente nunca calcula la huella de un archivo real: solo sube, encola y
escucha. Así el trabajo pesado de dos clientes distintos jamás comparte
proceso ni estado.

### Estructura

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

functions/            Cloud Function en Python (ver functions/README.md).
DATA/                 Datos de muestra reales para pruebas.
whatsapp-bot/         Bot de WhatsApp, proyecto aparte con su propio package.json.
```

### Reglas de dependencia

Se cumplen hoy y conviene mantenerlas — son lo que evita que esto se
convierta en un ovillo:

1. **`lib/` nunca importa de `app/` ni de `components/`.** La lógica no
   sabe que existe una UI. Por eso el motor se pudo portar a Python sin
   arrastrar React.
2. **Solo `lib/integrations/` importa el SDK de Firebase.** Ninguna
   pantalla habla con la base de datos directamente.
3. **`lib/engine/` no depende de `parsing/`, `reports/` ni `kapi/`.** Es la
   capa más profunda: todos dependen de ella, ella de nadie.

Comprobación rápida de que la regla 1 y 2 siguen vivas:

```bash
grep -rn "from '@/app\|from '@/components" src/lib/    # debe salir vacío
grep -rln "from 'firebase" src/lib/                    # solo integrations/
```

### Decisiones tomadas a propósito

Cosas que parecen inconsistencias pero no lo son:

- **4 módulos de `engine/` exportan además un hook de React**
  (`useHuellaConsolidada`, `useGastoAmbiental`, `useHuellaHidrica`,
  `useInocuidad`). Está co-locado con su dominio a propósito: separarlo
  obligaría a buscar en dos carpetas la misma funcionalidad. Las funciones
  puras siguen exportadas por separado y se pueden usar sin React.
- **El botón "Procesar Factura XML de Prueba (1-Clic Demo)" de `/upload` no
  usa la cola.** Corre síncrono en el navegador para que la demo funcione
  sin depender de Firestore ni de la Cloud Function. Los archivos reales
  sí pasan por la cola.
- **El motor de cálculo existe dos veces**: TypeScript (`src/lib/engine/`)
  para el cliente, Python (`functions/engine/`) para la nube. No es
  duplicación accidental: hay tests de paridad que fallan si divergen
  numéricamente (`functions/tests/test_parity.py`).

---

## Autenticación (estado real)

Hay dos mecanismos y conviene no confundirlos:

| | Para qué sirve | Estado |
|---|---|---|
| Login maestro (`/api/login`) | Da acceso a la plataforma | Usuario fijo por variables de entorno. **No** es un sistema de cuentas por empresa. |
| Firebase Anonymous Auth | Aísla las sesiones de carga en Firestore | UID real emitido por Firebase, verificable por las reglas de seguridad. |

`orgId` es hoy una constante (`NEXT_PUBLIC_DEFAULT_ORG_ID`) porque existe un
solo cliente real. El esquema de Firestore
(`organizaciones/{orgId}/usuarios/{userId}/sesiones/{sesionId}`) ya está
preparado para multi-tenant: cuando haya alta de cuentas reales, solo cambia
de dónde sale `orgId`, no la forma de los documentos ni las reglas.

## Despliegue

- **App**: Vercel. **Ojo:** el proyecto activo es `agrofinance-produccion`
  (https://agrofinance-produccion.vercel.app), vinculado manualmente el
  21/08 — la integración automática Git→Vercel no quedó conectada, así que
  cada release nuevo necesita `vercel --prod` a mano hasta que se conecte.
  Hay proyectos viejos (`agrofinance-v2`, `agrofinance-ai-v15`,
  `agrofinance-main-fixed`) en la misma cuenta que **no** son el real —
  quedaron de pruebas anteriores.
- **Dominio en Firebase Auth**: cualquier dominio nuevo donde se sirva la
  app (Vercel, dominio propio) debe agregarse en Firebase Console →
  Authentication → Settings → Authorized domains, o el login falla en
  producción aunque funcione en local.
- **Reglas y Cloud Function**: `firebase deploy --only firestore:rules,storage:rules,functions`
  bajo tu propia sesión de `firebase login`. Requiere plan Blaze. El venv de
  `functions/` debe ser **Python 3.12** exacto (coincide con el runtime del
  deploy) — un venv de otra versión hace fallar el deploy con un error de
  `firebase-tools` poco claro ("An unexpected error has occurred").

## Deuda técnica conocida (21/08)

- **Hay dos copias de casi todo**: `src/lib/` + `src/components/` +
  `src/contexts/` (lo que las rutas de `src/app/` importan HOY de verdad) vs
  `src/modules/` + `src/core/` (una migración a arquitectura por dominio que
  quedó a medias). Este README describe la estructura de `modules/`/`core/`
  como si fuera la vigente — **no lo es todavía**: hay que decidir hacia
  cuál converger y terminar la migración, o el próximo bug de "arreglé un
  archivo pero la pantalla seguía mal" va a repetirse (ya pasó dos veces
  el 21/08: `DashboardShell` y `datosPrueba`/sesión de Firebase).
- `sample-data/` (antes `DATA/` y `DATA_Agroexportadora_Prueba/` en la raíz)
  es data de ejemplo para pruebas, no de un cliente real.

## Worker de contingencia en VM (`vm-worker/`)

Respaldo en frío para cuando la Cloud Function no procese una sesión (falla
de Eventarc, cold start roto, etc.) — reutiliza el mismo motor Python que
`functions/engine/`. Ver instrucciones de instalación en
[`vm-worker/README.md`](vm-worker/README.md). Estado al 21/08: la VM
(`kapi-agrofinance-vm`, proyecto `project-6fd7eff7-897d-4c18-b26`) tiene los
permisos IAM listos, pero el worker no está corriendo como servicio
permanente todavía — solo probado manualmente.
