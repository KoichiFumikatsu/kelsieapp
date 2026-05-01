---
type: project
updated: 2026-04-29
---

# Decisiones técnicas y de producto

## Arquitectura
- App Router de Next.js 16 con dos route groups: `(auth)` y `(app)`
- Middleware implementado en `proxy.ts` (no en middleware.ts estándar)
- Server actions usan el patrón `ActionResult<T>`
- RLS en todas las tablas; scope household_id para módulos compartidos

## Módulos activos
1. **Finance** — quincenas, categorías, transacciones, presupuesto, bolsillos, crédito acumulado
2. **Chores** — templates, instancias, reward_log, sistema de puntos
3. **Tasks** — work_tasks privadas, estilo Kanban
4. **Medical** — records y medicamentos con scheduling (privado → compartido en roadmap)
5. **Studies** — goals, sessions, streak counter

## Cron
- `daily-digest` configurado en vercel.json (noon UTC)
- `med-reminders` existe pero NO está en vercel.json aún
- pg_cron en Supabase corre cada 15 min

## Historial de decisiones importantes
<!-- Agregar aquí decisiones significativas con fecha -->
- 2026-04-29: Se crea sistema de memoria persistente en /memory/
