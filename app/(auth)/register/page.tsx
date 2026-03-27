'use client'

import { register } from '@/app/actions/core/auth'
import Link from 'next/link'
import { useActionState } from 'react'

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const result = await register(formData)
      if (!result.ok) return result.error
      return null
    },
    null
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Crear cuenta</h1>
          <p className="mt-2 text-secondary">Configura tu Household OS</p>
        </div>

        <form action={formAction} className="space-y-4">
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
              className="mt-1 block w-full rounded-lg border border-muted/30 bg-surface px-3 py-2 text-primary placeholder:text-muted focus:border-income focus:outline-none focus:ring-1 focus:ring-income"
              placeholder="Kelsie"
            />
          </div>

          <div>
            <label htmlFor="household_name" className="block text-sm font-medium text-primary">
              Nombre del hogar
            </label>
            <input
              id="household_name"
              name="household_name"
              type="text"
              required
              className="mt-1 block w-full rounded-lg border border-muted/30 bg-surface px-3 py-2 text-primary placeholder:text-muted focus:border-income focus:outline-none focus:ring-1 focus:ring-income"
              placeholder="Casa Kelsie"
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
              className="mt-1 block w-full rounded-lg border border-muted/30 bg-surface px-3 py-2 text-primary placeholder:text-muted focus:border-income focus:outline-none focus:ring-1 focus:ring-income"
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
              className="mt-1 block w-full rounded-lg border border-muted/30 bg-surface px-3 py-2 text-primary placeholder:text-muted focus:border-income focus:outline-none focus:ring-1 focus:ring-income"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-income px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-income/90 disabled:opacity-50"
          >
            {pending ? 'Creando...' : 'Crear cuenta y hogar'}
          </button>
        </form>

        <p className="text-center text-sm text-secondary">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-medium text-income hover:underline">
            Inicia sesión
          </Link>
        </p>
        <p className="text-center text-sm text-secondary">
          ¿Tienes un código de invitación?{' '}
          <Link href="/join/codigo" className="font-medium text-mod-chores hover:underline">
            Únete a un hogar
          </Link>
        </p>
      </div>
    </div>
  )
}
