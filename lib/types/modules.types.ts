// Tipos de dominio por módulo — se implementarán en Fase 1-7

// Patrón de retorno para Server Actions
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string }
