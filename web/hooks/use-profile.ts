"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { requireAccessToken } from "@/lib/client-session";
import { getErrorMessage } from "@/lib/errors";
import { showToast } from "@/components/ui/toast";
import { getProfile, updateProfile } from "@/services/auth.service";
import type {
  UpdateProfileRequest,
  UserProfile,
} from "@/types/auth.types";

export function useProfile() {
  const t = useTranslations("Feedback.profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadProfile = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      setProfile(await getProfile(requireAccessToken()));
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, t("loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    void getProfile(requireAccessToken())
      .then((response) => {
        if (!cancelled) {
          setProfile(response);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            getErrorMessage(requestError, t("loadFailed")),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  async function saveProfile(
    request: UpdateProfileRequest,
  ): Promise<boolean> {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateProfile(request, requireAccessToken());
      setProfile(updated);
      setSuccess(t("updateSuccess"));
      showToast(t("updateSuccess"), "success");
      return true;
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, t("updateFailed")));
      return false;
    } finally {
      setSaving(false);
    }
  }

  return {
    profile,
    loading,
    saving,
    error,
    success,
    saveProfile,
    loadProfile,
    resetFeedback: () => {
      setError(null);
      setSuccess(null);
    },
  };
}
