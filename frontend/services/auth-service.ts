import { apiClient } from "@/lib/api-client";
import { marketingEventHeaders, marketingTracker } from "@/lib/marketing-tracker";
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
    const eventId = marketingTracker.createEventId("login");
    const { data } = await apiClient.post<ApiEnvelope<AuthData>>("/login", payload, {
      headers: marketingEventHeaders(eventId),
    });
    marketingTracker.track("login", {}, { eventId, serverMirror: false, serverTracked: true });
    return data.data.user;
  },

  async register(payload: RegisterPayload) {
    const eventId = marketingTracker.createEventId("complete-registration");
    const { data } = await apiClient.post<ApiEnvelope<AuthData>>("/register", payload, {
      headers: marketingEventHeaders(eventId),
    });
    marketingTracker.track("complete_registration", {}, { eventId, serverMirror: false, serverTracked: true });
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
    const eventId = marketingTracker.createEventId("logout");
    await apiClient.post<ApiEnvelope<Record<string, never>>>("/logout", undefined, {
      headers: marketingEventHeaders(eventId),
    });
    marketingTracker.track("logout", {}, { eventId, serverMirror: false, serverTracked: true });
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
