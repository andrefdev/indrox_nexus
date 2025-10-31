# Indrox Nexus — Portal de Cliente

Portal de Cliente construido con Next.js (App Router, TypeScript), TailwindCSS y componentes de shadcn/ui. Incluye plantillas base de dashboard y login, y define la arquitectura para autenticación, entitlements, selector de servicio, theming corporativo, módulos de BuildPro y NeuroCore, y un drawer de IA contextual.

Este documento es la guía inicial para el desarrollo y evolución del portal.

## Stack y dependencias

- Next.js `app/` Router con TypeScript.
- TailwindCSS v4.
- shadcn/ui (Radix UI + utilidades), ya integrados en `components/ui`.
- Recharts para gráficos.
- `next-themes` para tema claro/oscuro.
- Estado: React Query para datos remotos, Zustand para estado de UI (selector, drawer, tema persistente).

## Estructura actual del proyecto

- Rutas:
  - `app/login/page.tsx` → pantalla de acceso.
  - `app/dashboard/page.tsx` → dashboard principal.
  - `app/layout.tsx` → layout global y estilos.
- UI:
  - `components/app-sidebar.tsx`, `components/site-header.tsx`, `components/section-cards.tsx`, tablas y gráficos base.
  - `components/ui/*` → librería shadcn/ui ya disponible.
- Estilos: `app/globals.css`.

## Plantillas shadcn/ui usadas

- `dashboard-01` → sidebar fijo y colapsable, topbar, tarjetas KPI, tablas y gráficos, drawer derecho.
- `login-04` → login moderno con logo, inputs y feedback de error.

Si se necesitara reinstalar o agregar variantes:

```bash
npx shadcn@latest add dashboard-01
npx shadcn@latest add login-04
```

## Requisitos funcionales (MVP)
1. Portal / Shell (MOD-PORT)
FR-PORT-001 – Login por correo + contraseña (shadcn login-04)

Descripción: El usuario del cliente puede autenticarse con su documento (RUC/DNI) y una contraseña definida previamente.

Precondiciones:

Usuario existe y está asociado a una empresa/cliente.

Empresa tiene al menos 1 servicio contratado (BuildPro y/o NeuroCore).

Criterios de aceptación (G/W/T):

Given credenciales válidas (RUC/DNI + contraseña),

When el usuario hace clic en "Iniciar sesión",

Then se crea una sesión y se redirige al dashboard principal.

Reglas adicionales:

Bloqueo al 5.º intento fallido.

Debe permitir recuperación de contraseña. [ASUNCIÓN]

2FA opcional.

Auditoría de login.

Plataformas: Portal, API.

Roles: Admin Cliente, Usuario Cliente.

FR-PORT-002 – Dashboard del cliente (layout shadcn dashboard-01)

Descripción: Pantalla inicial que resume todo lo que el cliente tiene contratado.

Given el usuario está autenticado y tiene 1 o más servicios,

When abre el dashboard,

Then ve:

tarjetas KPI para cada servicio habilitado (BuildPro: proyectos activos, hitos próximos, deuda; NeuroCore: inventario crítico, ventas hoy, clientes activos),

avisos/notificaciones recientes,

enlaces rápidos.

Reglas:

Si solo tiene BuildPro → oculta bloques de NeuroCore.

Si solo tiene NeuroCore → oculta bloques de BuildPro.

Si tiene ambos → muestra ambos.

Plataformas: Portal.

FR-PORT-003 – Documentos públicos por proyecto

Given hay documentos marcados como “públicos” para un proyecto del cliente,

When el usuario entra a “Documentos”,

Then puede ver/descargar los archivos permitidos y se registra la descarga.

Reglas:

Solo lectura para Usuario Cliente.

Debe mostrar metadatos (nombre, versión, fecha, proyecto).

Descargar solo si el proyecto pertenece al RUC del cliente.

FR-PORT-004 – Pagos (cronograma, comprobante, tarjeta)

Given existen cuotas/pagos pendientes vinculados a los proyectos del cliente,

When el usuario (Admin Cliente) abre “Pagos”,

Then ve cronograma, estado y puede:

Ir a pasarela y pagar,

O cargar comprobante,

Y ver el estado actualizado.

Reglas:

Validar monto y moneda.

Estado tras pasarela: “Pagado” o “Error”.

Estado tras comprobante: “En revisión” → FIN lo pasa a “Pagado” o “Rechazado”.

Auditoría obligatoria.

FR-PORT-005 – Credenciales tras cierre

Given el proyecto está en estado Cerrado y sin deudas,

When el Admin Cliente abre “Credenciales”,

Then el sistema muestra solo los secretos clasificados como entregables, enmascarados, con opción de revelar/copiar.

Reglas:

No disponible para Usuario Cliente.

Registrar cada visualización.

FR-PORT-006 – Solicitud de cambio (CR)

Given el cliente tiene un proyecto activo,

When llena el formulario de “Solicitud de cambio”,

Then se crea un CR en estado “Registrado” y se notifica al PM.

Reglas:

Flujo del CR: Registrado → En análisis (PM) → Estimado → Aprobado/Rechazado → Implementado.

El cliente debe poder ver el estado.

Adjuntos opcionales.

FR-PORT-007 – Perfil y usuarios del cliente

Given el usuario es Admin Cliente,

When entra a “Usuarios”,

Then puede:

Invitar usuarios de su empresa,

Asignar rol (Admin / Usuario),

Activar/desactivar,

Ver último acceso.

Reglas:

Solo dentro del mismo RUC.

Enviar correo de invitación. [ASUNCIÓN]

FR-PORT-008 – Selector de servicio y feature flags (BuildPro / NeuroCore)

Descripción: Controla qué módulos se muestran en el sidebar según entitlements.

Given el cliente tiene al menos 1 servicio contratado,

When selecciona “BuildPro” o “NeuroCore” en el sidepanel,

Then el menú lateral se filtra y muestra solo las secciones del servicio elegido.

Reglas:

Si el cliente no tiene NeuroCore → ocultar su grupo.

Si el cliente no tiene BuildPro → ocultar su grupo.

Debe soportar añadir servicios en el futuro (feature flags).

2. BuildPro (MOD-BP)
FR-BP-001 – Vista de proyectos y estado

Given el cliente tiene proyectos activos,

When entra a “Proyectos”,

Then ve listado con: nombre, código, estado, % avance, PM, próxima fecha/hito, deuda.

Reglas:

Filtrar por empresa/RUC.

Ordenar por fecha de actualización.

FR-BP-002 – Línea de tiempo e hitos

Given el proyecto seleccionado tiene hitos,

When abre el detalle,

Then se muestra timeline con hitos pasados, presentes y próximos (con resaltado de atrasados).

Reglas:

Mostrar % de avance y responsable.

Enlazar con documentos si aplica.

FR-BP-003 – Subir/gestionar documentos públicos (lado PM / Admin interno)

Given un PM está autenticado en la admin web,

When marca un documento como “público”,

Then el documento aparece en el portal del cliente.

Reglas:

Versionado.

Control de tipo de archivo.

Registro de quién publicó.

FR-BP-004 – Flujo de pagos

Extiende: FR-PORT-004.

Given existe un plan de pagos,

When el cliente paga o sube comprobante,

Then se actualiza el estado del hito de pago del proyecto.

Reglas:

Un pago debe vincularse a un proyecto.

Debe poder ver histórico de pagos.

FR-BP-005 – Flujo CR completo

Given hay un CR creado por el cliente,

When el PM lo toma,

Then puede:

Estimar,

Adjuntar alcance,

Marcar como aprobado/rechazado,

Y el cliente debe ver el estado.

Reglas:

Notificación en cada cambio de estado.

Comentarios internos vs. visibles para cliente. [ASUNCIÓN]

FR-BP-006 – Entrega de credenciales

Extiende: FR-PORT-005.

Given proyecto cerrado y saldo 0,

When el Admin Cliente abre “Credenciales”,

Then se listan, se enmascaran y se puede copiar.

Reglas:

Tiempo de vida configurable.

Auditoría de vistas y copias.

3. NeuroCore – Inventario (MOD-NC-INV)
FR-NC-INV-001 – Listado y KPIs de inventario

Given el cliente tiene el servicio NeuroCore activo y dataset sincronizado,

When abre /neurocore/inventario,

Then ve:

KPIs: stock total, ítems con bajo stock, rotación,

Tabla de inventario.

Reglas:

Mostrar timestamp de última sincronización.

Ordenar por criticidad.

FR-NC-INV-002 – Búsqueda, filtros y exportación

Given hay ítems cargados,

When el usuario filtra por categoría/bodega/estado,

Then la tabla se recalcula y puede exportar CSV/XLSX.

Reglas:

Límite de registros por exportación. [ASUNCIÓN]

Registrar quién exporta.

FR-NC-INV-003 – Alertas de quiebre

Given existen umbrales,

When el Admin Cliente configura una alerta,

Then el sistema crea la alerta y envía notificaciones cuando se cumpla la condición.

Reglas:

Solo Admin Cliente.

Notificación en portal o email.

4. NeuroCore – Ventas (MOD-NC-VTA)
FR-NC-VTA-001 – Panel de ventas

Given hay datos de ventas disponibles,

When entra a /neurocore/ventas,

Then ve KPIs: ventas del día, semana, mes, ticket promedio, top productos.

Reglas:

Gráficos con Recharts.

Mostrar monedas/unidades según contrato. [ASUNCIÓN]

FR-NC-VTA-002 – Filtros tiempo/canales

Given hay datos por fecha y canal,

When filtra por rango de fechas o canal,

Then los KPIs y gráficos se recalculan.

Reglas:

Debe poder comparar períodos (mes actual vs mes anterior).

Cachear últimas consultas. [ASUNCIÓN]

FR-NC-VTA-003 – Detalle transacciones

Given existen transacciones individuales,

When entra al detalle,

Then puede verlas y exportar.

Reglas:

Enmascarar datos sensibles si el rol es Usuario Cliente.

Audit trail de exportaciones.

5. NeuroCore – Clientes (MOD-NC-CLI)
FR-NC-CLI-001 – Segmentos y KPIs

Given existe una base de clientes procesada,

When el usuario abre /neurocore/clientes,

Then ve segmentos (nuevos, activos, inactivos) y KPIs (LTV, churn, frecuencia). [ASUNCIÓN]

Reglas:

Mostrar recencia de datos.

Permitir seleccionar segmento para ver detalle.

FR-NC-CLI-002 – Búsqueda y perfil 360

Given el usuario selecciona un cliente,

When abre el perfil,

Then ve compras, monto total, última compra, canal, interacciones.

Reglas:

Si el dato no está disponible en NeuroCore, mostrarlo como “no sincronizado”.

Restringir PII para Usuario Cliente si aplica. [ASUNCIÓN]

FR-NC-CLI-003 – Exportación de segmentos

Given el usuario (Admin Cliente) definió un segmento,

When hace clic en exportar,

Then se genera CSV con los campos autorizados.

Reglas:

Límite de tamaño.

Auditoría.

Campos sensibles solo para Admin.

6. IA / Copilot contextual
FR-IA-001 – Panel IA en drawer derecho

Given el usuario está en cualquier vista de NeuroCore o BuildPro,

When abre el panel de IA,

Then ve prompts sugeridos relevantes al módulo actual.

Reglas:

Debe poder enviarse al endpoint /api/ai/examples.

El módulo actual se pasa como contexto.

FR-IA-002 – Prompts de ejemplo por módulo

Given el usuario está en Inventario,

When abre IA,

Then el sistema le sugiere prompts como “¿Qué SKUs tienen rotación baja?”.

Reglas:

Lista de prompts parametrizable por rol.

Debe mostrar descripción corta y acción rápida.

FR-IA-003 – Acciones rápidas generadas por IA

Given un resultado de IA contiene una acción,

When el usuario la acepta,

Then la UI ejecuta una acción de front (filtrar tabla, abrir modal de CR, ir a detalle).

Reglas:

No ejecutar acciones destructivas sin confirmación.

Log de acciones disparadas por IA.

7. UI / Layout (shadcn)
FR-UI-001 – Sidebar dinámico por servicio

Given el usuario cambia el conmutador de servicio,

When selecciona “NeuroCore”,

Then el sidebar carga el JSON que te di antes (secciones: General, Módulos, Herramientas, Asistente IA, Configuración).

Reglas:

Soportar nuevos módulos sin redeploy (carga de config). [ASUNCIÓN]

FR-UI-002 – Topbar con búsqueda y notificaciones

Given el usuario está autenticado,

When escribe en la búsqueda,

Then puede buscar proyectos, documentos o clientes en una sola caja.

Reglas:

Debe ser extensible (global search).
## Arquitectura propuesta

- Datos remotos con React Query (caché, revalidación, estados de carga/error).
- Estado de UI con Zustand (selector de servicio, drawer IA, intentos de login locales si aplica, preferencias de tema).
- App Router con layouts anidados:
  - `app/(auth)/login` (opcional), `app/(dashboard)/dashboard` y rutas por módulo.
- API REST (Next.js `app/api/*` o backend externo) para autenticación, entitlements y datos de cada módulo.

## Rutas y navegación

- `GET /dashboard` → muestra contenido según el selector y los entitlements.
- Sidebar:
  - Logo Indrox, navegación jerárquica por secciones.
  - Selector de servicio (`BuildPro | NeuroCore`).
- Topbar:
  - Búsqueda, notificaciones, menú de usuario (perfil, tema, salida).
- Drawer derecho:
  - IA contextual siempre accesible.

## Autenticación y 2FA

- Flujo:
  1. Usuario ingresa `RUC/DNI` y `contraseña` en `/login`.
  2. Si las credenciales son válidas, se solicita 2FA si está habilitado.
  3. Tras 2FA correcto, se emite sesión (JWT/Session cookie) y se redirige a `/dashboard`.
  4. Tras 5 intentos fallidos, bloquear temporalmente el usuario.

- Endpoints (contratos iniciales):
  - `POST /api/auth/login`
    - Body: `{ id: string /* RUC|DNI */, password: string }`
    - Respuesta: `{ requires2fa: boolean, ticket?: string }` (si `requires2fa`, enviar `ticket` temporal para el segundo paso).
  - `POST /api/auth/2fa`
    - Body: `{ ticket: string, code: string }`
    - Respuesta: `{ ok: boolean, token?: string }`.
  - `GET /api/auth/entitlements`
    - Respuesta: `{ services: ("BuildPro"|"NeuroCore")[], roles: string[] }`.

> Nota: Para el bloqueo de intentos, usar almacenamiento rápido (Redis/DB) con TTL, o stub en memoria para desarrollo.

## Entitlements y selector de servicio

- Tras login, obtener `services` y guardar en estado global.
- UI del sidebar muestra selector si hay más de un servicio habilitado.
- El área principal del dashboard se actualiza en función del servicio activo.

## Módulos

- BuildPro:
  - Proyectos: estado, hitos, % avance, deuda.
  - Documentos públicos: descarga auditada.
  - Pagos: checkout con tarjeta o carga de comprobante.
  - Solicitudes de cambio (CR): flujo completo.
  - Credenciales post‑cierre: enmascaradas y revelables.
- NeuroCore:
  - Paneles de `Inventario`, `Ventas` y `Clientes`.
  - Filtros por fecha, canal y segmento.
  - Exportación `CSV/XLSX` y timestamp de actualización.

## Drawer IA (copilot)

- Prompts sugeridos por contexto/módulo:
  - "Resúmeme los hitos atrasados este mes."
  - "Detecta SKUs con quiebre probable."
  - "Compara ventas online vs retail Q/Q."
  - "Lista clientes con churn probable."
- Few‑shot prompting con plantillas + tooltips: "¿Qué puedo preguntar aquí?".
- Acciones rápidas: abrir CR prellenado, exportar, aplicar filtros.
- API: `POST /api/assistant/query` con `{ context, prompt }` → `{ result, actions }`.

## Theming (Indrox)

- Paleta:
  - `primary: #1E40AF`, `primary-foreground: #FFFFFF`
  - `secondary: #22C55E`, `accent: #F59E0B`
  - `muted: #64748B`, `background: #0B1220`, `foreground: #E2E8F0`
- Implementación sugerida:
  - Definir variables CSS en `app/globals.css`:

```css
:root {
  --primary: #1E40AF;
  --primary-foreground: #FFFFFF;
  --secondary: #22C55E;
  --accent: #F59E0B;
  --muted: #64748B;
  --background: #0B1220;
  --foreground: #E2E8F0;
}
[data-theme="dark"] {
  /* opcional: ajustes para modo oscuro */
}
```

- Integración con `next-themes` para un switch persistente en el topbar.

## Datos y estado

- React Query: `queries/` y `services/` para fetching y caché.
- Zustand: `stores/` para UI (tema, servicio activo, drawer IA, etc.).
- Tipos en `types/` (Project, Milestone, CR, Payment, Inventory, Sale, Customer).

## API REST (contratos iniciales)

- Auth:
  - `POST /api/auth/login`, `POST /api/auth/2fa`, `GET /api/auth/entitlements`.
- BuildPro:
  - `GET /api/buildpro/projects`, `GET /api/buildpro/documents`,
  - `POST /api/buildpro/payments/checkout`, `POST /api/buildpro/payments/receipt`,
  - `POST /api/buildpro/cr` (crear), `GET /api/buildpro/cr/:id`.
- NeuroCore:
  - `GET /api/neurocore/inventory`, `GET /api/neurocore/sales`, `GET /api/neurocore/customers`.
- Exportaciones:
  - `POST /api/export` → `{ type: 'csv'|'xlsx', dataset, filters }`.

## Pasarela de pagos (stub)

- Culqi/Niubiz:
  - Simular `tokenización` y `captura` en entorno dev.
  - Contratos mínimos: `POST /api/payments/culqi/checkout`, `POST /api/payments/niubiz/checkout`.

## Instalación y ejecución

- Requisitos: Node.js 18+.
- Instalar dependencias:

```bash
npm install
```

- Ejecutar en desarrollo:

```bash
npm run dev
```

- Build y arranque:

```bash
npm run build
npm start
```

## Roadmap inicial

- Implementar contratos de Auth con intento/bloqueo y 2FA.
- Integrar entitlements y selector de servicio en el sidebar.
- Conectar datos de BuildPro (proyectos, documentos, pagos, CR).
- Conectar datos de NeuroCore (inventario, ventas, clientes, exportaciones).
- Añadir drawer IA con prompts y acciones rápidas.
- Aplicar theming Indrox y switch claro/oscuro persistente.
- Añadir tests básicos de rutas y contratos de API.

## Notas de desarrollo

- Mantener coherencia de diseño con shadcn/ui.
- Evitar acoplar UI con fetching: usar hooks y servicios.
- Seguir tipado estricto con TypeScript.

---

Este README sienta las bases para continuar con la implementación del portal. A partir de aquí, se crearán rutas de API, stores de estado, vistas de módulo y el drawer de IA conforme al roadmap.
# Sidebar dinámico por servicios contratados

Este proyecto implementa un sidebar que muestra opciones de menú dinámicamente según los servicios contratados por el cliente (BuildPro, NeuroCore), obtenidos de un backend con autenticación segura.

## Requerimientos Funcionales
- Conexión con backend para consultar servicios activos del usuario autenticado.
- Visualización condicional del menú:
  - Si el cliente contrata BuildPro, se muestran las opciones de BuildPro.
  - Si el cliente contrata NeuroCore, se muestran las opciones de NeuroCore.
  - Si contrata ambos, se muestran ambas secciones.
- Manejo de estados de carga y error en el sidebar.
- Transiciones suaves al renderizar opciones.
- Exportes y KPI ya existentes en páginas de NeuroCore se mantienen.

## Especificaciones Técnicas del Backend
- Endpoint: `GET /api/services`
  - Retorna `{ services: string[] }`, con valores posibles: `"buildpro"`, `"neurocore"`.
  - Autenticación: basada en cookies de Supabase (SSR), usando `createSupabaseRouteClient`.
  - Fuente de datos: tabla `nc_customer_services` en Supabase con RLS.
- Tabla `nc_customer_services`:
  - `user_id uuid` (PK compuesto con `service_code`).
  - `service_code text` en (`buildpro`,`neurocore`).
  - `active boolean`.
  - Política RLS: lectura permitida solo si `auth.uid() = user_id` y `active=true`.

## Flujo de Autenticación y Autorización
- Login vía Supabase (`email/password` u OAuth).
- El servidor (Next.js App Router) usa cookies para identificar al usuario en `GET /api/services`.
- RLS de Supabase asegura que cada usuario solo puede leer sus servicios.
- El cliente (sidebar) consulta `/api/services` con `credentials: 'include'`.

## Estructura de Datos Esperada
```json
{
  "services": ["buildpro", "neurocore"]
}
```

## Arquitectura de Acceso a Datos (DAO/Servicios)

- Capas lógicas añadidas para mantenimiento y escalabilidad:
  - Capa de configuración: `lib/config/env.ts` centraliza y valida variables (`NODE_ENV`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
  - Logging: `lib/logging/logger.ts` con niveles (`debug`, `info`, `warn`, `error`) y helper de métricas (`time`).
  - DAO Supabase: `lib/dao/supabase-dao.ts` provee `listByUser(table, userId, columns)` aplicando filtros por usuario cuando la tabla tiene columna (`user_id`/`created_by`).
  - Servicios de negocio: `lib/services/user-data.service.ts` agrega datos de todas las tablas relevantes del esquema NeuroCore.
  - Helpers de errores: `lib/helpers/errors.ts` para normalizar y propagar errores con contexto.

### Endpoint agregado
- `GET /api/user-data`
  - Autenticación SSR vía `createSupabaseRouteClient`.
  - Retorna datos agregados filtrados por el usuario actual en tablas con vínculo de usuario y datos de alcance global cuando aplica (según RLS/servicios).
  - Respuesta incluye `roles`, `services`, `exports`, `notifications`, `inventoryAlerts`, `syncStatus`, `inventoryItems`, `salesOrders`, `customers` y `errors` (si las hay).

### Principios aplicados
- SOLID: separación de responsabilidades (config/logging/DAO/servicios), interfaces claras y dependencias invertidas vía inyección de `SupabaseClient` en servicios/DAO.
- Seguridad: credenciales gestionadas desde entorno; autenticación SSR; RLS de Supabase; consultas parametrizadas con filtros por usuario.
- Errores: manejo consistente con helpers y logging contextual.
- Optimización: consultas paralelas (`Promise.all`) y medición de rendimiento (`logger.time`).

### Flujo de datos
- Cliente → `GET /api/user-data` (cookies de sesión).
- Servidor obtiene `user.id` → Servicio llama DAO → DAO ejecuta consultas filtradas → Agregado y logging → Respuesta JSON.

### Puntos de extensión
- Añadir nuevas tablas al `SupabaseDAO` y al `user-data.service` (definiendo columna de usuario si aplica).
- Sustituir `logger` por sink externo (p.ej. Logflare, Datadog) manteniendo la interfaz.
- Añadir validaciones de esquema para la respuesta (p.ej. con Zod) si se desea.

- Si el usuario no tiene servicios activos, se retorna `services: []`.

## Criterios de Aceptación
- Backend
  - [ ] `GET /api/services` devuelve 200 con lista de servicios activos.
  - [ ] Responde 401 si el usuario no está autenticado.
  - [ ] RLS bloquea acceso a servicios de otros usuarios.
- Frontend
  - [ ] Sidebar muestra solo opciones correspondientes a los servicios contratados.
  - [ ] Muestra skeletons en carga y un mensaje de error si la consulta falla.
  - [ ] Transiciones suaves sin flicker.
- Pruebas
  - [ ] Pruebas unitarias para la función de mapeo `getMenuByServices` cubren casos de BuildPro, NeuroCore y ambos.

## Calidad del Código
- Pruebas unitarias incluidas (`tests/menu-logic.test.ts`) usando Vitest.
- Lógica de visualización aislada en `lib/sidebar/menu-logic.ts`.
- Documentación en este README y comentarios ligeros en los componentes.

## Experiencia de Usuario
- Sidebar indica estados de carga con `Skeleton`.
- Errores de carga muestran feedback visual con icono y texto.
- Transiciones de UI gestionadas por los estilos del componente de Sidebar (Shadcn), con clases de transición.

## Cómo Probar
1. Aplique la migración SQL de `supabase/schema/neurocore.sql` en su proyecto Supabase.
2. Inserte servicios para su usuario en `nc_customer_services`:
   ```sql
   insert into nc_customer_services (user_id, service_code, active)
   values ('<SU-UUID>', 'neurocore', true);
   ```
3. Inicie sesión en la app y navegue para ver el sidebar.
4. Cambie servicios activos y recargue para verificar que las opciones cambian dinámicamente.