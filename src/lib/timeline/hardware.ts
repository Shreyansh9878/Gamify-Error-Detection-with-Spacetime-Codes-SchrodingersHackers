import { z } from "zod";
export const hardwareSchema = z
  .object({
    enabled: z.boolean(),
    bitFlip: z.number().min(0).max(1),
    phaseFlip: z.number().min(0).max(1),
    depolarizing: z.number().min(0).max(1),
    relaxationTimeUs: z.number().min(0).max(120),
    t1Us: z.number().min(20).max(200),
    t2Us: z.number().positive().max(400),
  })
  .strict()
  .refine((v) => v.t2Us <= 2 * v.t1Us, "T2 must be at most 2T1.");
export type Hardware = z.infer<typeof hardwareSchema>;
export const initialHardware: Hardware = {
  enabled: true,
  bitFlip: 0.025,
  phaseFlip: 0.01,
  depolarizing: 0,
  relaxationTimeUs: 0,
  t1Us: 100,
  t2Us: 80,
};
