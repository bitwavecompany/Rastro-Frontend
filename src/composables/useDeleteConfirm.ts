import { ref, type Ref } from 'vue'

export function useDeleteConfirm<T>() {
  const isOpen = ref(false)
  const target = ref<T | null>(null) as Ref<T | null>

  function request(item: T) {
    target.value = item
    isOpen.value = true
  }

  function cancel() {
    target.value = null
    isOpen.value = false
  }

  return { isOpen, target, request, cancel }
}