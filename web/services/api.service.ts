import {
  clearTokens,
  getRefreshToken,
  saveTokens,
} from "@/services/token.service";
import type { ApiErrorResponse } from "@/types/api.types";
import type { AuthTokens } from "@/types/auth.types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
).replace(/\/+$/, "");

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string;
};

export class ApiError extends Error {
  readonly kind: "network" | "validation" | "api";

  constructor(
    message: string,
    readonly statusCode: number,
    readonly details?: ApiErrorResponse,
  ) {
    super(message);
    this.name = "ApiError";
    this.kind =
      statusCode === 0
        ? "network"
        : statusCode === 400 || statusCode === 422
          ? "validation"
          : "api";
  }
}

let refreshPromise: Promise<AuthTokens | null> | null = null;

function getErrorMessage(data: unknown, fallback: string): string {
  if (typeof data !== "object" || data === null || !("message" in data)) {
    return fallback;
  }

  const message = data.message;

  if (Array.isArray(message)) {
    return message
      .filter((item): item is string => typeof item === "string")
      .join(" ");
  }

  return typeof message === "string" ? message : fallback;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const responseText = await response.text();
  if (!responseText) return undefined;

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
}

function isAuthTokens(value: unknown): value is AuthTokens {
  return (
    typeof value === "object" &&
    value !== null &&
    "access_token" in value &&
    typeof value.access_token === "string" &&
    "refresh_token" in value &&
    typeof value.refresh_token === "string"
  );
}

async function renewTokens(): Promise<AuthTokens | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await parseResponse(response);

    if (!response.ok || !isAuthTokens(data)) {
      clearTokens();
      return null;
    }

    saveTokens(data);
    return data;
  } catch {
    clearTokens();
    return null;
  }
}

async function getRenewedTokens(): Promise<AuthTokens | null> {
  if (!refreshPromise) {
    refreshPromise = renewTokens().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, token, headers: customHeaders, ...requestOptions } = options;
  const requestHeaders = new Headers(customHeaders);
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  if (
    body !== undefined &&
    !isFormData &&
    !requestHeaders.has("Content-Type")
  ) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;
  const requestBody =
    body === undefined
      ? undefined
      : isFormData
        ? body
        : JSON.stringify(body);
  const performRequest = (): Promise<Response> =>
    fetch(`${API_BASE_URL}${normalizedEndpoint}`, {
      ...requestOptions,
      headers: requestHeaders,
      body: requestBody,
    });

  let response: Response;

  try {
    response = await performRequest();
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new ApiError("Sunucuya ulaşılamadı.", 0);
  }

  if (response.status === 401 && token) {
    const renewedTokens = await getRenewedTokens();

    if (renewedTokens) {
      requestHeaders.set(
        "Authorization",
        `Bearer ${renewedTokens.access_token}`,
      );

      try {
        response = await performRequest();
      } catch {
        throw new ApiError("Sunucuya ulaşılamadı.", 0);
      }
    }
  }

  const responseData = await parseResponse(response);

  if (!response.ok) {
    const details =
      typeof responseData === "object" && responseData !== null
        ? (responseData as ApiErrorResponse)
        : undefined;

    throw new ApiError(
      getErrorMessage(
        responseData,
        response.statusText || `İstek başarısız: ${response.status}`,
      ),
      response.status,
      details,
    );
  }

  return responseData as T;
}
