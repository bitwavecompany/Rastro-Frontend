import { db } from '@/database/db'
import { toPlainObject } from '@/utils/clone'
import { syncEngine } from '@/sync/SyncEngine'
import { useSessionStore } from '@/stores/useSessionStore'
import { useProfileStore } from '@/stores/useProfileStore'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import type { Account } from '@/types/account'
import type { Transaction } from '@/types/transaction'
import type { RegisterSyncAccountItem, RegisterSyncTransactionItem } from '@/api/auth'

export interface CloudAccountRaw {
  id: string | number
  user_id?: string | number | null
  name: string
  type: Account['type']
  initial_balance?: number
  description?: string | null
  currency?: string
  is_default?: boolean | number
  deactivation_reason?: string | null
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export interface CloudTransactionRaw {
  id: string | number
  user_id?: string | number | null
  account_id?: string | number
  type?: Transaction['type']
  amount: number | string
  reason: string
  description?: string | null
  payment_method?: Transaction['payment_method']
  date?: string
  created_at?: string
  updated_at?: string
  category?: string | null
  tags?: string[]
  transfer_id?: string | null
  deletion_reason?: string | null
  deleted_at?: string | null
}

export interface AuthUser {
  id: string | number
  name?: string
  email: string
  plan?: 'guest' | 'free' | 'premium'
  role?: 'client' | 'admin'
  payment_method?: 'cash' | 'transfer' | null
  payment_bank?: string | null
  payment_receipt?: string | null
}

export type CleanGuestAccountPayload = RegisterSyncAccountItem
export type CleanGuestTransactionPayload = RegisterSyncTransactionItem

export interface LoginMergeParams {
  token: string
  refreshToken?: string
  user: AuthUser
  cloudAccounts: CloudAccountRaw[]
  cloudTransactions: CloudTransactionRaw[]
}

export interface DiscardLocalDataParams {
  token: string
  refreshToken?: string
  user: AuthUser
  accountsData: CloudAccountRaw[]
  transactionsData: CloudTransactionRaw[]
}

export interface RegistrationSyncParams {
  token: string
  refreshToken?: string
  user: AuthUser
  syncedAccounts: CloudAccountRaw[]
  syncedTransactions: CloudTransactionRaw[]
}

export interface CollisionCheckParams {
  user: AuthUser
  cloudAccounts: CloudAccountRaw[]
}

export interface CollisionCheckResult {
  hasCollision: boolean
  totalActiveAccounts: number
  planLimit: number
}

function mapCloudAccountToCanonical(a: CloudAccountRaw): Account {
  return {
    id: String(a.id),
    user_id: a.user_id ? String(a.user_id) : undefined,
    name: a.name,
    type: a.type,
    initial_balance: Number(a.initial_balance ?? 0),
    description: a.description ?? null,
    currency: a.currency || 'USD',
    is_default: Boolean(a.is_default),
    deactivation_reason: (a.deactivation_reason as Account['deactivation_reason']) ?? null,
    deleted_at: a.deleted_at ?? null,
    created_at: a.created_at,
    updated_at: a.updated_at,
    sync_status: 'synced',
  }
}

function mapCloudTransactionToCanonical(t: CloudTransactionRaw): Transaction {
  return {
    id: String(t.id),
    user_id: t.user_id ? String(t.user_id) : undefined,
    account_id: String(t.account_id),
    type: t.type as Transaction['type'],
    amount: Number(t.amount),
    reason: t.reason,
    description: t.description ?? null,
    payment_method: t.payment_method as Transaction['payment_method'],
    date: t.date as string,
    category: t.category ?? null,
    tags: Array.isArray(t.tags) ? t.tags : [],
    transfer_id: t.transfer_id ?? null,
    deletion_reason: t.deletion_reason ?? null,
    deleted_at: t.deleted_at ?? null,
    created_at: t.created_at as string,
    updated_at: t.updated_at as string,
    sync_status: 'synced',
  }
}

export const authMergeService = {
  /**
   * Evaluates if total active accounts (cloud + non-default guest accounts) exceeds the plan limit (PRD 9.1).
   */
  async checkLoginCollision(params: CollisionCheckParams): Promise<CollisionCheckResult> {
    const localAccounts = await db.accounts.filter(a => !a.deleted_at).toArray()
    const cloudActiveAccounts = params.cloudAccounts.filter(a => !a.deleted_at)

    // Default "Efectivo" account merges; only additional accounts take new slots
    const localNonDefault = localAccounts.filter(a => !a.is_default && a.name !== 'Efectivo')
    const totalActiveAccounts = cloudActiveAccounts.length + localNonDefault.length
    const planLimit = params.user.plan === 'premium' ? Infinity : 3

    return {
      hasCollision: totalActiveAccounts > planLimit,
      totalActiveAccounts,
      planLimit,
    }
  },

  /**
   * Executes offline-to-online relational merge upon login (PRD 9.1).
   */
  async completeLoginWithMerge(params: LoginMergeParams): Promise<void> {
    const sessionStore = useSessionStore()
    const profileStore = useProfileStore()
    const accountsStore = useAccountsStore()
    const transactionsStore = useTransactionsStore()

    sessionStore.setTokens(params.token, params.refreshToken)
    syncEngine.resume()

    await profileStore.setProfileLocally({
      id: String(params.user.id),
      name: params.user.name || 'Usuario',
      email: params.user.email,
      plan: params.user.plan || 'free',
      payment_method: params.user.payment_method,
      payment_bank: params.user.payment_bank,
      payment_receipt: params.user.payment_receipt,
    })

    let localAccounts = await db.accounts.filter(a => a.sync_status === 'pending_create').toArray()
    const localTransactions = await db.transactions.filter(t => t.sync_status === 'pending_create').toArray()

    // Merge default "Efectivo" cash account
    const backendDefault = params.cloudAccounts.find(
      a => (a.is_default || a.name === 'Efectivo') && a.type === 'cash'
    )
    const guestDefault = localAccounts.find(
      a => a.is_default || (a.name === 'Efectivo' && a.type === 'cash')
    )

    if (backendDefault && guestDefault) {
      // Re-map local guest transactions to point to the cloud default account ID
      localTransactions.forEach(t => {
        if (String(t.account_id) === String(guestDefault.id)) {
          t.account_id = String(backendDefault.id)
        }
      })

      // Discard redundant guest default account
      localAccounts = localAccounts.filter(a => a.id !== guestDefault.id)

      // Clean up outbox entries
      const outboxEntries = await db.outbox.toArray()
      for (const entry of outboxEntries) {
        if (entry.entity === 'accounts' && entry.entityId === guestDefault.id) {
          await db.outbox.delete(entry.seq!)
        }
        const payload = entry.payload as Record<string, unknown> | undefined
        if (entry.entity === 'transactions' && payload?.account_id === guestDefault.id) {
          payload.account_id = String(backendDefault.id)
          await db.outbox.put(entry)
        }
      }
    }

    await db.accounts.clear()
    await db.transactions.clear()

    // 1. Persist remote cloud data
    if (params.cloudAccounts.length > 0) {
      await db.accounts.bulkAdd(params.cloudAccounts.map(mapCloudAccountToCanonical))
    }
    if (params.cloudTransactions.length > 0) {
      await db.transactions.bulkAdd(params.cloudTransactions.map(mapCloudTransactionToCanonical))
    }

    // 2. Restore pending local data so SyncEngine uploads them
    if (localAccounts.length > 0) {
      for (const a of localAccounts) {
        await db.accounts.put(toPlainObject(a))
      }
    }
    if (localTransactions.length > 0) {
      for (const t of localTransactions) {
        await db.transactions.put(toPlainObject(t))
      }
    }

    await Promise.all([
      accountsStore.load(),
      transactionsStore.load(),
      profileStore.load(),
    ])
  },

  /**
   * Discards local offline data and restores purely cloud data (PRD 9.1 option 1).
   */
  async discardLocalData(params: DiscardLocalDataParams): Promise<void> {
    const sessionStore = useSessionStore()
    const profileStore = useProfileStore()
    const accountsStore = useAccountsStore()
    const transactionsStore = useTransactionsStore()

    sessionStore.setTokens(params.token, params.refreshToken)
    syncEngine.resume()

    await profileStore.setProfileLocally({
      id: String(params.user.id),
      name: params.user.name || 'Usuario',
      email: params.user.email,
      plan: params.user.plan || 'free',
    })

    await db.accounts.clear()
    await db.transactions.clear()
    await db.outbox.clear()

    if (params.accountsData.length > 0) {
      await db.accounts.bulkAdd(params.accountsData.map(mapCloudAccountToCanonical))
    }
    if (params.transactionsData.length > 0) {
      await db.transactions.bulkAdd(params.transactionsData.map(mapCloudTransactionToCanonical))
    }

    await Promise.all([
      accountsStore.load(),
      transactionsStore.load(),
      profileStore.load(),
    ])
  },

  /**
   * Formats local accounts and transactions for /auth/register-sync payload (API contract 3.4).
   */
  async prepareGuestDataForRegistration(): Promise<{ accounts: CleanGuestAccountPayload[]; transactions: CleanGuestTransactionPayload[] }> {
    const accounts = await db.accounts.toArray()
    const transactions = await db.transactions.toArray()

    const cleanAccounts: CleanGuestAccountPayload[] = accounts.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      amount: a.initial_balance,
      description: a.description ?? null,
      currency: a.currency || 'USD',
      is_default: Boolean(a.is_default),
    }))

    const cleanTransactions: CleanGuestTransactionPayload[] = transactions.map(t => ({
      id: t.id,
      account_id: t.account_id,
      accountId: t.account_id,
      type: t.type,
      kind: t.type,
      amount: t.amount,
      reason: t.reason,
      description: t.description ?? null,
      payment_method: t.payment_method,
      paymentType: t.payment_method,
      date: t.date || t.created_at || new Date().toISOString(),
      category: t.category ?? null,
      tags: t.tags || [],
      deletion_reason: t.deletion_reason ?? null,
      deleteReason: t.deletion_reason ?? null,
      deleted_at: t.deleted_at ?? null,
      deletedAt: t.deleted_at ?? null,
    }))

    return {
      accounts: cleanAccounts,
      transactions: cleanTransactions,
    }
  },

  /**
   * Finalizes user registration sync by saving backend syncedData and resetting outbox (API contract 3.4).
   */
  async completeRegistrationSync(params: RegistrationSyncParams): Promise<void> {
    const sessionStore = useSessionStore()
    const profileStore = useProfileStore()
    const accountsStore = useAccountsStore()
    const transactionsStore = useTransactionsStore()

    sessionStore.setTokens(params.token, params.refreshToken)
    syncEngine.resume()

    await profileStore.setProfileLocally({
      id: String(params.user.id),
      name: params.user.name || 'Usuario',
      email: params.user.email,
      plan: params.user.plan || 'free',
    })

    await db.accounts.clear()
    await db.transactions.clear()
    await db.outbox.clear()

    if (params.syncedAccounts && params.syncedAccounts.length > 0) {
      await db.accounts.bulkAdd(params.syncedAccounts.map(mapCloudAccountToCanonical))
    }
    if (params.syncedTransactions && params.syncedTransactions.length > 0) {
      await db.transactions.bulkAdd(params.syncedTransactions.map(mapCloudTransactionToCanonical))
    }

    await Promise.all([
      accountsStore.load(),
      transactionsStore.load(),
      profileStore.load(),
    ])
  },
}
