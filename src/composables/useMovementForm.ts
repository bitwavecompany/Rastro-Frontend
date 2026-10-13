import { reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { z } from 'zod'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useToastStore } from '@/stores/useToastStore'
import type { Transaction, CreateTransactionPayload } from '@/types/transaction'
import { CreateTransactionSchema } from '@/types/transaction'
import type { PaymentMethod, TransactionType } from '@/constants/transactions'

export type MovementFormData = {
  amount: number | ''
  reason: string
  description: string
  payment_method: PaymentMethod
  account_id: string
  type: TransactionType
  date?: string
  category?: string | null
}

export type MovementFormErrors = Partial<Record<keyof MovementFormData, string>>

export function useMovementForm() {
  const store = useTransactionsStore()
  const accountsStore = useAccountsStore()
  const toast = useToastStore()

  const form = reactive<MovementFormData>({
    amount: '',
    reason: '',
    description: '',
    payment_method: 'cash',
    account_id: '',
    type: 'expense',
    date: dayjs().format('YYYY-MM-DD'),
    category: 'comida',
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
      payment_method: transaction.payment_method,
      account_id: transaction.account_id,
      type: transaction.type,
      date: dayjs(transaction.date || transaction.created_at || new Date()).format('YYYY-MM-DD'),
      category: transaction.type === 'expense' ? (transaction.category || 'otros') : null,
    })
    Object.keys(errors).forEach(key => delete (errors as Record<string, string | undefined>)[key])
    isOpen.value = true
  }

  function close() {
    editing.value = null
    isOpen.value = false
  }

  function validate(): boolean {
    Object.keys(errors).forEach(key => delete (errors as Record<string, string | undefined>)[key])

    try {
      CreateTransactionSchema.parse({
        ...form,
        amount: Number(form.amount),
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.issues.forEach(err => {
          if (err.path[0]) {
            (errors as Record<string, string | undefined>)[err.path[0] as string] = err.message
          }
        })
      }
      return false
    }

    // PRD Rule 6: Validate account is active and matches payment method
    const targetAccount = accountsStore.accounts.find(a => a.id === form.account_id)
    if (!targetAccount) {
      errors.account_id = 'La cuenta seleccionada no existe o está desactivada'
      return false
    }

    const expectedType = form.payment_method === 'cash' ? 'cash' : 'bank'
    if (targetAccount.type !== expectedType) {
      errors.account_id = 'El tipo de cuenta debe coincidir con el método de pago seleccionado'
      return false
    }

    if (form.type === 'expense') {
      if (!form.category || !form.category.trim()) {
        errors.category = 'La categoría es obligatoria para gastos'
        return false
      }
    } else {
      form.category = null
    }

    return true
  }

  async function submit(): Promise<boolean> {
    if (!validate() || !editing.value) return false

    const payload: Partial<CreateTransactionPayload> = {
      amount: Number(form.amount),
      reason: form.reason.trim(),
      payment_method: form.payment_method,
      type: form.type,
      account_id: form.account_id,
      category: form.type === 'expense' ? (form.category || 'otros') : null,
      date: form.date ? (form.date.includes('T') ? form.date.split('T')[0] : form.date) : dayjs().format('YYYY-MM-DD'),
      description: form.description.trim() ? form.description.trim() : null,
    }

    try {
      await store.update(editing.value.id, payload)
      toast.success(editing.value.type === 'expense' ? 'Gasto actualizado' : 'Ingreso actualizado')
      close()
      return true
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error(err.response?.data?.message || err.message || 'Ocurrió un error al actualizar')
      return false
    }
  }

  const editingType = (): TransactionType | null => editing.value?.type ?? null

  return { form, errors, isOpen, editing, editingType, open, close, submit }
}