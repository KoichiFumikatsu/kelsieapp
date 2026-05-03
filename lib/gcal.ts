import { createClient } from '@/lib/supabase/server'

const GCAL_API = 'https://www.googleapis.com/calendar/v3'
const SCOPES = 'https://www.googleapis.com/auth/calendar.events'

export function isGCalConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI)
}

export function getOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCode(code: string): Promise<{ access_token: string; refresh_token?: string; expires_in: number } | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) return null
  return res.json()
}

async function refreshToken(refresh: string): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refresh,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function getAccessToken(userId: string): Promise<string | null> {
  if (!isGCalConfigured()) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (!data) return null

  const expiresAt = data.expires_at ? new Date(data.expires_at) : null
  if (expiresAt && expiresAt > new Date()) return data.access_token

  if (!data.refresh_token) return null
  const refreshed = await refreshToken(data.refresh_token)
  if (!refreshed?.access_token) return null

  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  await supabase
    .from('google_calendar_tokens')
    .update({ access_token: refreshed.access_token, expires_at: newExpiry, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  return refreshed.access_token
}

type TaskLike = { titulo: string; descripcion?: string | null; due_date?: string | null; due_time?: string | null }

function toGCalEvent(task: TaskLike) {
  const summary = task.titulo
  const description = task.descripcion ?? undefined
  if (!task.due_date) {
    const today = new Date().toISOString().split('T')[0]
    return { summary, description, start: { date: today }, end: { date: today } }
  }
  if (task.due_time) {
    const d = task.due_date
    const t = task.due_time.slice(0, 5)
    const [h, m] = t.split(':').map(Number)
    const endH = String(h + 1).padStart(2, '0')
    const start = `${d}T${t}:00`
    const end = `${d}T${endH}:${String(m).padStart(2, '0')}:00`
    return { summary, description, start: { dateTime: start, timeZone: 'America/Bogota' }, end: { dateTime: end, timeZone: 'America/Bogota' } }
  }
  return { summary, description, start: { date: task.due_date }, end: { date: task.due_date } }
}

export async function createGCalEvent(userId: string, task: TaskLike): Promise<string | null> {
  const token = await getAccessToken(userId)
  if (!token) return null
  const res = await fetch(`${GCAL_API}/calendars/primary/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toGCalEvent(task)),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.id ?? null
}

export async function updateGCalEvent(userId: string, eventId: string, task: TaskLike): Promise<void> {
  const token = await getAccessToken(userId)
  if (!token) return
  await fetch(`${GCAL_API}/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toGCalEvent(task)),
  })
}

export async function deleteGCalEvent(userId: string, eventId: string): Promise<void> {
  const token = await getAccessToken(userId)
  if (!token) return
  await fetch(`${GCAL_API}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
