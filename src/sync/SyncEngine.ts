import { db } from '@/database/db'
import { syncApi } from '@/api/sync'
import { ApiPayloadAdapter } from './adapters/ApiPayloadAdapter'

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
    
    // PRD 7.4: Solo usuarios registrados sincronizan con la nube.
    // Los datos del Invitado nunca se envían al servidor.
    const token = localStorage.getItem('auth_token')
    if (!token) return

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
                await db.accounts.update(entry.entityId, { syncStatus: 'synced' })
              } else if (entry.entity === 'transactions') {
                await db.transactions.update(entry.entityId, { syncStatus: 'synced' })
              }
            }
          } else if (result.status === 'error') {
            // Manejo de Dead Letter Queue para errores permanentes de validación o permisos
            if ([403, 404, 422].includes(result.code)) {
              await db.outbox.delete(entry.seq!)
              await db.dlq.add({
                ...entry,
                errorCode: result.code,
                errorMessage: result.message || 'Error desconocido',
                failedAt: new Date().toISOString()
              })

              import('@/stores/useToastStore').then(({ useToastStore }) => {
                const toast = useToastStore()
                toast.error(`Sincronización rechazada: ${result.message || 'Límite alcanzado o error de datos'}`)
              })

              if (entry.op === 'create') {
                if (entry.entity === 'accounts') await db.accounts.update(entry.entityId, { syncStatus: 'pending_create' })
                else if (entry.entity === 'transactions') await db.transactions.update(entry.entityId, { syncStatus: 'pending_create' })
              }
            }
          }
        }
      } catch (error: any) {
        console.error('[SyncEngine] Network/Server Error during Batch Sync', error)
        // Errores de red 500 no borran el outbox, se reintenta en el próximo ciclo.
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
