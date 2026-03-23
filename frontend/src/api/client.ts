const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
};

/**
 * Fetch wrapper that always targets the backend API.
 *
 * @example
 * const data = await apiFetch<{ result: string }>('/example', {
 *   method: 'POST',
 *   body: { userInput: 'Hello!' },
 * });
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText })) as { error: string };
    throw new Error(error.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}
