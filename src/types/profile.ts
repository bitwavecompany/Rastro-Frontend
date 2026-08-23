export interface Profile {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  bio?: string
  roleToken: string
}

export type UpdateProfilePayload = Omit<Profile, 'id'>