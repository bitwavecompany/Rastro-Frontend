import { reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import { useToastStore } from '@/stores/useToastStore'
import type { Transaction, CreateTransactionPayload } from '@/types/transaction'
import { CreateTransactionSchema } from '@/types/transaction'
import type { PaymentType, TransactionKind } from '@/constants/transactions'
import { z } from 'zod'

export type MovementFormData = {
  amount: number | ''
  reason: string
  description: string
  paymentType: PaymentType
  accountId: string | number
  kind: TransactionKind
  date?: string
}

export type MovementFormErrors = Partial<Record<keyof MovementFormData, string>>

import { useAccountsStore } from '@/stores/useAccountsStore'

export function useMovementForm() {
  const store = useTransactionsStore()
  const accountsStore = useAccountsStore()
  const toast = useToastStore()

  const form = reactive<MovementFormData>({ 
    amount: '', 
    reason: '', 
    description: '', 
    paymentType: 'cash', 
    accountId: '', 
    kind: 'expense',
    date: dayjs().format('YYYY-MM-DD')
  })
  const errors = reactive<MovementFormErrors>({})
  const isOpen = ref(false)
  const editing = ref<Transaction | null>(null)

  function open(transaction: Transaction) {
    editing.value = transaction
    Object.assign(form, {
      amount: transaction.amount,
      reason: transaction.reason,
      description: transaction.description ?? '',
      paymentType: transaction.payment_method || transaction.paymentType,
      accountId: transaction.account_id || transaction.accountId,
      kind: transaction.type || transaction.kind,
      date: dayjs(transaction.date || transaction.createdAt || new Date()).format('YYYY-MM-DD')
    })
    Object.keys(errors).forEach(key => delete (errors as any)[key])
    isOpen.value = true
  }

  function close() {
    editing.value = null
    isOpen.value = false
  }

  function validate(): boolean {
    Object.keys(errors).forEach(key => delete (errors as any)[key])
    
    try {
      CreateTransactionSchema.parse({
        ...form,
        amount: Number(form.amount)
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach((err: any) => {
          if (err.path[0]) {
            (errors as any)[err.path[0]] = err.message
          }
        })
      }
      return false
    }

    // PRD Regla 6: Validar que la cuenta esté activa y coincida con el método de pago
    const targetAccount = accountsStore.accounts.find(a => String(a.id) === String(form.accountId))
    if (!targetAccount) {
      errors.accountId = 'La cuenta seleccionada no existe o está desactivada'
      return false
    }

    const expectedType = form.paymentType === 'cash' ? 'cash' : 'bank'
    if (targetAccount.type !== expectedType) {
      errors.accountId = 'El tipo de cuenta debe coincidir con el método de pago seleccionado'
      return false
    }

    return true
  }

  async function submit(): Promise<boolean> {
    if (!validate() || !editing.value) return false

    const payload: Partial<CreateTransactionPayload> = {
      amount: Number(form.amount),
      reason: form.reason.trim(),
      paymentType: form.paymentType,
      payment_method: form.paymentType,
      kind: form.kind,
      type: form.kind,
      accountId: form.accountId,
      account_id: form.accountId,
      date: form.date ? (form.date.includes('T') ? form.date.split('T')[0] : form.date) : dayjs().format('YYYY-MM-DD'),
      description: form.description.trim() ? form.description.trim() : null,
    }

    try {
      await store.update(editing.value.id, payload)
      toast.success(editing.value.kind === 'expense' ? 'Gasto actualizado' : 'Ingreso actualizado')
      close()
      return true
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ocurrió un error al actualizar')
      return false
    }
  }

  const editingKind = (): TransactionKind | null => editing.value?.kind ?? null

  return { form, errors, isOpen, editing, editingKind, open, close, submit }
}