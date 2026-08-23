<script setup lang="ts">
import type { AccountFormData, AccountFormErrors } from '@/composables/useAccountForm'
import AppAmountInput from '@/components/ui/AppAmountInput.vue'
import AppTypeToggle from '@/components/ui/AppTypeToggle.vue'
import type { AccountType } from '@/types/account'

const props = defineProps<{
  form: AccountFormData
  errors: AccountFormErrors
}>()

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
      class="w-full px-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400
             focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent transition"
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
      min="0"
    />
  </div>

  <div>
    <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Tipo</label>
    <AppTypeToggle
      v-model="props.form.type"
      :options="accountTypeOptions"
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