import { createClient } from '@/lib/supabase/server'

const GCAL_API = 'https://www.googleapis.com/calendar/v3'
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

export interface GCalEvent {
  id: string
  title: string
  date: string
  time?: string
  allDay: boolean
}

export function isGCalConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI)
}

export function getOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: SCOPE,
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

export async function fetchCalendarEvents(userId: string, year: number, month: number): Promise<GCalEvent[]> {
  const token = await getAccessToken(userId)
  if (!token) return []

  const calListRes = await fetch(`${GCAL_API}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!calListRes.ok) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calListData = await calListRes.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calendars: { id: string }[] = (calListData.items ?? []).filter((c: any) => c.selected !== false)

  const timeMin = new Date(year, month, 1).toISOString()
  const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })

  const perCal = await Promise.all(
    calendars.map(async (cal) => {
      const res = await fetch(`${GCAL_API}/calendars/${encodeURIComponent(cal.id)}/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return []
      const d = await res.json()
      return d.items ?? []
    })
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = perCal.flat()
  const seen = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unique = all.filter((item: any) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return unique.map((item: any): GCalEvent => {
    const allDay = !item.start?.dateTime
    const date = allDay ? item.start.date : item.start.dateTime.split('T')[0]
    const time = allDay ? undefined : item.start.dateTime.split('T')[1].slice(0, 5)
    return { id: item.id, title: item.summary ?? '(Sin titulo)', date, time, allDay }
  })
}
