import { apiRequest } from "@/services/api.service";

import type {
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshResponse,
  LogoutResponse,
  RegisterResponse,
  ProfileResponse,
  ChangePasswordResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from "@/types/auth.types";

export function login(
  request: LoginRequest,
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: request,
  });
}

export function refresh(
  request: RefreshTokenRequest,
): Promise<RefreshResponse> {
  return apiRequest<RefreshResponse>("/auth/refresh", {
    method: "POST",
    body: request,
  });
}

export function logout(
  request: RefreshTokenRequest,
): Promise<LogoutResponse> {
  return apiRequest<LogoutResponse>("/auth/logout", {
    method: "POST",
    body: request,
  });
}

export function register(
  request: RegisterRequest,
): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    body: request,
  });
}

export function updateProfile(
  request: UpdateProfileRequest,
  accessToken: string,
): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>("/auth/profile", {
    method: "PATCH",
    body: request,
    token: accessToken,
  });
}

export function getProfile(accessToken: string): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>("/auth/profile", {
    method: "GET",
    token: accessToken,
  });
}

export function changePassword(
  request: ChangePasswordRequest,
  accessToken: string,
): Promise<ChangePasswordResponse> {
  return apiRequest<ChangePasswordResponse>("/auth/password", {
    method: "PATCH",
    body: request,
    token: accessToken,
  });
}

export function forgotPassword(
  request: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse> {
  return apiRequest<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    body: request,
  });
}

export function resetPassword(
  request: ResetPasswordRequest,
): Promise<ResetPasswordResponse> {
  return apiRequest<ResetPasswordResponse>("/auth/reset-password", {
    method: "POST",
    body: request,
  });
}
