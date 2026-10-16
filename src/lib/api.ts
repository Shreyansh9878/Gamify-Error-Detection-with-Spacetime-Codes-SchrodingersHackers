// The backend admits one computation at a time. Serialize this tab's POSTs
// so automatic previews cannot collide with a player's explicit run.
let pending: Promise<void> = Promise.resolve();

export async function api<T>(path: string, body?: unknown): Promise<T> {
  if (body === undefined) return request<T>(path);
  const result = pending.then(() => request<T>(path, body));
  pending = result.then(
    () => {},
    () => {},
  );
  return result;
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api").replace(
    /\/$/,
    "",
  );
  let response: Response;
  try {
    response = await fetch(`${base}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name)
    )
      throw new Error(
        "The quantum engine took too long to respond. Your circuit is saved; please retry.",
      );
    throw new Error(
      "Cannot reach the quantum engine. It may be starting up; please retry shortly.",
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      data?.error?.message ||
        `Engine unavailable (${response.status}). Please retry shortly.`,
    );
  if (data === null)
    throw new Error(
      "The engine returned an incomplete response. Please retry.",
    );
  return data as T;
}
