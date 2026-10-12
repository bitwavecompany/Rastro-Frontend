import { z } from 'zod'
import { ACCOUNT_TYPES } from '@/constants/accounts'

export const AccountSchema = z.object({
  id: z.string(),
  user_id: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(50, 'Name must not exceed 50 characters'),
  type: z.enum(ACCOUNT_TYPES),
  initial_balance: z.number().min(0, 'Initial balance cannot be negative'),
  description: z.string().nullable().optional(),
  currency: z.string().default('USD'),
  is_default: z.boolean().default(false),
  deactivation_reason: z.enum(['user_action', 'plan_downgrade']).nullable().optional(),
  deleted_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  sync_status: z.enum(['synced', 'pending_create', 'pending_update', 'pending_delete']).default('pending_create'),
})

export const CreateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must not exceed 50 characters'),
  type: z.enum(ACCOUNT_TYPES),
  initial_balance: z.number().min(0, 'Initial balance cannot be negative'),
  description: z.string().nullable().optional(),
  currency: z.string().default('USD').optional(),
  is_default: z.boolean().default(false).optional(),
})

export const UpdateAccountSchema = CreateAccountSchema.partial()

export type Account = z.infer<typeof AccountSchema>
export type CreateAccountPayload = z.infer<typeof CreateAccountSchema>
export type UpdateAccountPayload = z.infer<typeof UpdateAccountSchema>
