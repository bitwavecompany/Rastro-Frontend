/**
 * Converts any Vue reactive object (Proxy, ref, reactive)
 * and its nested structures into a plain JavaScript object
 * fully serializable by IndexedDB's Structured Clone Algorithm.
 */
export function toPlainObject<T>(obj: T): T {
  if (obj === undefined || obj === null) return obj
  return JSON.parse(JSON.stringify(obj))
}
