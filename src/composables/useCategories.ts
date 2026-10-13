import { ref } from 'vue'
import { categoriesApi } from '@/api/categories'
import { useSessionStore } from '@/stores/useSessionStore'
import {
  DEFAULT_CATEGORIES,
  getCategoryIcon,
  getCategoryName,
  type TransactionCategoryItem,
} from '@/constants/categories'

const categories = ref<TransactionCategoryItem[]>([...DEFAULT_CATEGORIES])
const isLoading = ref(false)
const isLoaded = ref(false)

export function useCategories() {
  const session = useSessionStore()

  async function fetchCategories(): Promise<void> {
    if (!session.isLoggedIn) return
    isLoading.value = true
    try {
      const response = await categoriesApi.getAll()
      if (response.data?.success && Array.isArray(response.data.data)) {
        categories.value = response.data.data
        isLoaded.value = true
      }
    } catch {
      // Offline fallback: keep DEFAULT_CATEGORIES
    } finally {
      isLoading.value = false
    }
  }

  return {
    categories,
    isLoading,
    isLoaded,
    fetchCategories,
    getCategoryIcon,
    getCategoryName,
  }
}
