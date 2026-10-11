import type { OutboxEntry } from '../types'

export class ApiPayloadAdapter {
  static toBatchPayload(entries: OutboxEntry[]) {
    return {
      operations: entries.map(entry => {
        const raw = entry.payload ? { ...entry.payload } : {}

        // Remove local Dexie/Vue metadata
        delete raw.syncStatus
        delete raw.updatedAt
        delete raw.updated_at
        delete raw.ownerId
        delete raw.user_id

        let finalPayload: Record<string, any>

        if (entry.entity === 'accounts') {
          if (entry.op === 'create') {
            finalPayload = {
              id: String(raw.id || entry.entityId),
              name: raw.name,
              type: raw.type,
              amount: Number(raw.amount ?? raw.initial_balance ?? 0),
              initial_balance: Number(raw.initial_balance ?? raw.amount ?? 0),
              description: raw.description ?? null,
              currency: raw.currency || 'USD',
              is_default: Boolean(raw.is_default)
            }
          } else if (entry.op === 'update') {
            finalPayload = {
              id: String(raw.id || entry.entityId),
              ...(raw.name !== undefined && { name: raw.name }),
              ...(raw.type !== undefined && { type: raw.type }),
              ...(raw.amount !== undefined && { amount: Number(raw.amount) }),
              ...(raw.description !== undefined && { description: raw.description }),
            }
          } else if (entry.op === 'delete') {
            finalPayload = {
              id: String(raw.id || entry.entityId),
              deactivation_reason: raw.deactivation_reason || null
            }
          } else {
            // restore, hard-delete
            finalPayload = { id: String(raw.id || entry.entityId) }
          }
        } else if (entry.entity === 'transactions') {
          if (entry.op === 'create') {
            finalPayload = {
              id: String(raw.id || entry.entityId),
              account_id: String(raw.account_id || raw.accountId),
              type: raw.type || raw.kind || 'expense',
              amount: Number(raw.amount),
              reason: raw.reason,
              payment_method: raw.payment_method || raw.paymentType || 'cash',
              description: raw.description ?? null,
              date: raw.date
                ? (raw.date.includes('T') ? raw.date.split('T')[0] : raw.date)
                : (raw.createdAt ? raw.createdAt.split('T')[0] : null),
              category: raw.category ?? null,
              tags: Array.isArray(raw.tags) ? raw.tags : [],
              transfer_id: raw.transfer_id ?? null
            }
          } else if (entry.op === 'update') {
            finalPayload = {
              id: String(raw.id || entry.entityId),
              ...(raw.account_id || raw.accountId ? { account_id: String(raw.account_id || raw.accountId) } : {}),
              ...(raw.type || raw.kind ? { type: raw.type || raw.kind } : {}),
              ...(raw.amount !== undefined ? { amount: Number(raw.amount) } : {}),
              ...(raw.reason !== undefined ? { reason: raw.reason } : {}),
              ...(raw.payment_method || raw.paymentType ? { payment_method: raw.payment_method || raw.paymentType } : {}),
              ...(raw.description !== undefined ? { description: raw.description } : {}),
              ...(raw.date ? { date: raw.date.includes('T') ? raw.date.split('T')[0] : raw.date } : {}),
            }
          } else if (entry.op === 'delete') {
            finalPayload = {
              id: String(raw.id || entry.entityId),
              deletion_reason: raw.deletion_reason || raw.deleteReason || null
            }
          } else if (entry.op === 'relocate') {
            finalPayload = {
              id: String(raw.id || entry.entityId),
              new_id: String(raw.new_id),
              destination_account_id: String(raw.destination_account_id),
              reason: String(raw.reason)
            }
          } else if (entry.op === 'purge-account') {
            finalPayload = {
              account_id: String(raw.account_id || raw.accountId || entry.entityId)
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
          payload: finalPayload
        }
      })
    }
  }
}
