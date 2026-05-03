import { NextResponse } from 'next/server'
import { exchangeCode } from '@/lib/gcal'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const url = new URL(req.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${base}/tasks?gcal_error=no_code`)
  }

  const tokens = await exchangeCode(code)
  if (!tokens?.access_token) {
    return NextResponse.redirect(`${base}/tasks?gcal_error=exchange_failed`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${base}/tasks?gcal_error=not_authenticated`)

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  await supabase
    .from('google_calendar_tokens')
    .upsert({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  return NextResponse.redirect(`${base}/tasks?gcal_connected=1`)
}
