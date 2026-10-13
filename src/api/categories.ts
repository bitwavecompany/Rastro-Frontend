import api from './axios'
import type { TransactionCategoryItem } from '@/constants/categories'

export interface CategoriesResponse {
  success: boolean
  message: string
  data: TransactionCategoryItem[]
}

export const categoriesApi = {
  getAll: () => api.get<CategoriesResponse>('/categories'),
}
