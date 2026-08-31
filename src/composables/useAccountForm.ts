import { reactive, ref } from 'vue'
import { useAccountsStore } from '@/stores/useAccountsStore'
import { useToastStore } from '@/stores/useToastStore'
import { useProfileStore } from '@/stores/useProfileStore'
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
  const profileStore = useProfileStore()

  const form   = reactive<AccountFormData>(emptyForm())
  const errors = reactive<AccountFormErrors>({})
  const isOpen = ref(false)

  function open(account?: Account) {
    if (!account) {
      const roleToken = profileStore.profile.roleToken
      const maxAccounts = roleToken === 'Z3Vlc3RfbGV2ZWxfMjAyNg==' ? 2 : (roleToken === 'cmVnaXN0ZXJlZF9sZXZlbF8yMDI2' ? 3 : Infinity)

      if (store.accounts.length >= maxAccounts) {
        if (roleToken === 'Z3Vlc3RfbGV2ZWxfMjAyNg==') {
          toast.warning('Límite de cuentas excedido. Por favor, inicia sesión para crear más.', 4500)
        } else if (roleToken === 'cmVnaXN0ZXJlZF9sZXZlbF8yMDI2') {
          toast.warning('Límite de cuentas excedido. Mejora a Premium para cuentas ilimitadas.', 4500)
        }
        return
      }
      
      Object.assign(form, emptyForm())
    } else {
      Object.assign(form, {
        name:        account.name,
        type:        account.type,
        amount:      account.amount,
        description: account.description ?? '',
      })
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

async function submit(accountId?: string | number): Promise<boolean> {
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ocurrió un error al guardar')
      return false
    }
  }

  return { form, errors, isOpen, open, close, submit }
}