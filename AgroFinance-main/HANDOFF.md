# Handoff — estado del proyecto AgroFinance AI

Documento de traspaso para continuar el trabajo con otra IA o en otra sesión. Resume qué se hizo, qué quedó a medias y qué falta, en orden.

---

## 1. Lo que YA está hecho y commiteado (`git log`, rama `main`)

Commits relevantes, del más antiguo al más nuevo:

1. **`fix: fecha de EUDR incorrecta`**, **`unifica el escenario financiero`**, **`botones de la landing sin funcionalidad real`** — arreglos previos a esta sesión.
2. **`Conecta Firebase real, agrega cola de procesamiento async y reorganiza src/lib`**:
   - Firebase conectado con la configuración real del proyecto `agrofinance-b089a` (en `.env.local`, no versionado).
   - Botón "Eliminar todos los datos" en Configuración.
   - Kapi ahora lee archivos que no encajan en el motor de huella (datos financieros/macro) en vez de descartarlos en silencio.
   - **Cola Firestore + Cloud Function en Python** para procesar cargas de archivo de forma asíncrona: `organizaciones/{orgId}/usuarios/{userId}/sesiones/{sesionId}`, con `firestore.rules`/`storage.rules`, motor de clasificación GHG portado a Python en `functions/engine/` (parseo XLSX/CSV/XML UBL 2.1 + clasificación + factores de emisión), y `/upload` reescrito para usar la cola en cargas reales (la demo de 1 clic sigue síncrona a propósito).
   - `src/lib` reorganizado en subcarpetas temáticas (paso intermedio, después superado por el paso 4).
3. **`Elimina deuda técnica: código muerto, export obsoleto y documenta la arquitectura`**:
   - Borrado de ~2.060 líneas de componentes sin ningún import real.
   - Borrado de `docs/` (export estático de GitHub Pages, obsoleto) y `deploy-gh-pages.ps1`.
   - `.env.local.example` completado con las 13 variables reales.
   - `README.md` (raíz) y `functions/README.md` nuevos.
   - **Reorganización completa de `src/` a arquitectura por dominio** (ver sección 2).

Todo esto está en `git log` de la rama `main`, sin pushear a ningún remoto (verificar con `git log origin/main..HEAD` si hace falta confirmar).

---

## 2. Arquitectura actual de `src/` (ya en el commit 3)

```
src/
├── core/
│   ├── providers/        AuthContext.tsx, ChatContext.tsx
│   └── config/            firebase.client.ts
├── modules/
│   ├── carbon-accounting/{domain,infrastructure/{repositories,ui}}
│   ├── data-loader/{domain,infrastructure/{parsers,services,ui}}
│   ├── water-and-esg/{domain,infrastructure/ui}
│   ├── green-financing/{domain,infrastructure/ui}
│   ├── compliance-reports/{infrastructure/{exporters,ui}}
│   ├── kapi-copilot/{domain,infrastructure/{services,repositories,ui}}
│   └── auth-tenant/         (carpeta creada, sin contenido propio — ver §4)
├── shared/components/{layout,ui,landing}
└── app/
    ├── page.tsx                      landing
    ├── (auth)/login/page.tsx         antes app/login/ — misma URL /login/
    ├── (dashboard)/{dashboard,analisis,upload,configuracion,copilot,
    │                 plan-reduccion,reportes,financiamiento,
    │                 gasto-ambiental,huella-hidrica,inocuidad}/page.tsx
    └── api/{chat,login}/route.js
```

`lib/`, `contexts/` y `components/` (las carpetas viejas) **ya no existen**. `firebaseService.ts` se dividió en dos repositorios: `analyses` → `carbon-accounting/infrastructure/repositories/analysisRepository.ts`, `chats`/`registros` → `kapi-copilot/infrastructure/repositories/chatRepository.ts`.

**Verificado en ese commit**: `tsc --noEmit` limpio, 12/12 tests de `functions/` en verde, las 13 rutas cargan en su misma URL con contenido real (probado en navegador).

**Decisión de diseño documentada en el plan** (`~/.claude/plans/curious-gathering-matsumoto.md` si sigue existiendo en esta máquina): las entidades/value objects son `type`/`interface` de TS (no clases), los "use cases" son las funciones exportadas ya existentes (no wrappers `XxxUseCase.ts`), y **no se creó `middleware.ts`** porque el login actual (usuario maestro + redirect del lado del cliente) no usa JWT — inventar un middleware habría sido aparentar una seguridad que no existe.

---

## 3. EN CURSO, sin commitear — la fusión de Kapi (parar aquí)

**Objetivo**: `app/copilot/page.tsx` (971 líneas) y `CopilotDrawer.tsx` (886 líneas) eran casi duplicados — misma lógica de chat/voz/archivos/registro con pequeñas divergencias de comportamiento (`temperature`/`maxOutputTokens` distintos en las llamadas a Gemini, y la página con estado de mensajes local en vez del `ChatContext` compartido que ya usaba el Drawer).

**Se decidió** (con el usuario, explícitamente): usar el comportamiento del Drawer como canónico (más reciente/mejor tuneado) y unificar el estado de mensajes en `ChatContext` para las dos superficies.

**Archivos creados/editados, TODAVÍA NO VERIFICADOS ni commiteados:**

| Archivo | Estado |
|---|---|
| `src/modules/kapi-copilot/infrastructure/ui/useKapiChat.ts` | **Nuevo.** Hook con toda la lógica compartida (estado, `sendMessage`, `processDataFile`, `toggleRecording`, `autocargarDatosDemo`, construcción del contexto de la plataforma, etc.). Usa `useChat()` de `ChatContext` para `messages`/`isTyping` compartidos entre ambas superficies. |
| `src/modules/kapi-copilot/infrastructure/ui/formatMessage.tsx` | **Nuevo.** El formateador de markdown→JSX, separado porque `useKapiChat.ts` es `.ts` puro (sin JSX) y esto devuelve elementos React. |
| `src/modules/kapi-copilot/infrastructure/ui/CopilotDrawer.tsx` | **Reescrito.** Ahora solo tiene el JSX del widget flotante; consume `useKapiChat()` + su propio listener de `mensajeExterno` (bridge desde la landing) que sigue siendo específico del Drawer. |
| `src/modules/kapi-copilot/infrastructure/ui/CopilotFullView.tsx` | **Nuevo.** El JSX de la página completa (columna lateral con contexto + área de chat), extraído de lo que antes era `app/copilot/page.tsx`. Consume el mismo `useKapiChat()`. |
| `src/app/(dashboard)/copilot/page.tsx` | **Reescrito a 10 líneas** — solo envuelve `<DashboardShell><CopilotFullView /></DashboardShell>`. |

### Lo que falta hacer AQUÍ, en orden, antes de seguir con nada más:

1. **`npx tsc --noEmit`** — se interrumpió el comando antes de correr. Es el primer paso obligatorio. Si hay errores de tipos, corregirlos ahí mismo (probablemente imports que falten o el tipo `Message` de `ChatContext` vs alguna referencia suelta).
2. **Probar en el navegador, las dos superficies, con mensajes reales**:
   - Abrir `/copilot/` (página completa): mandar un mensaje de texto real, confirmar que Kapi responde.
   - Abrir el **drawer flotante** (el bubble de Kapi, visible en cualquier página) desde OTRA ruta (ej. `/dashboard/`): mandar un mensaje, confirmar que responde.
   - **Verificar la unificación de estado**: con el drawer abierto, navegar a `/copilot/` — ¿el historial de mensajes es el MISMO (compartido vía `ChatContext`)? Antes de esta fusión, drawer y página tenían hilos de mensajes independientes en memoria (aunque ambos guardaban en el mismo Firestore). Después de la fusión deberían compartir el mismo estado en vivo. Confirmar que esto no rompe nada visualmente (p. ej. que abrir el drawer estando en `/copilot/` no duplique la conversación).
   - Probar el modo Registro ("Registrar 500 kg de palta...") en ambas superficies.
   - Probar subir un archivo (Excel/CSV) desde el chat en ambas superficies.
   - Probar el botón "Autocargar datos demo" cuando aparece en un mensaje.
   - Probar el micrófono (si el entorno de prueba tiene permiso de audio) en al menos una superficie.
3. **Si algo se ve mal o se rompe**: NO seguir a ciegas. Es exactamente el escenario que motivó pausar (la fusión cambia comportamiento real, no solo estructura). Comparar contra el código commiteado anterior (`git show HEAD:AgroFinance-main/src/app/copilot/page.tsx` — ojo que en el HEAD actual esa ruta puede ya no existir si se commiteó después del movimiento a route groups; usar `git log --all --oneline -- '**/copilot/page.tsx'` para ubicar la versión previa si hace falta comparar).
4. Una vez verificado en navegador: `git add` de los 5 archivos de la tabla de arriba + commit.

---

## 4. Lo que NO se llegó a hacer (pendiente, no empezado)

Del plan original de "arquitectura hexagonal completa" que pidió el usuario, quedó pendiente:

- **`modules/auth-tenant/`** — la carpeta existe pero está vacía. Faltaría mover el contenido de `app/(auth)/login/page.tsx` a `modules/auth-tenant/infrastructure/ui/LoginForm.tsx` (página delgada + componente), y considerar si `core/config/firebase.client.ts` debería vivir ahí en vez de en `core/` (se dejó en `core/` a propósito porque lo usan casi todos los módulos — ver nota del `README.md` sobre "shared kernel").
- **Partir las páginas grandes en subcomponentes** (paso 6 del plan, nunca empezado):
  - `app/(dashboard)/analisis/page.tsx` — 1026 líneas
  - `app/(dashboard)/upload/page.tsx` — 709 líneas
  - `app/(dashboard)/reportes/page.tsx` — 686 líneas
  - `app/(dashboard)/configuracion/page.tsx` — 647 líneas

  La idea era extraer tablas/gráficos/modales ya identificables a sus propios archivos dentro de `infrastructure/ui/` del módulo correspondiente (`carbon-accounting` para análisis, `data-loader` para upload/configuración, `compliance-reports` para reportes), dejando la página como orquestador. **No se llegó a tocar ninguna de estas cuatro** — siguen exactamente como quedaron tras el paso 4 (mover rutas a grupos), sin dividir.

- **API routes delgadas** (paso 7 del plan): `app/api/chat/route.js` y `app/api/login/route.js` se dejaron tal cual (ya eran razonablemente cortas — 155 y 52 líneas — y su lógica no trivial ya vive en `modules/kapi-copilot/infrastructure/services/kapiAI.ts` y el chequeo de credenciales de `login/route.js` es simple). Si se quiere ser estricto con el patrón, se podría extraer el cuerpo de cada route a un servicio del módulo, pero es bajo valor dado lo cortas que ya son.

- **Pasos del usuario en Firebase Console** (fuera del alcance del código): crear la base de datos Firestore (Producción, región `us-central1`) y activar el proveedor **Anonymous** en Authentication → Sign-in method. Sin esto, la cola de procesamiento async funciona en el cliente pero la Cloud Function no puede dispararse contra un proyecto real (no hay Firestore) y `asegurarSesionAnonima()` falla con `auth/configuration-not-found` (de forma controlada, no rompe la app).

- **Deploy de la Cloud Function**: `firebase deploy --only firestore:rules,storage:rules,functions` — no se ha corrido nunca contra el proyecto real. Requiere plan Blaze en `agrofinance-b089a`.

---

## 5. Cómo levantar el proyecto (recordatorio rápido)

```bash
cd C:\AgroFinance\AgroFinance-main
npm install
npm run dev                      # http://localhost:3000

# Verificación:
npx tsc --noEmit
cd functions && venv\Scripts\python -m pytest tests\ -v
```

Detalle completo de variables de entorno en `.env.local.example`; arquitectura completa en `README.md` (raíz) y `functions/README.md`.
