import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

// Daily cron — sends today's medication schedule for all households

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

  // Get all active medications with scheduling info
  const { data: activeMeds, error } = await supabase
    .from('medicamentos')
    .select('*, profiles(display_name)')
    .eq('activo', true)
    .not('hora_inicio', 'is', null)
    .not('frecuencia_horas', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!activeMeds || activeMeds.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // Group by household
  const byHousehold: Record<string, typeof activeMeds> = {}
  for (const med of activeMeds) {
    // Check if treatment is still active (within date range)
    if (med.fecha_fin && today > med.fecha_fin) {
      // Auto-deactivate expired medications
      await supabase
        .from('medicamentos')
        .update({ activo: false, proxima_toma: null })
        .eq('id', med.id)
      continue
    }
    if (med.fecha_inicio && today < med.fecha_inicio) continue

    if (!byHousehold[med.household_id]) byHousehold[med.household_id] = []
    byHousehold[med.household_id].push(med)
  }

  let sent = 0

  for (const [householdId, meds] of Object.entries(byHousehold)) {
    const { data: household } = await supabase
      .from('households')
      .select('discord_webhook_url')
      .eq('id', householdId)
      .single()

    if (!household?.discord_webhook_url) continue

    // Build schedule for each medication
    const lines: string[] = []
    for (const med of meds) {
      const memberName = (med.profiles as any)?.display_name ?? 'Miembro'
      const horaInicio = (med.hora_inicio as string).slice(0, 5)
      const frecHoras = med.frecuencia_horas as number

      // Calculate all doses for today
      const doses: string[] = []
      const [h, m] = horaInicio.split(':').map(Number)
      let hour = h
      let minute = m
      while (hour < 24) {
        doses.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
        hour += frecHoras
      }

      const dosisText = med.dosis ? ` (${med.dosis})` : ''
      lines.push(`**${med.nombre}**${dosisText} — ${memberName}\n  Horario: ${doses.join(', ')}`)
    }

    if (lines.length > 0) {
      const embed = {
        title: 'Medicamentos del dia',
        description: lines.join('\n\n'),
        color: 0xef4444,
        footer: { text: 'Kelsie - Recordatorio diario de medicamentos' },
        timestamp: new Date().toISOString(),
      }

      try {
        await fetch(household.discord_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ embeds: [embed] }),
        })
        sent++
      } catch { /* best-effort */ }
    }
  }

  return NextResponse.json({ sent })
}
