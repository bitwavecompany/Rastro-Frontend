import { reactive, ref } from 'vue'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useToastStore } from '@/stores/useToastStore'
import type { Account, AccountType, CreateAccountPayload } from '@/types/account'

export type AccountFormData = {
  name: string
  type: AccountType
  amount: number | ''
  description: string
}

export type AccountFormErrors = Partial<Record<'name' | 'amount', string>>

function emptyForm(): AccountFormData {
  return { name: '', type: 'bank', amount: '', description: '' }
}

export function useAccountForm() {
  const store = useAccountsStore()
  const toast = useToastStore()

  const form   = reactive<AccountFormData>(emptyForm())
  const errors = reactive<AccountFormErrors>({})
  const isOpen = ref(false)

  function open(account?: Account) {
    if (account) {
      Object.assign(form, {
        name:        account.name,
        type:        account.type,
        amount:      account.amount,
        description: account.description ?? '',
      })
    } else {
      Object.assign(form, emptyForm())
    }
    delete errors.name
    delete errors.amount
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function validate(): boolean {
    delete errors.name
    delete errors.amount
    if (!form.name.trim())
      errors.name = 'El nombre es obligatorio'
    if (form.amount === '' || Number(form.amount) < 0)
      errors.amount = 'Ingresa un monto válido'
    return !errors.name && !errors.amount
  }

  function buildPayload(): CreateAccountPayload {
    return {
      name:   form.name.trim(),
      type:   form.type,
      amount: Number(form.amount),
      ...(form.description.trim() && { description: form.description.trim() }),
    }
  }

  async function submit(accountId?: number): Promise<boolean> {
    if (!validate()) return false
    const payload = buildPayload()
    
    try {
      if (accountId !== undefined) {
        await store.update(accountId, payload)
        toast.success('Cuenta actualizada')
      } else {
        await store.add(payload)
        toast.success('Cuenta creada')
      }
      close()
      return true
    } catch (error) {
      toast.error('Ocurrió un error al guardar')
      return false
    }
  }

  return { form, errors, isOpen, open, close, submit }
}