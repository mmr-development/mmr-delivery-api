export type SignInMethod = PasswordSignInMethod

export interface PasswordSignInMethod {
  email: string
  password: string
  client_id?: string
}

export interface PasswordUpdate {
  password: string
}
