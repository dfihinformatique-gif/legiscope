export interface SigninPayload {
  pkceCodeVerifier: string
  state?: string
}

export interface SignoutPayload {
  redirectUrl: string
}

export interface User {
  email: string // "john@doe.com"
  email_verified: boolean
  family_name: string // "Doe"
  given_name: string // "John"
  last_name: string // "Doe"
  locale: string // "fr"
  name: string // "John Doe"
  preferred_username: string // "jdoe",
  roles?: string[] // [ "offline_access", "default-roles-leximpact", "uma_authorization" ],
  sub: string // "12345678-9abc-def0-1234-56789abcdef0"
}
