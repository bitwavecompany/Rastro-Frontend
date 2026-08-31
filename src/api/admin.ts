import api from './axios'

export const adminApi = {
  getUsers: () => api.get('/admin/users'),
  
  togglePlan: (id: string, payload: { plan: 'free' | 'premium', payment_method?: string, payment_bank?: string, payment_receipt?: string }) => 
    api.patch(`/admin/users/${id}/plan`, payload),
}