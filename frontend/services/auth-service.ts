import { apiClient } from "@/lib/api-client";
import type {
  ApiEnvelope,
  AuthSession,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  User,
} from "@/types/auth";

type AuthData = {
  user: User;
};

export const authService = {
  async login(payload: LoginPayload) {
    const { data } = await apiClient.post<ApiEnvelope<AuthData>>("/login", payload);
    return data.data.user;
  },

  async register(payload: RegisterPayload) {
    const { data } = await apiClient.post<ApiEnvelope<AuthData>>("/register", payload);
    return data.data.user;
  },

  async session() {
    const { data } = await apiClient.get<ApiEnvelope<AuthSession>>("/session");
    return data.data;
  },

  async me() {
    const { data } = await apiClient.get<ApiEnvelope<AuthData>>("/me");
    return data.data.user;
  },

  async logout() {
    await apiClient.post<ApiEnvelope<Record<string, never>>>("/logout");
  },

  async forgotPassword(payload: ForgotPasswordPayload) {
    const { data } = await apiClient.post<ApiEnvelope<Record<string, never>>>(
      "/forgot-password",
      payload,
    );
    return data.message;
  },

  async resetPassword(payload: ResetPasswordPayload) {
    const { data } = await apiClient.post<ApiEnvelope<Record<string, never>>>(
      "/reset-password",
      payload,
    );
    return data.message;
  },
};
