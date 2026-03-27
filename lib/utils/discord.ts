import { createClient } from '@/lib/supabase/server'

interface DiscordEmbed {
  title: string
  description?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
  footer?: { text: string }
  timestamp?: string
}

const MODULE_COLORS: Record<string, number> = {
  finance: 0x10b981,
  chores:  0xf59e0b,
  tasks:   0x6366f1,
  medical: 0xef4444,
  studies: 0x8b5cf6,
}

export async function sendDiscordNotification(
  householdId: string,
  module: string,
  embed: DiscordEmbed,
) {
  const supabase = await createClient()
  const { data: household } = await supabase
    .from('households')
    .select('discord_webhook_url')
    .eq('id', householdId)
    .single()

  if (!household?.discord_webhook_url) return

  const payload = {
    embeds: [{
      ...embed,
      color: embed.color ?? MODULE_COLORS[module] ?? 0x141413,
      timestamp: embed.timestamp ?? new Date().toISOString(),
    }],
  }

  try {
    await fetch(household.discord_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // Silently fail — Discord notifications are best-effort
  }
}
