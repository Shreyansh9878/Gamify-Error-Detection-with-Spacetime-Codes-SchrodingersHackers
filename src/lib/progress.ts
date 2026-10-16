import { z } from "zod";
const schema = z.object({
  version: z.literal(2),
  tutorial: z.enum(["new", "complete", "skipped"]),
  step: z.number().int().min(0).max(5),
  sound: z.boolean(),
  missionVersion: z
    .union([z.literal(1), z.literal(2), z.literal(3)])
    .optional(),
  unlockedThrough: z.number().int().min(1).max(10).optional(),
  best: z.record(
    z.string(),
    z.object({
      score: z.number().int().min(0).max(1000),
      stars: z.number().int().min(0).max(3),
    }),
  ),
});
export type Progress = z.infer<typeof schema>;
export const initial: Progress = {
  version: 2,
  tutorial: "new",
  step: 0,
  sound: false,
  best: {},
};
export const STORAGE_KEY = "quantum-shield-qed-v2";
export function parseProgress(raw: string | null): Progress {
  try {
    return schema.parse(JSON.parse(raw || "null"));
  } catch {
    return structuredClone(initial);
  }
}
export function recordBest(
  progress: Progress,
  id: number,
  score: number,
  stars: number,
): Progress {
  const old = progress.best[id];
  return {
    ...progress,
    best: {
      ...progress.best,
      [id]: {
        score: Math.max(old?.score || 0, score),
        stars: Math.max(old?.stars || 0, stars),
      },
    },
  };
}

export const MISSION_VERSION = 3;
export function migrateProgress(p: Progress): Progress {
  if (p.missionVersion === MISSION_VERSION) return p;
  const passed = Object.entries(p.best)
    .filter(([, result]) => result.stars > 0)
    .map(([id]) => +id + 1);
  return {
    ...p,
    best: {},
    missionVersion: MISSION_VERSION,
    unlockedThrough: Math.min(
      10,
      Math.max(p.unlockedThrough || 1, ...passed.filter(Number.isFinite)),
    ),
  };
}
export function missionUnlocked(p: Progress, id: number): boolean {
  return (
    p.tutorial === "skipped" ||
    (p.tutorial === "complete" &&
      (id <= (p.unlockedThrough || 1) || (p.best[id - 1]?.stars || 0) > 0))
  );
}
