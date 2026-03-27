import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

// Daily cron — runs once at ~6 AM CST (12:00 UTC)
// Handles: chores digest, study progress, finance payday, work task deadlines

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const today = new Date().toISOString().split('T')[0]
  const dayOfWeek = new Date().getDay() // 0=Sun ... 6=Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  // Get all households with a webhook configured
  const { data: households } = await supabase
    .from('households')
    .select('id, discord_webhook_url')
    .not('discord_webhook_url', 'is', null)

  if (!households || households.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let totalSent = 0

  for (const hh of households) {
    if (!hh.discord_webhook_url) continue
    const embeds: DiscordEmbed[] = []

    // ─── CHORES: daily digest ───
    await appendChoresDigest(supabase, hh.id, today, isWeekend, embeds)

    // ─── STUDIES: progress check ───
    await appendStudiesCheck(supabase, hh.id, today, embeds)

    // ─── WORK TASKS: deadline alerts ───
    await appendTaskDeadlines(supabase, hh.id, today, embeds)

    // ─── FINANCE: payday + spending threshold ───
    await appendFinanceAlerts(supabase, hh.id, today, embeds)

    // Send all embeds (Discord allows up to 10 per message)
    if (embeds.length > 0) {
      const batches = chunk(embeds, 10)
      for (const batch of batches) {
        try {
          await fetch(hh.discord_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: batch }),
          })
          totalSent += batch.length
        } catch { /* best-effort */ }
      }
    }
  }

  return NextResponse.json({ sent: totalSent })
}

// ========================================================
// CHORES — daily tasks at 6 AM, weekly/quincenal/mensual on weekends
// ========================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function appendChoresDigest(
  supabase: any,
  householdId: string,
  today: string,
  isWeekend: boolean,
  embeds: DiscordEmbed[],
) {
  // Daily pending instances for today
  const { data: todayInstances } = await supabase
    .from('chore_instances')
    .select('*, chore_templates(nombre, icono, frecuencia), profiles:assigned_to(display_name)')
    .eq('household_id', householdId)
    .eq('due_date', today)
    .eq('status', 'pending')

  const dailyTasks = (todayInstances ?? []).filter(
    (i: any) => i.chore_templates?.frecuencia === 'diaria' || i.chore_templates?.frecuencia === 'unica'
  )
  const periodicTasks = (todayInstances ?? []).filter(
    (i: any) => ['semanal', 'quincenal', 'mensual'].includes(i.chore_templates?.frecuencia)
  )

  // Daily chores — always notify
  if (dailyTasks.length > 0) {
    const lines = dailyTasks.map((i: any) => {
      const name = i.chore_templates?.nombre ?? '?'
      const assignee = (i.profiles as any)?.display_name ?? 'Sin asignar'
      return `• ${name} — ${assignee}`
    })
    embeds.push({
      title: 'Tareas del hogar para hoy',
      description: lines.join('\n'),
      color: 0xf59e0b,
      footer: { text: 'Kelsie - Tareas del dia' },
      timestamp: new Date().toISOString(),
    })
  }

  // Periodic chores — only on weekends
  if (isWeekend && periodicTasks.length > 0) {
    const lines = periodicTasks.map((i: any) => {
      const name = i.chore_templates?.nombre ?? '?'
      const freq = i.chore_templates?.frecuencia ?? ''
      const assignee = (i.profiles as any)?.display_name ?? 'Sin asignar'
      return `• [${freq}] ${name} — ${assignee}`
    })
    embeds.push({
      title: 'Tareas pendientes (semanal/quincenal/mensual)',
      description: lines.join('\n'),
      color: 0xf59e0b,
      footer: { text: 'Kelsie - Recordatorio de fin de semana' },
      timestamp: new Date().toISOString(),
    })
  }
}

// ========================================================
// STUDIES — course day reminders + progress behind schedule
// ========================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function appendStudiesCheck(
  supabase: any,
  householdId: string,
  today: string,
  embeds: DiscordEmbed[],
) {
  const { data: goals } = await supabase
    .from('study_goals')
    .select('*, profiles(display_name)')
    .eq('household_id', householdId)
    .in('status', ['in_progress', 'not_started'])

  if (!goals || goals.length === 0) return

  const behindSchedule: string[] = []

  for (const goal of goals) {
    const memberName = (goal.profiles as any)?.display_name ?? 'Miembro'

    // Check if behind schedule based on fecha_inicio, fecha_meta, total_unidades, unidades_completadas
    if (goal.fecha_inicio && goal.fecha_meta && goal.total_unidades > 0) {
      const start = new Date(goal.fecha_inicio)
      const end = new Date(goal.fecha_meta)
      const now = new Date(today)

      const totalDays = Math.max(1, (end.getTime() - start.getTime()) / 86400000)
      const elapsed = Math.max(0, (now.getTime() - start.getTime()) / 86400000)
      const expectedUnits = Math.floor((elapsed / totalDays) * goal.total_unidades)
      const actualUnits = goal.unidades_completadas ?? 0

      if (actualUnits < expectedUnits && elapsed > 0) {
        const diff = expectedUnits - actualUnits
        behindSchedule.push(
          `• **${goal.titulo}** (${memberName}): ${actualUnits}/${goal.total_unidades} unidades — deberia llevar ~${expectedUnits}. Atrasado por ${diff} unidad${diff !== 1 ? 'es' : ''}`
        )
      }

      // Notify if today is the fecha_meta (deadline day)
      if (today === goal.fecha_meta) {
        embeds.push({
          title: `Hoy vence tu meta: ${goal.titulo}`,
          description: `${memberName} — Progreso: ${actualUnits}/${goal.total_unidades} unidades`,
          color: goal.unidades_completadas >= goal.total_unidades ? 0x10b981 : 0xef4444,
          footer: { text: 'Kelsie - Estudios' },
          timestamp: new Date().toISOString(),
        })
      }
    }
  }

  if (behindSchedule.length > 0) {
    embeds.push({
      title: 'Estudios: progreso atrasado',
      description: behindSchedule.join('\n'),
      color: 0x8b5cf6,
      footer: { text: 'Kelsie - Seguimiento de estudios' },
      timestamp: new Date().toISOString(),
    })
  }
}

// ========================================================
// WORK TASKS — deadline proximity based on priority
// ========================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function appendTaskDeadlines(
  supabase: any,
  householdId: string,
  today: string,
  embeds: DiscordEmbed[],
) {
  // Get all non-completed tasks with due dates for this household's members
  const { data: tasks } = await supabase
    .from('work_tasks')
    .select('*, profiles:user_id(display_name)')
    .eq('household_id', householdId)
    .in('status', ['backlog', 'in_progress'])
    .not('due_date', 'is', null)

  if (!tasks || tasks.length === 0) return

  // Priority → days before deadline to start warning
  const warningDays: Record<string, number> = {
    urgent: 3,
    high: 2,
    mid: 1,
    low: 0,
  }

  const approaching: string[] = []
  const dueToday: string[] = []
  const overdue: string[] = []

  const todayDate = new Date(today)

  for (const task of tasks) {
    const dueDate = new Date(task.due_date)
    const daysLeft = Math.floor((dueDate.getTime() - todayDate.getTime()) / 86400000)
    const warn = warningDays[task.prioridad] ?? 1
    const memberName = (task.profiles as any)?.display_name ?? 'Miembro'
    const prioLabel = task.prioridad.toUpperCase()

    if (daysLeft < 0) {
      // Overdue — notify daily
      overdue.push(`• **${task.titulo}** [${prioLabel}] (${memberName}) — vencida hace ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) !== 1 ? 's' : ''}`)
    } else if (daysLeft === 0) {
      // Due today
      dueToday.push(`• **${task.titulo}** [${prioLabel}] (${memberName})`)
    } else if (daysLeft <= warn) {
      // Approaching deadline
      approaching.push(`• **${task.titulo}** [${prioLabel}] (${memberName}) — ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`)
    }
  }

  if (overdue.length > 0) {
    embeds.push({
      title: 'Tareas de trabajo VENCIDAS',
      description: overdue.join('\n'),
      color: 0xef4444,
      footer: { text: 'Kelsie - Trabajo' },
      timestamp: new Date().toISOString(),
    })
  }

  if (dueToday.length > 0) {
    embeds.push({
      title: 'Tareas de trabajo — vencen HOY',
      description: dueToday.join('\n'),
      color: 0xf59e0b,
      footer: { text: 'Kelsie - Trabajo' },
      timestamp: new Date().toISOString(),
    })
  }

  if (approaching.length > 0) {
    embeds.push({
      title: 'Tareas de trabajo — se acerca la fecha limite',
      description: approaching.join('\n'),
      color: 0x6366f1,
      footer: { text: 'Kelsie - Trabajo' },
      timestamp: new Date().toISOString(),
    })
  }
}

// ========================================================
// FINANCE — payday reminder + spending threshold alerts
// ========================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function appendFinanceAlerts(
  supabase: any,
  householdId: string,
  today: string,
  embeds: DiscordEmbed[],
) {
  // Check active quincena
  const { data: quincena } = await supabase
    .from('quincenas')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .maybeSingle()

  if (!quincena) return

  // Payday notification: if today is fecha_inicio or fecha_fin
  if (today === quincena.fecha_inicio || today === quincena.fecha_fin) {
    embeds.push({
      title: today === quincena.fecha_inicio
        ? `Inicio de quincena: ${quincena.nombre}`
        : `Fin de quincena: ${quincena.nombre}`,
      description: today === quincena.fecha_inicio
        ? `Saldo inicial: $${Number(quincena.saldo_inicial).toLocaleString('es-MX')}. Organiza tus cuentas por pagar.`
        : 'Ultima oportunidad para registrar gastos e ingresos de esta quincena.',
      color: 0x10b981,
      footer: { text: 'Kelsie - Finanzas' },
      timestamp: new Date().toISOString(),
    })
  }

  // Spending threshold check: if gastos > 80% of saldo_inicial
  const { data: transacciones } = await supabase
    .from('transacciones')
    .select('tipo, importe')
    .eq('quincena_id', quincena.id)

  if (transacciones) {
    const totalGastos = transacciones
      .filter((t: any) => t.tipo === 'gasto')
      .reduce((sum: number, t: any) => sum + Number(t.importe), 0)
    const totalIngresos = transacciones
      .filter((t: any) => t.tipo === 'ingreso')
      .reduce((sum: number, t: any) => sum + Number(t.importe), 0)

    const saldo = Number(quincena.saldo_inicial) + totalIngresos
    const threshold80 = saldo * 0.8
    const threshold100 = saldo

    if (totalGastos >= threshold100) {
      embeds.push({
        title: 'ALERTA: Gastos superan el saldo disponible',
        description: `Has gastado $${totalGastos.toLocaleString('es-MX')} de $${saldo.toLocaleString('es-MX')} disponibles en "${quincena.nombre}".`,
        color: 0xef4444,
        footer: { text: 'Kelsie - Finanzas' },
        timestamp: new Date().toISOString(),
      })
    } else if (totalGastos >= threshold80) {
      embeds.push({
        title: 'Cuidado: Gastos al 80% del saldo',
        description: `Has gastado $${totalGastos.toLocaleString('es-MX')} de $${saldo.toLocaleString('es-MX')} disponibles en "${quincena.nombre}". Quedan $${(saldo - totalGastos).toLocaleString('es-MX')}.`,
        color: 0xf59e0b,
        footer: { text: 'Kelsie - Finanzas' },
        timestamp: new Date().toISOString(),
      })
    }

    // Per-category budget alerts (>100% of budget)
    const { data: presupuestos } = await supabase
      .from('presupuesto_quincena')
      .select('*, categorias(nombre, icono)')
      .eq('quincena_id', quincena.id)

    if (presupuestos) {
      const gastosByCategoria: Record<string, number> = {}
      for (const t of transacciones.filter((t: any) => t.tipo === 'gasto')) {
        gastosByCategoria[(t as any).categoria_id] = (gastosByCategoria[(t as any).categoria_id] ?? 0) + Number(t.importe)
      }

      // Need categoria_id on transacciones — re-query with it
      const { data: txWithCat } = await supabase
        .from('transacciones')
        .select('tipo, importe, categoria_id')
        .eq('quincena_id', quincena.id)
        .eq('tipo', 'gasto')

      const catSpend: Record<string, number> = {}
      for (const t of txWithCat ?? []) {
        catSpend[t.categoria_id] = (catSpend[t.categoria_id] ?? 0) + Number(t.importe)
      }

      const overBudget: string[] = []
      for (const p of presupuestos) {
        const spent = catSpend[p.categoria_id] ?? 0
        const budget = Number(p.monto_previsto)
        if (budget > 0 && spent > budget) {
          const catName = (p.categorias as any)?.nombre ?? '?'
          overBudget.push(`• ${catName}: $${spent.toLocaleString('es-MX')} / $${budget.toLocaleString('es-MX')} (+${Math.round(((spent - budget) / budget) * 100)}%)`)
        }
      }

      if (overBudget.length > 0) {
        embeds.push({
          title: 'Categorias sobre presupuesto',
          description: overBudget.join('\n'),
          color: 0xef4444,
          footer: { text: 'Kelsie - Finanzas' },
          timestamp: new Date().toISOString(),
        })
      }
    }
  }
}

// ─── Helpers ───

interface DiscordEmbed {
  title: string
  description?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
  footer?: { text: string }
  timestamp?: string
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}
