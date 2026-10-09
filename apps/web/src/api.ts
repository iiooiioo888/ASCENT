const AUTH_TOKEN_KEY = "ascent.session.token";
const REFRESH_TOKEN_KEY = "ascent.session.refresh";

export function readAuthToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function writeAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function readRefreshToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function writeRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearRefreshToken(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearSessionTokens(): void {
  clearAuthToken();
  clearRefreshToken();
}

export class ApiError extends Error {
  readonly status: number;
  /** Machine-readable code when the API provides `body.code` (preferred for U1 stale detection). */
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type ApiInit = RequestInit & { skipAuthRetry?: boolean };

let refreshInFlight: Promise<boolean> | null = null;

function isAuthPath(path: string): boolean {
  return (
    path.startsWith("/api/v1/auth/login") ||
    path.startsWith("/api/v1/auth/register") ||
    path.startsWith("/api/v1/auth/refresh")
  );
}

async function tryRefreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = readRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearSessionTokens();
        return false;
      }
      const body = (await res.json()) as { token?: string; accessToken?: string; refreshToken?: string };
      const access = body.accessToken ?? body.token;
      if (!access) {
        clearSessionTokens();
        return false;
      }
      writeAuthToken(access);
      if (body.refreshToken) writeRefreshToken(body.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function api<T>(path: string, init?: ApiInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  const token = readAuthToken();
  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  const { skipAuthRetry, ...fetchInit } = init ?? {};
  const res = await fetch(path, {
    ...fetchInit,
    headers,
  });
  if (res.status === 401 && !skipAuthRetry && !isAuthPath(path)) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      return api<T>(path, { ...init, skipAuthRetry: true });
    }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message) ? body.message.join("；") : body.message;
    const code = typeof body.code === "string" ? body.code : undefined;
    throw new ApiError(String(msg ?? res.statusText), res.status, code);
  }
  return res.json() as Promise<T>;
}
