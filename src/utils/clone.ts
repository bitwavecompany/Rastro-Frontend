/**
 * Convierte cualquier objeto reactivo de Vue (Proxy, ref, reactive)
 * y sus estructuras anidadas (arreglos, sub-objetos) en un objeto plano
 * de JavaScript 100% serializable por el Structured Clone Algorithm de IndexedDB.
 */
export function toPlainObject<T>(obj: T): T {
  if (obj === undefined || obj === null) return obj
  return JSON.parse(JSON.stringify(obj))
}
