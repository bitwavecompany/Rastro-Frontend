import { db } from '@/database/db'
import { syncApi } from '@/api/sync'
import { ApiPayloadAdapter } from './adapters/ApiPayloadAdapter'
import { tokenStorage } from '@/services/tokenStorage'

export class SyncEngine {
  private isSyncing = false
  private isFrozen = false

  freeze() {
    this.isFrozen = true
  }

  resume() {
    this.isFrozen = false
    this.sync()
  }

  get frozen() {
    return this.isFrozen
  }

  async sync() {
    if (this.isFrozen || this.isSyncing) return

    // PRD 7.4: Only registered users sync with the cloud.
    // Guest data is never transmitted.
    if (!tokenStorage.hasAccessToken()) return

    this.isSyncing = true

    try {
      const outboxEntries = await db.outbox.orderBy('createdAt').toArray()
      if (outboxEntries.length === 0) return

      const batchPayload = ApiPayloadAdapter.toBatchPayload(outboxEntries)

      try {
        const response = await syncApi.pushBatch(batchPayload)
        // API Contract: envelope { success, message, data: { results: [...] }, meta }
        const results = response.data?.data?.results || response.data?.results || []

        for (const result of results) {
          const entry = outboxEntries.find(e => e.opId === result.opId)
          if (!entry) continue

          if (result.status === 'success') {
            await db.outbox.delete(entry.seq!)
            if (!['delete', 'hard-delete', 'purge-account'].includes(entry.op)) {
              if (entry.entity === 'accounts') {
                await db.accounts.update(entry.entityId, { sync_status: 'synced' })
              } else if (entry.entity === 'transactions') {
                await db.transactions.update(entry.entityId, { sync_status: 'synced' })
              }
            }
          } else if (result.status === 'error') {
            // Handle Dead Letter Queue for permanent validation/entitlement errors
            const code = result.code ?? 0
            if ([403, 404, 422].includes(code)) {
              await db.outbox.delete(entry.seq!)
              await db.dlq.add({
                ...entry,
                errorCode: code,
                errorMessage: result.message || 'Unknown error',
                failedAt: new Date().toISOString(),
              })

              import('@/stores/useToastStore').then(({ useToastStore }) => {
                const toast = useToastStore()
                toast.error(`Sincronización rechazada: ${result.message || 'Límite alcanzado o error de datos'}`)
              })

              if (entry.op === 'create') {
                if (entry.entity === 'accounts') {
                  await db.accounts.update(entry.entityId, { sync_status: 'pending_create' })
                } else if (entry.entity === 'transactions') {
                  await db.transactions.update(entry.entityId, { sync_status: 'pending_create' })
                }
              }
            }
          }
        }
      } catch (error: unknown) {
        console.error('[SyncEngine] Network/Server Error during Batch Sync', error)
        // Network/500 errors remain in outbox for retry in the next sync cycle.
      }
    } finally {
      this.isSyncing = false
    }
  }

  startAutoSync(intervalMs = 10000) {
    setInterval(() => this.sync(), intervalMs)
  }
}

export const syncEngine = new SyncEngine()
