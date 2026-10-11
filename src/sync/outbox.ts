import { db } from '@/database/db'
import { uuidv7 } from 'uuidv7'
import type { OutboxEntry, OutboxOperation } from './types'

import { syncEngine } from './SyncEngine'

import { toPlainObject } from '@/utils/clone'

export async function enqueueOutbox(
  entity: OutboxEntry['entity'],
  entityId: string | number,
  op: OutboxOperation,
  payload?: any
) {
  // PRD 7.4: Solo usuarios registrados sincronizan con el servidor.
  // Los datos del invitado nunca se envían al servidor ni se encolan en el outbox.
  const token = localStorage.getItem('auth_token')
  if (!token) {
    return
  }

  const entry: OutboxEntry = {
    opId: uuidv7(),
    entity,
    entityId,
    op,
    payload: payload !== undefined ? toPlainObject(payload) : undefined,
    createdAt: new Date().toISOString()
  }
  
  await db.outbox.add(entry)
  
  if (navigator.onLine) {
    syncEngine.sync()
  }
}
