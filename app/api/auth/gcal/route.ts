import { NextResponse } from 'next/server'
import { getOAuthUrl, isGCalConfigured } from '@/lib/gcal'

export async function GET(req: Request) {
  const origin = new URL(req.url).origin
  if (!isGCalConfigured()) {
    return NextResponse.redirect(`${origin}/tasks?gcal_error=not_configured`)
  }
  return NextResponse.redirect(getOAuthUrl())
}
