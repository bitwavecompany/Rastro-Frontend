import { ref } from 'vue'
import { db } from '@/database/db'
import { syncApi } from '@/api/sync'
import { ApiPayloadAdapter } from './adapters/ApiPayloadAdapter'
import { tokenStorage } from '@/services/tokenStorage'
import type { Account } from '@/types/account'
import type { Transaction } from '@/types/transaction'
import type { SyncPullAccountItem, SyncPullTransactionItem } from './types'

export class SyncEngine {
  public isSyncing = ref(false)
  private isFrozen = ref(false)
  public lastSyncTime = ref<string | null>(tokenStorage.getLastSyncTime())
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null

  freeze() {
    this.isFrozen.value = true
  }

  resume() {
    this.isFrozen.value = false
    this.sync()
  }

  get frozen() {
    return this.isFrozen.value
  }

  /**
   * PUSH: Process pending operations from local outbox table to the server.
   */
  async push(): Promise<void> {
    try {
      const outboxEntries = await db.outbox.orderBy('createdAt').toArray()
      if (outboxEntries.length === 0) return

      const batchPayload = ApiPayloadAdapter.toBatchPayload(outboxEntries)

      try {
        const response = await syncApi.pushBatch(batchPayload)
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
        console.error('[SyncEngine] Network/Server Error during Batch Push', error)
      }
    } catch (err: unknown) {
      console.error('[SyncEngine] Error reading outbox during Push', err)
    }
  }

  /**
   * PULL: Hydrate changes from server to local database (Dexie).
   */
  async pull(): Promise<void> {
    try {
      const since = tokenStorage.getLastSyncTime()
      const response = await syncApi.pull(since)
      const pullData = response.data?.data

      if (!pullData) return

      const { server_time, accounts, transactions } = pullData

      // Identify local entries currently pending in outbox to prevent overwriting unpushed edits
      const outboxEntries = await db.outbox.toArray()
      const pendingAccountIds = new Set(
        outboxEntries.filter(e => e.entity === 'accounts').map(e => e.entityId)
      )
      const pendingTransactionIds = new Set(
        outboxEntries.filter(e => e.entity === 'transactions').map(e => e.entityId)
      )

      let accountsChanged = false
      let transactionsChanged = false

      // Hydrate Accounts
      if (Array.isArray(accounts) && accounts.length > 0) {
        for (const rawAcc of accounts as SyncPullAccountItem[]) {
          const accId = String(rawAcc.id)
          if (pendingAccountIds.has(accId)) continue

          const canonicalAccount: Account = {
            id: accId,
            user_id: rawAcc.user_id ? String(rawAcc.user_id) : undefined,
            name: rawAcc.name,
            type: rawAcc.type,
            initial_balance: Number(rawAcc.initial_balance ?? rawAcc.amount ?? 0),
            description: rawAcc.description ?? null,
            currency: rawAcc.currency || 'USD',
            is_default: Boolean(rawAcc.is_default),
            deactivation_reason: rawAcc.deactivation_reason ?? null,
            deleted_at: rawAcc.deleted_at ?? null,
            created_at: rawAcc.created_at,
            updated_at: rawAcc.updated_at,
            sync_status: 'synced',
          }

          await db.accounts.put(canonicalAccount)
          accountsChanged = true
        }
      }

      // Hydrate Transactions
      if (Array.isArray(transactions) && transactions.length > 0) {
        for (const rawTrx of transactions as SyncPullTransactionItem[]) {
          const trxId = String(rawTrx.id)
          if (pendingTransactionIds.has(trxId)) continue

          let category = rawTrx.category ?? null
          if (rawTrx.type === 'expense' && (!category || !category.trim())) {
            category = 'otros'
          }

          const rawDate = rawTrx.date || rawTrx.created_at || new Date().toISOString()
          const normalizedDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate

          const canonicalTransaction: Transaction = {
            id: trxId,
            account_id: String(rawTrx.account_id),
            user_id: rawTrx.user_id ? String(rawTrx.user_id) : undefined,
            type: rawTrx.type,
            amount: Number(rawTrx.amount),
            reason: rawTrx.reason,
            description: rawTrx.description ?? null,
            payment_method: rawTrx.payment_method,
            date: normalizedDate,
            category,
            tags: Array.isArray(rawTrx.tags) ? rawTrx.tags : [],
            transfer_id: rawTrx.transfer_id ?? null,
            deletion_reason: rawTrx.deletion_reason ?? null,
            deleted_at: rawTrx.deleted_at ?? null,
            created_at: rawTrx.created_at,
            updated_at: rawTrx.updated_at,
            sync_status: 'synced',
          }

          await db.transactions.put(canonicalTransaction)
          transactionsChanged = true
        }
      }

      // Save server_time checkpoint for subsequent incremental pulls
      if (server_time) {
        tokenStorage.setLastSyncTime(server_time)
        this.lastSyncTime.value = server_time
      }

      // Reactively refresh Pinia stores if local data was updated
      if (accountsChanged || transactionsChanged) {
        const { useAccountsStore } = await import('@/stores/useAccountsStore')
        const { useTransactionsStore } = await import('@/stores/useTransactionsStore')
        const accountsStore = useAccountsStore()
        const transactionsStore = useTransactionsStore()
        await Promise.all([
          accountsStore.load(),
          transactionsStore.load(),
        ])
      }
    } catch (error: unknown) {
      console.error('[SyncEngine] Network/Server Error during Sync Pull', error)
    }
  }

  /**
   * Full bidirectional synchronization cycle: Push local pending outbox then Pull server updates.
   */
  async sync(): Promise<void> {
    if (this.isFrozen.value || this.isSyncing.value) return
    if (!tokenStorage.hasAccessToken()) return

    this.isSyncing.value = true
    try {
      await this.push()
      await this.pull()
    } finally {
      this.isSyncing.value = false
    }
  }

  resetSyncCheckpoint() {
    tokenStorage.clearLastSyncTime()
    this.lastSyncTime.value = null
  }

  startAutoSync(intervalMs = 25000) {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer)
    }
    this.autoSyncTimer = setInterval(() => this.sync(), intervalMs)
  }

  stopAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer)
      this.autoSyncTimer = null
    }
  }
}

export const syncEngine = new SyncEngine()
