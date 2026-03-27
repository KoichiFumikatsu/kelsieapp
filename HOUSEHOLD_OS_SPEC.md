# Household OS — Documentación de Arquitectura y Diseño

## 1. Arquitectura Base (Shared Context)

Antes de definir las tareas específicas, se establece la arquitectura base para asegurar que Backend y Frontend hablen el mismo idioma.

**Entidades compartidas (core):**
```
household → users → roles → module_permissions
                ↓
         notifications (Discord webhook)
                ↓
    [chores | finance | tasks | medical | studies]
```

**Regla de herencia:**
Cada módulo tiene su propio schema pero hereda obligatoriamente: `household_id`, `created_by`, `assigned_to`, `status`, `notify_on_change`.

---

## 2. Especificaciones Técnicas (Backend)

**Rol:** Senior Full Stack Engineer especializado en arquitectura modular, Next.js 14 App Router, Supabase y Vercel.

### 2.1. Visión del Proyecto
**"Household OS"** — una plataforma de gestión doméstica para dos personas (pareja) compuesta por módulos independientes pero con core compartido.

### 2.2. Stack Tecnológico
- **Framework:** Next.js 14+ con App Router y TypeScript estricto (sin `any`).
- **Backend/BaaS:** Supabase (PostgreSQL + Auth + RLS + Realtime + Edge Functions).
- **Hosting:** Vercel (free tier compatible).
- **Estilos:** Tailwind CSS.
- **Notificaciones:** Discord Webhooks.

### 2.3. Módulos Funcionales
1. **Finance** — Presupuestos quincenales, transacciones, categorías.
2. **Chores** — Tareas del hogar con puntos/recompensas.
3. **Work Tasks** — Tareas laborales personales con estado y prioridad.
4. **Medical** — Seguimiento de revisiones médicas y medicamentos.
5. **Studies** — Seguimiento de cursos, metas de estudio, progreso.

### 2.4. Schema de Base de Datos

#### SCHEMA: CORE (Compartido)
```sql
-- Households: la unidad base (la pareja)
households (
  id uuid PK,
  name text,
  invite_code text UNIQUE,  -- para que el 2do usuario se una
  discord_webhook_url text, -- webhook global del household
  settings jsonb DEFAULT '{}', -- config general
  created_at, updated_at
)

-- Profiles: extiende auth.users
profiles (
  id uuid PK REFERENCES auth.users,
  household_id uuid REFERENCES households,
  display_name text,
  avatar_emoji text DEFAULT '🧑',
  color_hex text DEFAULT '#1A7A5A', -- color del usuario en UI
  role text CHECK IN ('owner', 'member'),
  created_at, updated_at
)

-- Permisos por módulo
module_permissions (
  id uuid PK,
  household_id uuid,
  user_id uuid REFERENCES profiles,
  module text CHECK IN ('finance','chores','tasks','medical','studies'),
  can_view boolean DEFAULT true,
  can_edit boolean DEFAULT true,
  can_delete boolean DEFAULT false,
  can_manage boolean DEFAULT false, -- administrar config del módulo
  created_at
)

-- Log de notificaciones enviadas
notification_log (
  id uuid PK,
  household_id uuid,
  module text,
  event_type text,       -- 'created','completed','overdue','reminder'
  payload jsonb,         -- lo que se envió al webhook
  sent_at timestamp,
  success boolean
)
```

#### SCHEMA: MÓDULO FINANCE
```sql
quincenas (
  id, household_id, nombre, fecha_inicio date, fecha_fin date,
  saldo_inicial numeric CHECK > 0, is_active boolean, created_by uuid
)
categorias (
  id, household_id, nombre, tipo CHECK IN ('gasto','ingreso'),
  presupuesto_default numeric DEFAULT 0, emoji text, orden int,
  module text DEFAULT 'finance'
)
presupuesto_quincena (
  id, quincena_id, categoria_id, monto_previsto numeric
)
transacciones (
  id, quincena_id, categoria_id, user_id, tipo CHECK IN ('gasto','ingreso'),
  fecha date, importe numeric CHECK > 0, descripcion text
)
```

#### SCHEMA: MÓDULO CHORES
```sql
chore_templates (
  id, household_id, nombre, descripcion text, emoji text,
  frecuencia text CHECK IN ('diaria','semanal','quincenal','mensual','unica'),
  puntos int DEFAULT 10, assigned_to uuid REFERENCES profiles,
  notify_on_complete boolean DEFAULT true
)
chore_instances (
  id, template_id, household_id, assigned_to uuid,
  due_date date, completed_at timestamp, completed_by uuid,
  puntos_earned int, status text CHECK IN ('pending','done','skipped'),
  nota text
)
reward_log (
  id, household_id, user_id, puntos int, razon text, created_at
)
```

#### SCHEMA: MÓDULO WORK TASKS
```sql
work_tasks (
  id, household_id, user_id, -- cada tarea es privada del usuario
  titulo text, descripcion text, prioridad text CHECK IN ('low','mid','high','urgent'),
  status text CHECK IN ('backlog','in_progress','done','cancelled'),
  due_date date, tags text[], 
  notify_on_due boolean DEFAULT false,
  created_at, updated_at
)
```

#### SCHEMA: MÓDULO MEDICAL
```sql
medical_records (
  id, household_id, user_id, tipo text CHECK IN ('consulta','examen','vacuna','control'),
  especialidad text, fecha date, proxima_cita date,
  doctor text, clinica text, notas text, archivos jsonb DEFAULT '[]',
  notify_days_before int DEFAULT 3, -- días antes para recordatorio
  created_at
)
medicamentos (
  id, household_id, user_id, nombre text, dosis text,
  frecuencia text, fecha_inicio date, fecha_fin date,
  activo boolean DEFAULT true, notas text
)
```

#### SCHEMA: MÓDULO STUDIES
```sql
study_goals (
  id, household_id, user_id, titulo text, descripcion text,
  categoria text CHECK IN ('curso','libro','certificacion','idioma','habilidad'),
  plataforma text, url text, total_unidades int,
  unidades_completadas int DEFAULT 0, fecha_inicio date, fecha_meta date,
  status text CHECK IN ('not_started','in_progress','completed','paused'),
  notify_on_milestone boolean DEFAULT true
)
study_sessions (
  id, goal_id, user_id, fecha date, minutos int CHECK > 0,
  unidades_avanzadas int DEFAULT 0, nota text
)
```

### 2.5. Row Level Security (RLS)
Para CADA tabla de todos los módulos, aplica esta lógica:
- El usuario debe pertenecer al mismo `household` que el recurso.
- **Work Tasks y Medical son privados:** solo el `user_id` dueño puede ver/editar.
- El resto es compartido entre ambos miembros del household.
- Solo rol `'owner'` puede eliminar o cambiar `module_permissions`.
- Nadie puede ver datos de otros households.

### 2.6. Edge Functions — Discord Notifications
Crea una Supabase Edge Function `notify-discord` que:
1. Se activa por Database Webhooks.
2. Recibe: `{ module, event_type, data, household_id }`.
3. Busca el `discord_webhook_url` del household.
4. Construye un Discord Embed formateado por módulo.
5. Registra el resultado en `notification_log`.

**Formatos de embed:**
- Finance: "💸 Nueva transacción: -$95,000 en Comida (Kelsie)"
- Chores: "✅ Tarea completada: Lavar platos +10pts (Pareja)"
- Tasks: "🔴 Tarea urgente vencida: Entregar informe (Kelsie)"
- Medical: "🏥 Recordatorio: Cita cardiología en 3 días (Pareja)"
- Studies: "🎓 Meta alcanzada: 50% del curso de Next.js (Kelsie)"

### 2.7. Estructura de Carpetas
```
/app
  /(auth)/login, /register, /join/[code]
  /(app)
    /layout.tsx              — sidebar + header compartido
    /dashboard/page.tsx      — resumen de todos los módulos
    /finance/...
    /chores/...
    /tasks/...
    /medical/...
    /studies/...
    /settings
      /household/page.tsx    — nombre, webhook Discord, invite
      /permissions/page.tsx  — gestión de permisos por módulo
      /profile/page.tsx

/components
  /ui/                       — componentes genéricos (Button, Card, Modal, Badge)
  /layout/                   — Sidebar, Header, BottomNav (mobile)
  /modules/
    /finance/
    /chores/
    /tasks/
    /medical/
    /studies/

/lib
  /supabase/client.ts, server.ts, middleware.ts
  /types/database.types.ts   — generado del schema
  /types/modules.types.ts    — tipos de dominio por módulo
  /utils/format.ts           — COP formatter, fechas en español
  /utils/discord.ts          — helper para construir embeds

/app/actions/
  /core/households.ts, permissions.ts
  /finance/quincenas.ts, transacciones.ts, categorias.ts, dashboard.ts
  /chores/templates.ts, instances.ts, rewards.ts
  /tasks/tasks.ts
  /medical/records.ts, medicamentos.ts, reminders.ts
  /studies/goals.ts, sessions.ts

/hooks
  /useHousehold.ts
  /usePermissions.ts         — hook que expone can(module, action)
  /useRealtime.ts            — subscripción genérica a cambios
```

### 2.8. Sistema de Permisos y Server Actions

**Hook usePermissions:**
```typescript
// Uso: const { can } = usePermissions()
can('finance', 'edit')    // → true | false
can('medical', 'delete')  // → false (solo owner)
```

**Patrón de retorno para Actions:**
```typescript
type ActionResult<T> = 
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string }
```

### 2.9. Realtime Strategy
- `transacciones` (finance): Ambos usuarios ven cambios en tiempo real.
- `chore_instances` (chores): Actualización instantánea al completar tareas.
- `work_tasks` & `medical_records`: **NO** realtime (datos privados).
- `study_goals`: Realtime opcional (motivación compartida).

---

## 3. Especificaciones de Diseño y UX (Frontend)

**Rol:** Senior UX/UI Designer y Frontend Developer especializado en Fintech, Productivity Apps y Design Systems.

### 3.1. Visión del Producto
Plataforma de gestión doméstica modular para una pareja. Debe sentirse como un sistema operativo personal, no como 5 apps pegadas.

### 3.2. Usuarios y Perfiles Neurodivergentes
1. **Kelsie (TDAH):** Necesita entrada rápida, feedback visual inmediato, sin friction. Responde bien al gamification.
2. **Pareja (Espectro Autista):** Necesita distinción clara entre estados, números alineados, colores semánticos consistentes, predicibilidad.

### 3.3. Identidad Visual — "Clean Operational"

**Paleta de Colores**
```css
/* Core */
--bg:           #F2F0EB;    /* base, warm off-white */
--surface:      #FFFFFF;
--surface-2:    #F8F7F4;
--text-1:       #191917;    /* casi negro */
--text-2:       #6B6960;
--text-3:       #A8A59F;

/* Semánticos (FIJOS) */
--income:       #1A7A5A;    /* verde — siempre = dinero que entra / éxito */
--expense:      #C0472A;    /* terracota — siempre = dinero que sale / alerta */
--warn:         #B87428;    /* ámbar — siempre = advertencia */
--info:         #2563A8;    /* azul — siempre = información */

/* Por módulo (accent colors) */
--mod-finance:  #1A7A5A;
--mod-chores:   #7C5CBF;
--mod-tasks:    #2563A8;
--mod-medical:  #C0472A;
--mod-studies:  #B87428;
```

**Tipografía**
- **Display/Números:** JetBrains Mono (monoespaciado para cifras y datos).
- **UI:** DM Sans (limpia, legible).
- **Prohibido:** Inter, Roboto, Arial, system-ui.

**Principios de Diseño**
1. Los números SIEMPRE alineados a la derecha con font-family mono.
2. Los colores semánticos son invariables.
3. Cada módulo tiene su accent color pero hereda el sistema base.
4. Vistas privadas tienen indicador visual sutil (🔒 o borde discontinuo).

### 3.4. Componentes del Design System

1. **Shell Principal:**
   - App móvil-first: max-width 430px, centrado en desktop.
   - Header fijo + Bottom nav (5 íconos con accent color del módulo activo).
   - Transición entre módulos: fade suave + cambio de accent color.

2. **Componentes Reutilizables (Lista):**
   - `<ModuleCard>`: Card del home con accent, métricas y badge.
   - `<ProgressBar double>`: Barra previsto vs real.
   - `<StatusBadge>`: Badge de estado (pending/done/overdue).
   - `<UserAvatar>`: Emoji + color de perfil.
   - `<BottomSheet>`: Overlay con drag-to-close.
   - `<QuickAdd>`: Campo inline tipo comando.
   - `<KanbanCard>`: Card con borde de prioridad.
   - `<TimelineItem>`: Ítem de timeline vertical.
   - `<CircularProgress>`: Anillo de progreso.
   - `<PermissionsGrid>`: Tabla de módulos × acciones con toggles.
   - `<StreakCounter>`: Contador de racha.
   - `<ScoreCard>`: Comparativo de puntos.

### 3.5. Vistas a Diseñar

1. **Dashboard Home:** Grid 2x3 de módulos + sección "Hoy" (items urgentes).
2. **Finance:** Selector quincena, KPIs, barras, bottom sheet para transacciones.
3. **Chores:** Lista de tareas, botón completar (animado), scoreboard.
4. **Work Tasks (Privado):** Kanban simplificado, Quick-add.
5. **Medical (Privado):** Timeline vertical, pastillero visual.
6. **Studies:** Lista de metas con progreso circular, botón sesión hoy, racha.
7. **Settings:** Gestión de hogar, permisos (grid), perfil.

### 3.6. Patrones de Interacción

**Para TDAH (Kelsie):**
- FAB siempre visible.
- Formularios cortos (<4 campos).
- Optimistic Updates (feedback inmediato).
- Animación de completado (pulso verde).

**Para Espectro Autista (Pareja):**
- Navegación consistente (mismo bottom nav).
- Colores semánticos invariables.
- Filtros visibles siempre.
- Acciones destructivas requieren confirmación explícita.
- Indicador de vista privada siempre visible.

### 3.7. Animaciones
- Cambio de módulo: 300ms suave.
- Completar chore: Pulso expansivo + "+10pts" flotante.
- Barras de progreso: Animación desde 0 (600ms ease).
- Eliminar: Slide-out + fade.

---

## 4. Restricciones Técnicas y Despliegue

### Restricciones de Código
- TypeScript estricto en todo.
- Server Components por defecto.
- Sin librerías de state management globales.
- Comentarios de lógica de negocio en español.

### Despliegue
1. **Supabase:** Crear proyecto, correr SQL, configurar Auth URLs.
2. **Vercel:** Conectar repo, variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
3. **Webhooks:** Configurar Database Webhooks para Edge Functions.
4. **Verificación:** Testear RLS con Policy Editor.
5. **E2E:** Verificar flujo de invitación de pareja.
``