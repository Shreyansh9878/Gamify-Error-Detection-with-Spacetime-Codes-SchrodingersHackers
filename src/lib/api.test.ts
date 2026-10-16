import { afterEach, expect, it, vi } from "vitest";
import { api } from "./api";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("uses the environment-selected API origin and preserves the request", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "/api/");
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ status: "ready" })));
  vi.stubGlobal("fetch", fetcher);
  await expect(api("health")).resolves.toEqual({ status: "ready" });
  expect(fetcher.mock.calls[0][0]).toBe("/api/health");
});
it("turns a cold-start timeout into a retry message", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")),
  );
  await expect(api("levels")).rejects.toThrow("please retry");
});
it("rejects a gateway HTML response instead of returning null to the game", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("starting", { status: 503 })),
  );
  await expect(api("levels")).rejects.toThrow("retry");
});
