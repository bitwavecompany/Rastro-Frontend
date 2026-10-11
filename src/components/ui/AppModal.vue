<script setup lang="ts">
import { watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'default' | 'danger' | 'warning'
    confirmDisabled?: boolean
    requireReason?: boolean
    reasonLabel?: string
    reasonPlaceholder?: string
  }>(),
  {
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    variant: 'default',
    requireReason: false,
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [reason?: string]
  cancel: []
}>()

import { ref } from 'vue'

const reason = ref('')
const reasonError = ref('')

watch(() => props.open, (val) => {
  if (val) {
    reason.value = ''
    reasonError.value = ''
  }
})

function handleConfirm() {
  if (props.requireReason && !reason.value.trim()) {
    reasonError.value = 'Este campo es obligatorio'
    return
  }
  emit('confirm', reason.value.trim() || undefined)
  emit('update:open', false)
}

function handleCancel() {
  emit('cancel')
  emit('update:open', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        @click.self="handleCancel"
      >
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="open"
            class="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
          >
            <div class="px-6 pt-6 pb-4">
              <div class="flex items-start gap-3">
                <div
                  v-if="variant === 'danger'"
                  class="w-9 h-9 rounded-xl bg-danger/20 flex items-center justify-center shrink-0"
                >
                  <Icon icon="lucide:triangle-alert" class="w-4 h-4 text-danger" />
                </div>
                <div
                  v-else-if="variant === 'warning'"
                  class="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0"
                >
                  <Icon icon="lucide:alert-circle" class="w-4 h-4 text-amber-600" />
                </div>
                <div
                  v-else
                  class="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0"
                >
                  <Icon icon="lucide:info" class="w-4 h-4 text-primary" />
                </div>
                <div class="flex-1 min-w-0 pt-0.5">
                  <h3 class="text-sm font-semibold text-gray-900">{{ title }}</h3>
                  <p v-if="description" class="mt-1 text-sm text-gray-500 leading-relaxed">
                    {{ description }}
                  </p>
                </div>
              </div>
            </div>

            <slot name="body" />

            <div v-if="requireReason" class="px-6 pb-4">
              <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                {{ reasonLabel ?? 'Motivo' }}
              </label>
              <input
                v-model="reason"
                type="text"
                :placeholder="reasonPlaceholder ?? ''"
                class="w-full px-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-primary/100 focus:border-transparent transition"
                :class="reasonError ? 'border-danger/60 bg-danger/10' : 'border-gray-300'"
              />
              <p v-if="reasonError" class="mt-1 text-xs text-danger/80">{{ reasonError }}</p>
            </div>

            <div class="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                @click="handleCancel"
                class="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium border border-gray-200
                       text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {{ cancelLabel }}
              </button>
              <button
                @click="handleConfirm"
                :disabled="confirmDisabled"
                class="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :class="variant === 'danger'
                  ? 'bg-danger text-white hover:bg-danger/90 active:bg-danger/80'
                  : variant === 'warning'
                    ? 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800'
                    : 'bg-primary text-white hover:bg-primary/90 active:bg-primary/80'"
              >
                {{ confirmLabel }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>