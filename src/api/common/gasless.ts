import { GASLESS_API_BASE_URL } from '../../config';
import { fetchJson } from '../../util/fetch';

// src/api/common/callGaslessPost.ts
export async function callGaslessPost<T = any>(path: string, data: AnyLiteral, options?: RequestInit): Promise<T> {
  const url = new URL(`${GASLESS_API_BASE_URL}${path}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // No custom headers like getBackendHeaders()
      ...(options?.headers || {}),
    },
    body: JSON.stringify(data),
    ...options,
  });

  if (!response.ok) {
    // Optionally, handle errors as you wish
    throw new Error(`Gasless API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function callGaslessGet<T = any>(path: string, data?: AnyLiteral, headers?: HeadersInit): Promise<T> {
  const url = new URL(`${GASLESS_API_BASE_URL}${path}`);
  return fetchJson(url, data, {
    headers: {
      ...headers,
    },
  });
}
