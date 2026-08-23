<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: number | ''
    error?: string
    disabled?: boolean
    placeholder?: string
    min?: string
    step?: string
    focusClass?: string
  }>(),
  {
    placeholder: '0.00',
    min: '0.01',
    step: '0.01',
    focusClass: 'focus:ring-primary/100',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: number | '']
}>()

function handleInput(e: Event) {
  const val = (e.target as HTMLInputElement).valueAsNumber
  emit('update:modelValue', Number.isNaN(val) ? '' : val)
}
</script>

<template>
  <div>
    <div class="relative">
      <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs select-none">$</span>
      <input
        :value="modelValue"
        type="number"
        :step="step"
        :min="min"
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-full pl-6 pr-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400
               focus:outline-none focus:ring-2 focus:border-transparent
               disabled:bg-gray-50 disabled:text-gray-400 transition"
        :class="[focusClass, error ? 'border-danger/60 bg-danger/10' : 'border-gray-300']"
        @input="handleInput"
      />
    </div>
    <p v-if="error" class="mt-1 text-xs text-danger/80 leading-tight">{{ error }}</p>
  </div>
</template>