export type PlanType = 'guest' | 'free' | 'premium'
export type UserRole = 'client' | 'admin'
export type PaymentMethod = 'cash' | 'transfer'
export type PremiumRequestStatus = 'pending_verification' | 'approved' | 'rejected'

export interface Profile {
  id: string
  name: string
  alias?: string | null
  email: string | null
  plan: PlanType
  role?: UserRole
  payment_method?: PaymentMethod | null
  payment_bank?: string | null
  payment_receipt?: string | null
  subscription_expires_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface PremiumRequest {
  id: string
  user_id: string
  status: PremiumRequestStatus
  payment_method: PaymentMethod
  origin_bank: string | null
  transfer_receipt: string | null
  payment_notes: string | null
  rejection_reason: string | null
  payment_verified_by: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
  user?: Profile | null
}

export type UpdateProfilePayload = {
  name: string
}