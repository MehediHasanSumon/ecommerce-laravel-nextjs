export type User = {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  roles: string[];
  permissions?: string[];
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type ApiValidationErrors = Record<string, string[]>;

export type ApiErrorPayload = {
  success?: boolean;
  message?: string;
  errors?: ApiValidationErrors;
};

export type AuthSession = {
  authenticated: boolean;
  has_access_token: boolean;
  user: User | null;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
};
