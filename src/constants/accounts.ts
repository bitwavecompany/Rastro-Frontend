export const ACCOUNT_TYPES = ['cash', 'bank'] as const
export type AccountType = typeof ACCOUNT_TYPES[number]
