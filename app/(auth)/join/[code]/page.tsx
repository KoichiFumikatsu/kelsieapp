'use client'

import { joinHousehold } from '@/app/actions/core/auth'
import Link from 'next/link'
import { useActionState } from 'react'
import { useParams } from 'next/navigation'

export default function JoinPage() {
  const params = useParams<{ code: string }>()
  const inviteCode = params.code

  const [state, formAction, pending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const result = await joinHousehold(formData)
      if (!result.ok) return result.error
      return null
    },
    null
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Unirse a un hogar</h1>
          <p className="mt-2 text-secondary">
            Código de invitación: <span className="font-mono font-semibold text-mod-chores">{inviteCode}</span>
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="invite_code" value={inviteCode} />

          {state && (
            <div className="rounded-lg bg-expense/10 p-3 text-sm text-expense">
              {state}
            </div>
          )}

          <div>
            <label htmlFor="display_name" className="block text-sm font-medium text-primary">
              Tu nombre
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              required
              className="mt-1 block w-full rounded-lg border border-muted/30 bg-surface px-3 py-2 text-primary placeholder:text-muted focus:border-mod-chores focus:outline-none focus:ring-1 focus:ring-mod-chores"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-primary">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-lg border border-muted/30 bg-surface px-3 py-2 text-primary placeholder:text-muted focus:border-mod-chores focus:outline-none focus:ring-1 focus:ring-mod-chores"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-primary">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-lg border border-muted/30 bg-surface px-3 py-2 text-primary placeholder:text-muted focus:border-mod-chores focus:outline-none focus:ring-1 focus:ring-mod-chores"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-mod-chores px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-mod-chores/90 disabled:opacity-50"
          >
            {pending ? 'Uniéndose...' : 'Unirse al hogar'}
          </button>
        </form>

        <p className="text-center text-sm text-secondary">
          ¿Quieres crear tu propio hogar?{' '}
          <Link href="/register" className="font-medium text-income hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
