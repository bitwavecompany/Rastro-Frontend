export interface Profile {
  id: string
  name: string
  email: string
  roleToken: string
}

export type UpdateProfilePayload = Omit<Profile, 'id'>