import dayjs from 'dayjs'
import 'dayjs/locale/es'
import type { PaymentMethod } from '@/constants/transactions'
import type { AccountType } from '@/constants/accounts'

dayjs.locale('es')

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(iso?: string | null): string {
  if (!iso) return ''
  return dayjs(iso).locale('es').format('DD MMM YYYY').toLowerCase()
}

export function paymentLabel(method: PaymentMethod): string {
  return method === 'cash' ? 'Efectivo' : 'Transferencia'
}

export function paymentIcon(method: PaymentMethod): string {
  return method === 'cash' ? 'lucide:banknote' : 'lucide:arrow-right-left'
}

export function getAccountIcon(type: AccountType): string {
  return type === 'cash' ? 'lucide:banknote' : 'lucide:building-2'
}

export function getAccountColorClass(type: AccountType): string {
  return type === 'cash' ? 'bg-income/20 text-income/90' : 'bg-primary/20 text-primary/90'
}