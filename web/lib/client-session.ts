"use client";

import { getAccessToken } from "@/services/token.service";

export function requireAccessToken(): string {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error();
  }

  return accessToken;
}
