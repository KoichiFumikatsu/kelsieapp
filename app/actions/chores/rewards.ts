'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult, ChoreScoreboard, RewardLog } from '@/lib/types/modules.types'

async function getHouseholdCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()
  return { supabase, userId: user.id, householdId: profile?.household_id as string | null }
}

export async function getScoreboard(): Promise<ActionResult<ChoreScoreboard[]>> {
  const ctx = await getHouseholdCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  // Get household members
  const { data: members } = await ctx.supabase
    .from('profiles')
    .select('id, display_name, color_hex')
    .eq('household_id', ctx.householdId)

  if (!members) return { ok: true, data: [] }

  // Get reward totals per user
  const { data: rewards } = await ctx.supabase
    .from('reward_log')
    .select('user_id, puntos')
    .eq('household_id', ctx.householdId)

  // Get completed chores count per user
  const { data: completed } = await ctx.supabase
    .from('chore_instances')
    .select('completed_by')
    .eq('household_id', ctx.householdId)
    .eq('status', 'done')

  const rewardsByUser = new Map<string, number>()
  const completedByUser = new Map<string, number>()

  for (const r of rewards ?? []) {
    rewardsByUser.set(r.user_id, (rewardsByUser.get(r.user_id) ?? 0) + r.puntos)
  }
  for (const c of completed ?? []) {
    if (c.completed_by) {
      completedByUser.set(c.completed_by, (completedByUser.get(c.completed_by) ?? 0) + 1)
    }
  }

  const scoreboard: ChoreScoreboard[] = members.map((m) => ({
    userId: m.id,
    displayName: m.display_name,
    colorHex: m.color_hex,
    totalPuntos: rewardsByUser.get(m.id) ?? 0,
    completedCount: completedByUser.get(m.id) ?? 0,
  }))

  // Sort by total points descending
  scoreboard.sort((a, b) => b.totalPuntos - a.totalPuntos)

  return { ok: true, data: scoreboard }
}

export async function getRewardHistory(limit = 20): Promise<ActionResult<RewardLog[]>> {
  const ctx = await getHouseholdCtx()
  if (!ctx?.householdId) return { ok: false, error: 'Sin hogar asignado' }

  const { data, error } = await ctx.supabase
    .from('reward_log')
    .select('*')
    .eq('household_id', ctx.householdId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data as RewardLog[] }
}
