import { NextResponse } from 'next/server'
import { getOAuthUrl, isGCalConfigured } from '@/lib/gcal'

export async function GET() {
  if (!isGCalConfigured()) {
    return NextResponse.redirect(new URL('/tasks?gcal_error=not_configured', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
  }
  return NextResponse.redirect(getOAuthUrl())
}
