import type { Transaction } from '@/types/transaction'
import type { Account } from '@/types/account'

/**
 * Orden canónico para transacciones (espejo exacto del Backend):
 * 1. date DESC (fecha del movimiento YYYY-MM-DD más reciente primero)
 * 2. created_at DESC (a igualdad de fecha, el último registrado entra primero)
 * 3. id DESC (desempate determinista por UUIDv7)
 */
export function compareTransactionsDesc(a: Transaction, b: Transaction): number {
  const dateA = a.date ? a.date.split('T')[0] : (a.created_at ? a.created_at.split('T')[0] : '')
  const dateB = b.date ? b.date.split('T')[0] : (b.created_at ? b.created_at.split('T')[0] : '')
  if (dateA !== dateB) {
    return dateB.localeCompare(dateA)
  }

  const timeA = new Date(a.created_at || 0).getTime()
  const timeB = new Date(b.created_at || 0).getTime()
  if (timeB !== timeA) {
    return timeB - timeA
  }

  return String(b.id).localeCompare(String(a.id))
}

/**
 * Orden canónico para cuentas (espejo exacto del Backend):
 * 1. created_at DESC (la última cuenta creada aparece primero)
 * 2. id DESC (desempate determinista por UUIDv7)
 */
export function compareAccountsDesc(a: Account, b: Account): number {
  const timeA = new Date(a.created_at || 0).getTime()
  const timeB = new Date(b.created_at || 0).getTime()
  if (timeB !== timeA) {
    return timeB - timeA
  }

  return String(b.id).localeCompare(String(a.id))
}

/**
 * Orden canónico genérico por created_at DESC e id DESC (para usuarios, solicitudes de admin, etc.)
 */
export function compareCreatedAtDesc<T extends { created_at?: string | null; id?: string | number }>(a: T, b: T): number {
  const timeA = new Date(a.created_at || 0).getTime()
  const timeB = new Date(b.created_at || 0).getTime()
  if (timeB !== timeA) {
    return timeB - timeA
  }

  return String(b.id ?? '').localeCompare(String(a.id ?? ''))
}
