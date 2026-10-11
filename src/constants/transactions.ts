export const PAYMENT_TYPES = ['cash', 'transfer'] as const;
export type PaymentType = typeof PAYMENT_TYPES[number];

export const TRANSACTION_KINDS = ['expense', 'income'] as const;
export type TransactionKind = typeof TRANSACTION_KINDS[number];
