export type PaymentType = 'cash' | 'transfer'
export type TransactionKind = 'expense' | 'income'

export interface Transaction {
  id: number
  kind: TransactionKind
  amount: number
  reason: string
  description?: string
  paymentType: PaymentType
  accountId: number
  createdAt: string
  deletedAt?: string
  deleteReason?: string
}

export type CreateTransactionPayload = Omit<Transaction, 'id' | 'createdAt' | 'deletedAt' | 'deleteReason'>