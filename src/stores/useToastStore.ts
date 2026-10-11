import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Toast, ToastType } from '@/types/toast'

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function add(message: string, type: ToastType = 'info', duration = 3500) {
    // Evitar stacking si el mensaje es exactamente igual al último
    const lastToast = toasts.value[toasts.value.length - 1]
    if (lastToast && lastToast.message === message && lastToast.type === type) {
      return
    }

    const id = Math.random().toString(36).substring(2, 9)
    const toast: Toast = { id, message, type, duration }
    
    toasts.value.push(toast)

    // Límite máximo en pantalla (máximo 3)
    if (toasts.value.length > 3) {
      toasts.value.shift()
    }

    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }
  }

  // Métodos de conveniencia (atajos)
  function success(message: string, duration?: number) { add(message, 'success', duration) }
  function error(message: string, duration?: number) { add(message, 'error', duration) }
  function info(message: string, duration?: number) { add(message, 'info', duration) }
  function warning(message: string, duration?: number) { add(message, 'warning', duration) }

  function remove(id: string) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  return { toasts, success, error, info, warning, remove }
})