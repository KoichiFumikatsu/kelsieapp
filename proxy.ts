import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Proteger todas las rutas excepto archivos estáticos, assets, robots.txt y cron API
    '/((?!_next/static|_next/image|favicon.ico|robots\\.txt|api/cron/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
