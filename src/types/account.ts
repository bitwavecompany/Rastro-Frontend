import { z } from 'zod';
import { ACCOUNT_TYPES } from '@/constants/accounts';

export const AccountSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().min(1, 'El nombre es obligatorio'),
  type: z.enum(ACCOUNT_TYPES),
  amount: z.number().min(0, 'El monto inicial no puede ser negativo'),
  initial_balance: z.number().min(0).optional(),
  description: z.string().optional(),
  currency: z.string().default('USD'),
  is_default: z.boolean().default(false),
  createdAt: z.string().optional(),
  created_at: z.string().optional(),
  updatedAt: z.string().optional(),
  updated_at: z.string().optional(),
  deletedAt: z.string().optional(),
  deleted_at: z.string().nullable().optional(),
  deactivation_reason: z.enum(['user_action', 'plan_downgrade']).nullable().optional(),
  ownerId: z.string().optional(),
  user_id: z.string().optional(),
  // Sync metadata
  syncStatus: z.enum(['synced', 'pending_create', 'pending_update', 'pending_delete']).default('pending_create'),
});

export const CreateAccountSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  type: z.enum(ACCOUNT_TYPES),
  amount: z.number().min(0, 'El monto inicial no puede ser negativo'),
  initial_balance: z.number().min(0).optional(),
  description: z.string().optional(),
  currency: z.string().default('USD').optional(),
  is_default: z.boolean().default(false).optional(),
});

export const UpdateAccountSchema = CreateAccountSchema.partial();

export type Account = z.infer<typeof AccountSchema>;
export type CreateAccountPayload = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountPayload = z.infer<typeof UpdateAccountSchema>;

