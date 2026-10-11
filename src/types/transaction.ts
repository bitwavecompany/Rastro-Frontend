import { z } from 'zod';
import { PAYMENT_TYPES, TRANSACTION_KINDS } from '@/constants/transactions';

export const TransactionSchema = z.object({
  id: z.union([z.string(), z.number()]),
  kind: z.enum(TRANSACTION_KINDS),
  type: z.enum(['income', 'expense']).optional(),
  amount: z.number().positive('Ingresa un monto válido mayor a 0'),
  reason: z.string().min(1, 'La razón es obligatoria'),
  description: z.string().nullable().optional(),
  paymentType: z.enum(PAYMENT_TYPES),
  payment_method: z.enum(['cash', 'transfer']).optional(),
  accountId: z.union([z.string(), z.number()]),
  account_id: z.union([z.string(), z.number()]).optional(),
  date: z.string().optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().optional(),
  created_at: z.string().optional(),
  updatedAt: z.string().optional(),
  updated_at: z.string().optional(),
  deletedAt: z.string().optional(),
  deleted_at: z.string().nullable().optional(),
  deleteReason: z.string().optional(),
  deletion_reason: z.string().nullable().optional(),
  transfer_id: z.string().nullable().optional(),
  ownerId: z.string().optional(),
  user_id: z.string().optional(),
  // Sync metadata
  syncStatus: z.enum(['synced', 'pending_create', 'pending_update', 'pending_delete']).default('pending_create'),
});

export const CreateTransactionSchema = z.object({
  kind: z.enum(TRANSACTION_KINDS),
  type: z.enum(['income', 'expense']).optional(),
  amount: z.number().positive('Ingresa un monto válido mayor a 0'),
  reason: z.string().min(1, 'La razón es obligatoria'),
  description: z.string().nullable().optional(),
  paymentType: z.enum(PAYMENT_TYPES),
  payment_method: z.enum(['cash', 'transfer']).optional(),
  accountId: z.union([z.string(), z.number()]),
  account_id: z.union([z.string(), z.number()]).optional(),
  date: z.string().optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]).optional(),
  transfer_id: z.string().nullable().optional(),
});

export const UpdateTransactionSchema = CreateTransactionSchema.partial();

export interface RelocateTransactionPayload {
  id: string | number
  new_id: string
  destination_account_id: string | number
  reason: string
}

export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransactionPayload = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionPayload = z.infer<typeof UpdateTransactionSchema>;
