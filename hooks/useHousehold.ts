'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  display_name: string
  avatar_emoji: string
  color_hex: string
  role: string
  household_id: string
}

interface Household {
  id: string
  name: string
  invite_code: string
  discord_webhook_url: string | null
}

export function useHousehold() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Obtener profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData?.household_id) { setLoading(false); return }
      setProfile(profileData as Profile)

      // Obtener household
      const { data: householdData } = await supabase
        .from('households')
        .select('*')
        .eq('id', profileData.household_id)
        .single()

      if (householdData) setHousehold(householdData as Household)

      // Obtener miembros
      const { data: membersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('household_id', profileData.household_id)

      if (membersData) setMembers(membersData as Profile[])

      setLoading(false)
    }

    load()
  }, [])

  return { profile, household, members, loading }
}
