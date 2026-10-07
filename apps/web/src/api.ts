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

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message) ? body.message.join("；") : body.message;
    const code = typeof body.code === "string" ? body.code : undefined;
    throw new ApiError(String(msg ?? res.statusText), res.status, code);
  }
  return res.json() as Promise<T>;
}
