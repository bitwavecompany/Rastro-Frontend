<script setup lang="ts">
import type { AccountFormData, AccountFormErrors } from '@/composables/useAccountForm'
import AppAmountInput from '@/components/ui/AppAmountInput.vue'
import AppTypeToggle from '@/components/ui/AppTypeToggle.vue'
import type { AccountType } from '@/constants/accounts'

const props = withDefaults(defineProps<{
  form: AccountFormData
  errors: AccountFormErrors
  isDefaultAccount?: boolean
  hasMovements?: boolean
}>(), {
  isDefaultAccount: false,
  hasMovements: false
})

const accountTypeOptions: { value: AccountType; label: string; icon: string }[] = [
  { value: 'cash', label: 'Efectivo', icon: 'lucide:banknote' },
  { value: 'bank', label: 'Banco',    icon: 'lucide:building-2' },
]
</script>

<template>
  <div>
    <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
      Nombre <span class="text-danger/60">*</span>
    </label>
    <input
      v-model="props.form.name"
      type="text"
      placeholder="Ej: Banco Pichincha"
      :disabled="isDefaultAccount"
      class="w-full px-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400
             focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent transition
             disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
      :class="props.errors.name ? 'border-danger/60 bg-danger/10' : 'border-gray-300'"
    />
    <p v-if="props.errors.name" class="mt-1 text-xs text-danger/80">{{ props.errors.name }}</p>
  </div>

  <div>
    <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
      Saldo inicial <span class="text-danger/60">*</span>
    </label>
    <AppAmountInput
      v-model="props.form.amount"
      :error="props.errors.amount"
      :disabled="isDefaultAccount"
      min="0"
    />
    <p v-if="isDefaultAccount" class="mt-1 text-[11px] text-gray-400">
      El saldo inicial de la cuenta Efectivo por defecto no puede modificarse.
    </p>
  </div>

  <div>
    <div class="flex items-center justify-between mb-1.5">
      <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</label>
      <span v-if="hasMovements && !isDefaultAccount" class="text-[10px] text-amber-600 font-medium">
        Actualizará método de sus movimientos
      </span>
    </div>
    <AppTypeToggle
      v-model="props.form.type"
      :options="accountTypeOptions"
      :disabled="isDefaultAccount"
    />
  </div>

  <div>
    <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Descripción</label>
    <input
      v-model="props.form.description"
      type="text"
      placeholder="Opcional"
      class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900
             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/100
             focus:border-transparent transition"
    />
  </div>
</template>