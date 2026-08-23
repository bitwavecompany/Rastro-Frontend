import { reactive, ref } from 'vue'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import { useToastStore } from '@/stores/useToastStore'
import type { Transaction, PaymentType, CreateTransactionPayload, TransactionKind } from '@/types/transaction'

export type MovementFormData = {
  amount:      number | ''
  reason:      string
  description: string
  paymentType: PaymentType
}

export type MovementFormErrors = Partial<Record<'amount' | 'reason', string>>

export function useMovementForm() {
  const store = useTransactionsStore()
  const toast = useToastStore()

  const form    = reactive<MovementFormData>({ amount: '', reason: '', description: '', paymentType: 'cash' })
  const errors  = reactive<MovementFormErrors>({})
  const isOpen  = ref(false)
  const editing = ref<Transaction | null>(null)

  function open(transaction: Transaction) {
    editing.value = transaction
    Object.assign(form, {
      amount:      transaction.amount,
      reason:      transaction.reason,
      description: transaction.description ?? '',
      paymentType: transaction.paymentType,
    })
    delete errors.amount
    delete errors.reason
    isOpen.value = true
  }

  function close() {
    editing.value = null
    isOpen.value  = false
  }

  function validate(): boolean {
    delete errors.amount
    delete errors.reason
    if (!form.amount || Number(form.amount) <= 0)
      errors.amount = 'Requerido'
    if (!form.reason.trim())
      errors.reason = 'Requerido'
    return !errors.amount && !errors.reason
  }

  async function submit(): Promise<boolean> {
    if (!validate() || !editing.value) return false

    const payload: Partial<CreateTransactionPayload> = {
      amount:      Number(form.amount),
      reason:      form.reason.trim(),
      paymentType: form.paymentType,
      ...(form.description.trim() && { description: form.description.trim() }),
    }

    try {
      await store.update(editing.value.id, payload)
      toast.success(editing.value.kind === 'expense' ? 'Gasto actualizado' : 'Ingreso actualizado')
      close()
      return true
    } catch (error) {
      toast.error('Ocurrió un error al actualizar')
      return false
    }
  }

  const editingKind = (): TransactionKind | null => editing.value?.kind ?? null

  return { form, errors, isOpen, editing, editingKind, open, close, submit }
}