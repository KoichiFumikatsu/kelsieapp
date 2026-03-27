'use client'

import { login } from '@/app/actions/core/auth'
import Link from 'next/link'
import { useActionState } from 'react'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const result = await login(formData)
      // Si redirigió, no llega aquí. Solo se llega si hay error.
      if (!result.ok) return result.error
      return null
    },
    null
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Household OS</h1>
          <p className="mt-2 text-secondary">Inicia sesión para continuar</p>
        </div>

        <form action={formAction} className="space-y-4">
          {state && (
            <div className="rounded-lg bg-expense/10 p-3 text-sm text-expense">
              {state}
            </div>
          )}

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
              autoComplete="current-password"
              className="mt-1 block w-full rounded-lg border border-muted/30 bg-surface px-3 py-2 text-primary placeholder:text-muted focus:border-income focus:outline-none focus:ring-1 focus:ring-income"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-income px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-income/90 disabled:opacity-50"
          >
            {pending ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-sm text-secondary">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="font-medium text-income hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
