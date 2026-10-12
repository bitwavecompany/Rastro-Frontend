export const PAYMENT_METHODS = ['cash', 'transfer'] as const
export type PaymentMethod = typeof PAYMENT_METHODS[number]

export const TRANSACTION_TYPES = ['expense', 'income'] as const
export type TransactionType = typeof TRANSACTION_TYPES[number]
