import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const now = new Date().toISOString()

  // Get all active medications where proxima_toma <= now
  const { data: dueMeds, error } = await supabase
    .from('medicamentos')
    .select('*, profiles(display_name)')
    .eq('activo', true)
    .not('proxima_toma', 'is', null)
    .lte('proxima_toma', now)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!dueMeds || dueMeds.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0

  for (const med of dueMeds) {
    // Get household webhook URL
    const { data: household } = await supabase
      .from('households')
      .select('discord_webhook_url')
      .eq('id', med.household_id)
      .single()

    if (household?.discord_webhook_url) {
      const memberName = (med.profiles as any)?.display_name ?? 'Miembro'

      const embed = {
        title: `Hora de tomar: ${med.nombre}`,
        description: med.dosis ? `Dosis: ${med.dosis}` : undefined,
        color: 0xef4444,
        fields: [
          { name: 'Para', value: memberName, inline: true },
          ...(med.frecuencia_horas ? [{ name: 'Frecuencia', value: `Cada ${med.frecuencia_horas}h`, inline: true }] : []),
          ...(med.notas ? [{ name: 'Notas', value: med.notas, inline: false }] : []),
        ],
        footer: { text: 'Kelsie - Recordatorio de medicamento' },
        timestamp: new Date().toISOString(),
      }

      try {
        await fetch(household.discord_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ embeds: [embed] }),
        })
        sent++
      } catch {
        // best-effort
      }
    }

    // Calculate next dose
    const frecHoras = med.frecuencia_horas as number
    const nextDose = new Date(med.proxima_toma as string)
    nextDose.setTime(nextDose.getTime() + frecHoras * 3600000)

    // Check if treatment has ended
    let shouldDeactivate = false
    if (med.fecha_fin) {
      const endDate = new Date(med.fecha_fin)
      endDate.setHours(23, 59, 59, 999)
      if (nextDose > endDate) shouldDeactivate = true
    }

    if (shouldDeactivate) {
      await supabase
        .from('medicamentos')
        .update({ activo: false, proxima_toma: null })
        .eq('id', med.id)
    } else {
      await supabase
        .from('medicamentos')
        .update({ proxima_toma: nextDose.toISOString() })
        .eq('id', med.id)
    }
  }

  return NextResponse.json({ sent, total: dueMeds.length })
}
