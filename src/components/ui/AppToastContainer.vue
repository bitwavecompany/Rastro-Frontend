<script setup lang="ts">
import { useToastStore } from '@/stores/useToastStore'

const toastStore = useToastStore()

function getIcon(type: string) {
  switch (type) {
    case 'success': return 'lucide:check-circle-2'
    case 'error': return 'lucide:alert-circle'
    case 'warning': return 'lucide:triangle-alert'
    default: return 'lucide:info'
  }
}

function getColorClass(type: string) {
  switch (type) {
    case 'success': return 'bg-income text-white'
    case 'error': return 'bg-danger text-white'
    case 'warning': return 'bg-yellow-500 text-white'
    default: return 'bg-gray-900 text-white' // info
  }
}
</script>

<template>
  <!-- 
    El pt-[max(env(safe-area-inset-top),1rem)] es la magia híbrida: 
    En web será 1rem (16px), pero en Capacitor bajará lo exacto para no chocar con la cámara o reloj.
  -->
  <div class="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex flex-col items-center sm:items-end sm:pr-6 pt-[max(env(safe-area-inset-top),1rem)] gap-2.5">
    <TransitionGroup 
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform -translate-y-4 sm:translate-y-0 sm:translate-x-4 opacity-0 scale-95"
      enter-to-class="transform translate-y-0 sm:translate-x-0 opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div 
        v-for="toast in toastStore.toasts" 
        :key="toast.id"
        class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg max-w-sm w-[calc(100%-2rem)] sm:w-auto cursor-pointer"
        :class="getColorClass(toast.type)"
        @click="toastStore.remove(toast.id)"
      >
        <Icon :icon="getIcon(toast.type)" class="w-5 h-5 shrink-0" />
        <p class="text-sm font-medium leading-tight flex-1">{{ toast.message }}</p>
        <button class="shrink-0 opacity-70 hover:opacity-100 transition-opacity p-1 -mr-1">
          <Icon icon="lucide:x" class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>