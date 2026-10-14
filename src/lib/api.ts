export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      data?.error?.message ||
        `Engine unavailable (${response.status}). Start the Python service and retry.`,
    );
  return data as T;
}
