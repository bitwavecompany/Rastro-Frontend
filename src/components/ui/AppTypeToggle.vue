<script setup lang="ts" generic="T extends string">
withDefaults(
  defineProps<{
    modelValue: T
    options: { value: T; label: string; icon?: string }[]
    disabled?: boolean
    activeClass?: string
  }>(),
  {
    disabled: false,
    activeClass: 'bg-primary text-white',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()
</script>

<template>
  <div class="flex rounded-lg border border-gray-300 overflow-hidden divide-x divide-gray-300 text-sm">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :disabled="disabled"
      class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 font-medium transition-colors
             disabled:opacity-60 disabled:cursor-not-allowed"
      :class="modelValue === option.value ? activeClass : 'bg-white text-gray-600 hover:bg-gray-50'"
      @click="emit('update:modelValue', option.value)"
    >
      <Icon v-if="option.icon" :icon="option.icon" class="w-3.5 h-3.5 shrink-0" />
      {{ option.label }}
    </button>
  </div>
</template>