import api from './axios'

export const adminApi = {
  getUsers: () => api.get('/admin/users'),

  getPremiumRequests: () => api.get('/admin/premium-requests'),

  approvePremiumRequest: (id: string) => api.post(`/admin/premium-requests/${id}/approve`),

  rejectPremiumRequest: (id: string, payload: { rejection_reason: string }) =>
    api.post(`/admin/premium-requests/${id}/reject`, payload),

  manualUpgrade: (userId: string, payload: { payment_notes: string }) =>
    api.post(`/admin/users/${userId}/manual-upgrade`, payload),

  togglePlan: (userId: string, payload: { plan: 'free' | 'premium'; payment_method?: string; payment_bank?: string; payment_receipt?: string }) =>
    api.patch(`/admin/users/${userId}/plan`, payload),
}