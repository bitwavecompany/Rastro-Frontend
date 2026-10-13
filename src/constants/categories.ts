export interface TransactionCategoryItem {
  id: string
  name: string
  icon: string
}

export const CATEGORY_IDS = [
  'comida',
  'transporte',
  'entretenimiento',
  'estudio',
  'trabajo',
  'otros',
] as const

export type CategoryId = typeof CATEGORY_IDS[number]

export const DEFAULT_CATEGORIES: TransactionCategoryItem[] = [
  { id: 'comida', name: 'Comida', icon: 'utensils' },
  { id: 'transporte', name: 'Transporte', icon: 'car' },
  { id: 'entretenimiento', name: 'Entretenimiento', icon: 'film' },
  { id: 'estudio', name: 'Estudio', icon: 'book-open' },
  { id: 'trabajo', name: 'Trabajo', icon: 'briefcase' },
  { id: 'otros', name: 'Otros', icon: 'more-horizontal' },
]

const ICON_MAP: Record<string, string> = {
  comida: 'lucide:utensils',
  transporte: 'lucide:car',
  entretenimiento: 'lucide:film',
  estudio: 'lucide:book-open',
  trabajo: 'lucide:briefcase',
  otros: 'lucide:more-horizontal',
}

const NAME_MAP: Record<string, string> = {
  comida: 'Comida',
  transporte: 'Transporte',
  entretenimiento: 'Entretenimiento',
  estudio: 'Estudio',
  trabajo: 'Trabajo',
  otros: 'Otros',
}

export function getCategoryIcon(categoryId?: string | null): string {
  if (!categoryId) return 'lucide:more-horizontal'
  return ICON_MAP[categoryId.toLowerCase()] || 'lucide:more-horizontal'
}

export function getCategoryName(categoryId?: string | null): string {
  if (!categoryId) return 'Otros'
  return NAME_MAP[categoryId.toLowerCase()] || categoryId
}
