import { reactive, ref } from 'vue'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useTransactionsStore } from '@/stores/useTransactionsStore'
import { useToastStore } from '@/stores/useToastStore'
import { useEntitlementsStore } from '@/stores/useEntitlementsStore'
import { CreateAccountSchema } from '@/types/account'
import type { Account, CreateAccountPayload } from '@/types/account'
import type { AccountType } from '@/constants/accounts'

export type AccountFormData = {
  name: string
  type: AccountType
  amount: number | ''
  description: string
}

export type AccountFormErrors = Partial<Record<keyof AccountFormData, string>>

function emptyForm(): AccountFormData {
  return { name: '', type: 'bank', amount: '', description: '' }
}

export function useAccountForm() {
  const store = useAccountsStore()
  const transactionsStore = useTransactionsStore()
  const toast = useToastStore()
  const entitlements = useEntitlementsStore()

  const form = reactive<AccountFormData>(emptyForm())
  const errors = reactive<AccountFormErrors>({})
  const isOpen = ref(false)
  const isDefault = ref(false)
  const editingAccount = ref<Account | null>(null)
  const initialType = ref<AccountType | null>(null)
  const hasMovements = ref(false)
  const isCascadeConfirmOpen = ref(false)
  const isCascadeConfirmed = ref(false)
  let pendingAccountId: string | number | undefined = undefined

  function open(account?: Account) {
    isCascadeConfirmed.value = false
    isCascadeConfirmOpen.value = false
    pendingAccountId = undefined

    if (!account) {
      editingAccount.value = null
      initialType.value = null
      hasMovements.value = false
      isDefault.value = false

      if (!entitlements.canCreateAccount) {
        if (entitlements.isGuest) {
          toast.warning('Crea una cuenta gratuita para agregar más cuentas y respaldar tus datos en la nube.', 5000)
        } else {
          toast.warning('Alcanzaste el límite de 3 cuentas. Desactiva una cuenta o mejora a Premium.', 5000)
        }
        return
      }

      Object.assign(form, emptyForm())
    } else {
      editingAccount.value = account
      initialType.value = account.type
      isDefault.value = Boolean(account.is_default || account.id === store.defaultAccountId)

      // PRD Regla 4: Verificar si la cuenta tiene movimientos (activos o desactivados)
      const movements = transactionsStore.byAccount(account.id, undefined, true)
      hasMovements.value = movements.length > 0

      Object.assign(form, {
        name: account.name,
        type: account.type,
        amount: account.initial_balance ?? account.amount,
        description: account.description ?? '',
      })
    }
    Object.keys(errors).forEach(key => delete errors[key as keyof AccountFormErrors])
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function validate(): CreateAccountPayload | null {
    Object.keys(errors).forEach(key => delete errors[key as keyof AccountFormErrors])

    // PRD 3.2: Unicidad de nombre de cuenta por usuario
    const trimmedName = form.name.trim()
    const duplicate = store.accounts.find(
      a => a.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (duplicate && (!isOpen.value || form.name !== duplicate.name)) {
      // Si estamos editando y no cambió de nombre, es válido
    }

    const payloadToValidate = {
      name: trimmedName,
      type: form.type,
      amount: Number(form.amount),
      initial_balance: Number(form.amount),
      description: form.description.trim() || undefined,
    }

    const result = CreateAccountSchema.safeParse(payloadToValidate)

    if (!result.success) {
      result.error.issues.forEach(issue => {
        const path = issue.path[0] as keyof AccountFormData
        if (!errors[path]) {
          errors[path] = issue.message
        }
      })
      return null
    }

    return result.data
  }

  async function submit(accountId?: string | number): Promise<boolean> {
    const payload = validate()
    if (!payload) return false

    // Validación de nombre duplicado en el cliente
    const existingSameName = store.accounts.find(
      a => a.name.toLowerCase() === payload.name.toLowerCase() && String(a.id) !== String(accountId || '')
    )
    if (existingSameName) {
      errors.name = 'Ya existe una cuenta con este nombre'
      return false
    }

    // PRD Regla 4 y 5: Si la cuenta tiene movimientos y se cambia el tipo, solicitar confirmación
    if (accountId !== undefined && editingAccount.value) {
      const typeChanged = payload.type !== initialType.value
      if (typeChanged && hasMovements.value && !isCascadeConfirmed.value) {
        pendingAccountId = accountId
        isCascadeConfirmOpen.value = true
        return false
      }
    }

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
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Ocurrió un error al guardar')
      return false
    }
  }

  async function confirmCascade(): Promise<boolean> {
    isCascadeConfirmed.value = true
    isCascadeConfirmOpen.value = false
    if (pendingAccountId !== undefined) {
      return await submit(pendingAccountId)
    }
    return false
  }

  function cancelCascade() {
    isCascadeConfirmOpen.value = false
    // Revertir el tipo al original si se cancela la confirmación
    if (initialType.value) {
      form.type = initialType.value
    }
  }

  return { 
    form, 
    errors, 
    isOpen, 
    isDefault, 
    hasMovements,
    isCascadeConfirmOpen,
    open, 
    close, 
    submit,
    confirmCascade,
    cancelCascade
  }
}