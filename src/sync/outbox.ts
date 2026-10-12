import { db } from '@/database/db'
import { uuidv7 } from 'uuidv7'
import type { OutboxEntry, OutboxOperation } from './types'
import { syncEngine } from './SyncEngine'
import { toPlainObject } from '@/utils/clone'
import { tokenStorage } from '@/services/tokenStorage'

export async function enqueueOutbox(
  entity: OutboxEntry['entity'],
  entityId: string,
  op: OutboxOperation,
  payload?: Record<string, unknown>
) {
  // PRD 7.4: Only registered users synchronize with the cloud.
  // Guest data is strictly local and never enqueued to the outbox.
  if (!tokenStorage.hasAccessToken()) {
    return
  }

  const entry: OutboxEntry = {
    opId: uuidv7(),
    entity,
    entityId,
    op,
    payload: payload !== undefined ? toPlainObject(payload) : undefined,
    createdAt: new Date().toISOString(),
  }

  await db.outbox.add(entry)

  if (navigator.onLine) {
    syncEngine.sync()
  }
}
