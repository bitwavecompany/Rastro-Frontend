<script setup lang="ts">
import AppFormDialog from '@/components/ui/AppFormDialog.vue'
import AppAmountInput from '@/components/ui/AppAmountInput.vue'
import AppTypeToggle from '@/components/ui/AppTypeToggle.vue'
import type { useMovementForm } from '@/composables/useMovementForm'
import type { PaymentMethod } from '@/constants/transactions'

defineProps<{
  movementForm: ReturnType<typeof useMovementForm>
  accountType?: 'cash' | 'bank'
}>()

const paymentOptions: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Efectivo', icon: 'lucide:banknote' },
  { value: 'transfer', label: 'Transferencia', icon: 'lucide:arrow-right-left' },
]
</script>

<template>
  <AppFormDialog
    :open="movementForm.isOpen.value"
    :title="movementForm.editingType() === 'income' ? 'Editar ingreso' : 'Editar gasto'"
    @confirm="movementForm.submit()"
    @cancel="movementForm.close()"
    @update:open="val => !val && movementForm.close()"
  >
    <div>
      <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
        Monto <span class="text-danger/60">*</span>
      </label>
      <AppAmountInput
        v-model="movementForm.form.amount"
        :error="movementForm.errors.amount"
      />
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
        Razón <span class="text-danger/60">*</span>
      </label>
      <input
        v-model="movementForm.form.reason"
        type="text"
        placeholder="Razón"
        class="w-full px-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent transition"
        :class="movementForm.errors.reason ? 'border-danger/60 bg-danger/10' : 'border-gray-300'"
      />
      <p v-if="movementForm.errors.reason" class="mt-1 text-xs text-danger/80">
        {{ movementForm.errors.reason }}
      </p>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
        Tipo de pago
      </label>
      <AppTypeToggle
        v-model="movementForm.form.payment_method"
        :options="paymentOptions"
        :disabled="true"
      />
      <p class="mt-1 text-[11px] text-gray-400">
        El método de pago corresponde al tipo de esta cuenta ({{ accountType === 'cash' ? 'Efectivo' : 'Banco' }}).
      </p>
    </div>

    <div>
      <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
        Descripción
      </label>
      <input
        v-model="movementForm.form.description"
        type="text"
        placeholder="Opcional"
        class="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent transition"
      />
    </div>
  </AppFormDialog>
</template>
