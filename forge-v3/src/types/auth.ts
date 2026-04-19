export interface AuthResponse {
  access_token: string
  token_type: string
  user_id: string
}

export interface AuthUser {
  id: string
  email: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}