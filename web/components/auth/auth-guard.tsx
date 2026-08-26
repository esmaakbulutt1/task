"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useSyncExternalStore } from "react";

import LoadingState from "@/components/ui/loading-state";
import { useRouter } from "@/i18n/navigation";
import {
  hasStoredSession,
  subscribeToTokens,
} from "@/services/token.service";

type AuthGuardProps = {
  children: ReactNode;
};

function subscribeToClient(): () => void {
  return () => undefined;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const isClient = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );
  const hasSession = useSyncExternalStore(
    subscribeToTokens,
    hasStoredSession,
    () => false,
  );

  useEffect(() => {
    if (isClient && !hasSession) {
      router.replace("/login");
    }
  }, [hasSession, isClient, router]);

  if (!isClient || !hasSession) {
    return (
      <LoadingState
        message={t("checkingSession")}
        className="min-h-svh"
      />
    );
  }

  return children;
}
