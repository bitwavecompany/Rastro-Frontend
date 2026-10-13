import { z } from 'zod'
import { PAYMENT_METHODS, TRANSACTION_TYPES } from '@/constants/transactions'
import { CATEGORY_IDS } from '@/constants/categories'
import type { CategoryId, TransactionCategoryItem } from '@/constants/categories'

export { CATEGORY_IDS }
export type { CategoryId, TransactionCategoryItem }
export type TransactionCategory = CategoryId

export const TransactionCategorySchema = z.enum(CATEGORY_IDS)

export const TransactionSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  user_id: z.string().optional(),
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number().positive('Amount must be greater than 0'),
  reason: z.string().min(1, 'Reason is required'),
  description: z.string().nullable().optional(),
  payment_method: z.enum(PAYMENT_METHODS),
  date: z.string(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  transfer_id: z.string().nullable().optional(),
  deletion_reason: z.string().nullable().optional(),
  deleted_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  sync_status: z.enum(['synced', 'pending_create', 'pending_update', 'pending_delete']).default('pending_create'),
})

export const BaseCreateTransactionSchema = z.object({
  account_id: z.string().min(1, 'Account is required'),
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number().positive('Amount must be greater than 0'),
  reason: z.string().min(1, 'Reason is required'),
  description: z.string().nullable().optional(),
  payment_method: z.enum(PAYMENT_METHODS),
  date: z.string().optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]).optional(),
  transfer_id: z.string().nullable().optional(),
})

export const CreateTransactionSchema = BaseCreateTransactionSchema.superRefine((data, ctx) => {
  if (data.type === 'expense' && (!data.category || data.category.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La categoría es obligatoria para gastos',
      path: ['category'],
    })
  }
})

export const UpdateTransactionSchema = BaseCreateTransactionSchema.partial()

export interface RelocateTransactionPayload {
  id: string
  new_id: string
  destination_account_id: string
  reason: string
}

export type Transaction = z.infer<typeof TransactionSchema>
export type CreateTransactionPayload = z.infer<typeof CreateTransactionSchema>
export type UpdateTransactionPayload = z.infer<typeof UpdateTransactionSchema>
