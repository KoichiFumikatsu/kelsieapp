'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type PostgresChange = RealtimePostgresChangesPayload<Record<string, unknown>>

// Hook genérico para suscribirse a cambios en una tabla
export function useRealtime(
  table: string,
  householdId: string | undefined,
  onchange: (payload: PostgresChange) => void
) {
  useEffect(() => {
    if (!householdId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`${table}-${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `household_id=eq.${householdId}`,
        },
        onchange
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, householdId, onchange])
}
