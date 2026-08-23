import dayjs from 'dayjs'
import type { PaymentType } from '@/types/transaction'
import type { AccountType } from '@/types/account'

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(iso: string): string {
  return dayjs(iso).format('D MMM YYYY · h:mm A')
}

export function paymentLabel(type: PaymentType): string {
  return type === 'cash' ? 'Efectivo' : 'Transferencia'
}

export function paymentIcon(type: PaymentType): string {
  return type === 'cash' ? 'lucide:banknote' : 'lucide:arrow-right-left'
}

export function getAccountIcon(type: AccountType): string {
  return type === 'cash' ? 'lucide:banknote' : 'lucide:building-2'
}

export function getAccountColorClass(type: AccountType): string {
  return type === 'cash' ? 'bg-income/20 text-income/90' : 'bg-primary/20 text-primary/90'
}