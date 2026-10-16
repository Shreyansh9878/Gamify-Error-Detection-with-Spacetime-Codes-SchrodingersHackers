import { expect, it } from "vitest";
import { readDeepLink } from "./location";
it("accepts every level link and rejects ambiguous or invalid links", () => {
  for (let i = 1; i <= 6; i++)
    expect(readDeepLink(`?school=${i}`)).toEqual({ kind: "school", id: i });
  for (let i = 1; i <= 10; i++)
    expect(readDeepLink(`?mission=${i}`)).toEqual({ kind: "mission", id: i });
  for (const value of [
    "?school=7",
    "?mission=0",
    "?mission=1&school=1",
    "?mission=x",
  ])
    expect(readDeepLink(value)).toBeNull();
});
