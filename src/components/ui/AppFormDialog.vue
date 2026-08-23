<script setup lang="ts">

withDefaults(
  defineProps<{
    open:           boolean
    title:          string
    confirmLabel?:  string
    cancelLabel?:   string
    loading?:       boolean
  }>(),
  {
    confirmLabel: 'Guardar',
    cancelLabel:  'Cancelar',
    loading:      false,
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm:       []
  cancel:        []
}>()

function handleConfirm() {
  emit('confirm')
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
            <div class="px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 class="text-sm font-semibold text-gray-900">{{ title }}</h3>
            </div>

            <div class="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <slot />
            </div>

            <div class="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end border-t border-gray-100 pt-4">
              <button
                @click="handleCancel"
                :disabled="loading"
                class="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium border border-gray-200
                       text-gray-600 hover:bg-gray-100 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ cancelLabel }}
              </button>
              <button
                @click="handleConfirm"
                :disabled="loading"
                class="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold transition-colors
                       bg-primary text-white hover:bg-primary/90 active:bg-primary/80
                       disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {{ loading ? 'Guardando…' : confirmLabel }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>