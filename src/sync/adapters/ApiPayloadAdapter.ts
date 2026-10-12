import type { OutboxEntry, SyncBatchRequest } from '../types'

export class ApiPayloadAdapter {
  static toBatchPayload(entries: OutboxEntry[]): SyncBatchRequest {
    return {
      operations: entries.map(entry => {
        const raw = entry.payload ? { ...entry.payload } : {}

        // Strip local Dexie/Vue metadata
        delete raw.sync_status
        delete raw.syncStatus
        delete raw.updated_at
        delete raw.updatedAt
        delete raw.user_id
        delete raw.ownerId

        let finalPayload: Record<string, unknown>

        if (entry.entity === 'accounts') {
          if (entry.op === 'create') {
            finalPayload = {
              id: String(raw.id || entry.entityId),
              name: raw.name,
              type: raw.type,
              initial_balance: Number(raw.initial_balance ?? 0),
              description: raw.description ?? null,
              currency: (raw.currency as string) || 'USD',
              is_default: Boolean(raw.is_default),
            }
          } else if (entry.op === 'update') {
            finalPayload = {
              id: String(raw.id || entry.entityId),
              ...(raw.name !== undefined && { name: raw.name }),
              ...(raw.type !== undefined && { type: raw.type }),
              ...(raw.initial_balance !== undefined && { initial_balance: Number(raw.initial_balance) }),
              ...(raw.description !== undefined && { description: raw.description }),
            }
          } else if (entry.op === 'delete') {
            finalPayload = {
              id: String(raw.id || entry.entityId),
              deactivation_reason: raw.deactivation_reason || null,
            }
          } else {
            // restore, hard-delete
            finalPayload = { id: String(raw.id || entry.entityId) }
          }
        } else if (entry.entity === 'transactions') {
          if (entry.op === 'create') {
            finalPayload = {
              id: String(raw.id || entry.entityId),
              account_id: String(raw.account_id),
              type: raw.type || 'expense',
              amount: Number(raw.amount),
              reason: raw.reason,
              payment_method: raw.payment_method || 'cash',
              description: raw.description ?? null,
              date: typeof raw.date === 'string'
                ? (raw.date.includes('T') ? raw.date.split('T')[0] : raw.date)
                : null,
              category: raw.category ?? null,
              tags: Array.isArray(raw.tags) ? raw.tags : [],
              transfer_id: raw.transfer_id ?? null,
            }
          } else if (entry.op === 'update') {
            finalPayload = {
              id: String(raw.id || entry.entityId),
              ...(raw.account_id ? { account_id: String(raw.account_id) } : {}),
              ...(raw.type ? { type: raw.type } : {}),
              ...(raw.amount !== undefined ? { amount: Number(raw.amount) } : {}),
              ...(raw.reason !== undefined ? { reason: raw.reason } : {}),
              ...(raw.payment_method ? { payment_method: raw.payment_method } : {}),
              ...(raw.description !== undefined ? { description: raw.description } : {}),
              ...(raw.date ? { date: typeof raw.date === 'string' && raw.date.includes('T') ? raw.date.split('T')[0] : raw.date } : {}),
            }
          } else if (entry.op === 'delete') {
            finalPayload = {
              id: String(raw.id || entry.entityId),
              deletion_reason: raw.deletion_reason || null,
            }
          } else if (entry.op === 'relocate') {
            finalPayload = {
              id: String(raw.id || entry.entityId),
              new_id: String(raw.new_id),
              destination_account_id: String(raw.destination_account_id),
              reason: String(raw.reason),
            }
          } else if (entry.op === 'purge-account') {
            finalPayload = {
              account_id: String(raw.account_id || entry.entityId),
            }
          } else {
            // restore, hard-delete
            finalPayload = { id: String(raw.id || entry.entityId) }
          }
        } else {
          finalPayload = { id: String(raw.id || entry.entityId), ...raw }
        }

        return {
          opId: entry.opId,
          entity: entry.entity,
          op: entry.op,
          payload: finalPayload,
        }
      }),
    }
  }
}
