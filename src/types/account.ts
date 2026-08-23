export type AccountType = 'cash' | 'bank'

export interface Account {
  id: number
  name: string
  type: AccountType
  amount: number
  description?: string
  createdAt: string
}

export type CreateAccountPayload = Omit<Account, 'id' | 'createdAt'>