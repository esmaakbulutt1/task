import type { AuthTokens } from "@/types/auth.types";

const ACCESS_TOKEN_KEY = "taskflow.access_token";
const REFRESH_TOKEN_KEY = "taskflow.refresh_token";
const TOKEN_UPDATED_EVENT = "taskflow:tokens-updated";

function getStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function requireStorage(): Storage {
  const storage = getStorage();

  if (!storage) {
    throw new Error("Token depolama yalnızca tarayıcıda kullanılabilir.");
  }

  return storage;
}

export function saveTokens(tokens: AuthTokens): void {
  const storage = requireStorage();
  storage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  window.dispatchEvent(new Event(TOKEN_UPDATED_EVENT));
}

export function getAccessToken(): string | null {
  return getStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function getRefreshToken(): string | null {
  return getStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export function clearTokens(): void {
  const storage = getStorage();

  storage?.removeItem(ACCESS_TOKEN_KEY);
  storage?.removeItem(REFRESH_TOKEN_KEY);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TOKEN_UPDATED_EVENT));
  }
}

export function hasStoredSession(): boolean {
  return Boolean(getAccessToken() && getRefreshToken());
}

export function subscribeToTokens(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener(TOKEN_UPDATED_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(TOKEN_UPDATED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}
