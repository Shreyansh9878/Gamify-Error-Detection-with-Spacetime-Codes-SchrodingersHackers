import { describe, it, expect } from "vitest";
import {
  initial,
  parseProgress,
  recordBest,
  missionUnlocked,
  migrateProgress,
  MISSION_VERSION,
} from "./progress";
describe("local progression", () => {
  it("archives metric meaning by clearing old scores while preserving unlocks", () => {
    const legacy = {
      ...initial,
      tutorial: "complete" as const,
      missionVersion: 2 as const,
      best: { "1": { score: 800, stars: 3 }, "2": { score: 750, stars: 1 } },
    };
    const migrated = migrateProgress(legacy);
    expect(migrated.best).toEqual({});
    expect(migrated.missionVersion).toBe(MISSION_VERSION);
    expect(missionUnlocked(migrated, 3)).toBe(true);
    expect(missionUnlocked(migrated, 4)).toBe(false);
    expect(migrateProgress(migrated)).toEqual(migrated);
    expect(legacy.best["1"].score).toBe(800);
  });
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
