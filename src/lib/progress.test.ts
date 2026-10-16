import { describe, it, expect } from "vitest";
import { initial, parseProgress, recordBest, missionUnlocked } from "./progress";
describe("local progression", () => {
  it("rejects corrupt or incompatible storage", () => {
    expect(parseProgress("broken")).toEqual(initial);
    expect(parseProgress('{"version":2}')).toEqual(initial);
  });
  it("preserves independent score and star records", () => {
    const first = recordBest(initial, 1, 850, 2);
    const second = recordBest(first, 1, 810, 3);
    expect(second.best[1]).toEqual({ score: 850, stars: 3 });
    expect(initial.best).toEqual({});
  });
  it("persists explicit tutorial bypass", () => {
    expect(
      parseProgress(JSON.stringify({ ...initial, tutorial: "skipped" }))
        .tutorial,
    ).toBe("skipped");
  });
  it("unlocks missions in order and retains an explicit expert bypass", () => {
    expect(missionUnlocked(initial, 1)).toBe(false);
    const ready = { ...initial, tutorial: "complete" as const };
    expect(missionUnlocked(ready, 1)).toBe(true);
    expect(missionUnlocked(ready, 2)).toBe(false);
    const won = recordBest(ready, 1, 660, 1);
    expect(missionUnlocked(won, 2)).toBe(true);
    expect(missionUnlocked(won, 3)).toBe(false);
    expect(missionUnlocked({ ...initial, tutorial: "skipped" }, 10)).toBe(true);
  });
});
