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

it("serializes previews and runs without blocking read-only health requests", async () => {
  let finishPreview!: (response: Response) => void;
  const fetcher = vi.fn().mockImplementation((url: string) =>
    url.endsWith("/preview")
      ? new Promise<Response>((resolve) => {
          finishPreview = resolve;
        })
      : Promise.resolve(new Response(JSON.stringify({ status: "ready" }))),
  );
  vi.stubGlobal("fetch", fetcher);
  const preview = api("preview", { circuit: 1 });
  const run = api("run", { circuit: 1 });
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  await expect(api("health")).resolves.toEqual({ status: "ready" });
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
    "/api/preview",
    "/api/health",
  ]);
  finishPreview(new Response(JSON.stringify({ preview: true })));
  await expect(preview).resolves.toEqual({ preview: true });
  await expect(run).resolves.toEqual({ status: "ready" });
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
    "/api/preview",
    "/api/health",
    "/api/run",
  ]);
});

it("releases the POST queue after an error so the next run still executes", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Invalid preview" } }), {
        status: 422,
      }),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify({ passed: true })));
  vi.stubGlobal("fetch", fetcher);
  const preview = api("preview", { circuit: 1 });
  const run = api("run", { circuit: 2 });
  await expect(preview).rejects.toThrow("Invalid preview");
  await expect(run).resolves.toEqual({ passed: true });
  expect(fetcher).toHaveBeenCalledTimes(2);
});
