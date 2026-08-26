"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { requireAccessToken } from "@/lib/client-session";
import { getErrorMessage } from "@/lib/errors";
import {
  changePassword,
  forgotPassword as forgotPasswordRequest,
  getProfile,
  login,
  logout as logoutRequest,
  refresh as refreshRequest,
  register,
  resetPassword as resetPasswordRequest,
  updateProfile,
} from "@/services/auth.service";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "@/services/token.service";
import type {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  ProfileResponse,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
} from "@/types/auth.types";

export function useAuth() {
  const t = useTranslations("Feedback.auth");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function beginAction(): void {
    setLoading(true);
    setError(null);
    setSuccess(null);
  }

  function resetFeedback(): void {
    setError(null);
    setSuccess(null);
  }

  async function loginUser(request: LoginRequest): Promise<boolean> {
    beginAction();

    try {
      const response = await login({
        ...request,
        email: request.email.trim().toLowerCase(),
      });

      saveTokens(response);
      router.replace("/dashboard");
      return true;
    } catch (error: unknown) {
      setError(getErrorMessage(error, t("loginFailed")));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function registerUser(request: RegisterRequest): Promise<boolean> {
    beginAction();

    try {
      await register({
        ...request,
        email: request.email.trim().toLowerCase(),
        name: request.name.trim(),
        surname: request.surname.trim(),
      });

      router.replace("/login?registered=1");
      return true;
    } catch (error: unknown) {
      setError(getErrorMessage(error, t("registerFailed")));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile(): Promise<ProfileResponse | null> {
    beginAction();

    try {
      return await getProfile(requireAccessToken());
    } catch (error: unknown) {
      setError(getErrorMessage(error, t("profileLoadFailed")));
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function updateProfileUser(
    request: UpdateProfileRequest,
  ): Promise<ProfileResponse | null> {
    beginAction();

    try {
      if (Object.keys(request).length === 0) {
        throw new Error(t("noUpdateFields"));
      }

      const profile = await updateProfile(request, requireAccessToken());
      setSuccess(t("updateSuccess"));
      return profile;
    } catch (error: unknown) {
      setError(getErrorMessage(error, t("updateFailed")));
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function changePasswordUser(
    request: ChangePasswordRequest,
  ): Promise<boolean> {
    beginAction();

    try {
      await changePassword(request, requireAccessToken());
      clearTokens();
      router.replace("/login?passwordChanged=1");
      return true;
    } catch (error: unknown) {
      setError(getErrorMessage(error, t("passwordUpdateFailed")));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function forgotPasswordUser(
    request: ForgotPasswordRequest,
  ): Promise<boolean> {
    beginAction();

    try {
      const response = await forgotPasswordRequest({
        email: request.email.trim().toLowerCase(),
      });

      setSuccess(response.message);
      return true;
    } catch (error: unknown) {
      setError(
        getErrorMessage(error, t("resetLinkFailed")),
      );
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function resetPasswordUser(
    request: ResetPasswordRequest,
  ): Promise<boolean> {
    beginAction();

    try {
      await resetPasswordRequest({
        token: request.token.trim(),
        newPassword: request.newPassword,
      });

      router.replace("/login?passwordReset=1");
      return true;
    } catch (error: unknown) {
      setError(getErrorMessage(error, t("passwordResetFailed")));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function refreshSession(): Promise<string | null> {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearTokens();
      return null;
    }

    try {
      const tokens = await refreshRequest({ refreshToken });
      saveTokens(tokens);
      return tokens.access_token;
    } catch (error: unknown) {
      clearTokens();
      setError(getErrorMessage(error, t("sessionRefreshFailed")));
      return null;
    }
  }

  async function logoutUser(): Promise<void> {
    beginAction();
    const refreshToken = getRefreshToken();

    try {
      if (refreshToken) {
        await logoutRequest({ refreshToken });
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error, t("logoutFailed")));
    } finally {
      clearTokens();
      setLoading(false);
      router.replace("/login");
    }
  }

  function hasSession(): boolean {
    return Boolean(getAccessToken() && getRefreshToken());
  }

  return {
    loading,
    error,
    success,
    loginUser,
    registerUser,
    loadProfile,
    updateProfileUser,
    changePasswordUser,
    forgotPasswordUser,
    resetPasswordUser,
    refreshSession,
    logoutUser,
    hasSession,
    resetFeedback,
  };
}
