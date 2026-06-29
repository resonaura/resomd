const API_URL =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_PDF_SERVER_URL ??
  'http://localhost:3004';

// Central auth service — login, registration, and profile management
// happen there. The resomd web app relies on the shared `rsnra_session`
// cookie (same domain in prod, same localhost in dev) instead of a local
// token.
export const AUTH_API_URL =
  import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:2998';

export const AUTH_WEB_URL =
  import.meta.env.VITE_AUTH_WEB_URL ?? 'http://localhost:2999';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  // Only declare a JSON content type when there is an actual request body.
  // Fastify rejects bodyless requests (e.g. DELETE) that advertise a JSON
  // content-type with a 400 "Body cannot be empty" error.
  if (options.body != null) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}/v1${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      (body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : null) ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  // Some endpoints (e.g. DELETE) return 200 with an empty body. Parsing
  // that as JSON throws, so treat an empty/missing body as no content.
  const text = await response.text();
  if (text.length === 0) return undefined as T;
  return JSON.parse(text) as T;
}
