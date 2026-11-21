import { z } from "zod";

const amount = z.number().nonnegative().max(1e15);
const percent = z.number().min(0).max(100);
export const networkSchema = z.object({
  height: z.number().int().nonnegative(),
  difficulty: amount.positive(),
  eur: amount.positive(),
  feeBtc: amount,
  blockTime: z.number().int().positive(),
  priceTime: z.number().int().positive(),
  samples: z.number().int().positive(),
  edited: z.boolean(),
});
export type Network = z.infer<typeof networkSchema>;
export const snapshot: Network = {
  height: 976959,
  difficulty: 134823837323272.7,
  eur: 54788,
  feeBtc: 0.018170642666666667,
  blockTime: 1795301174,
  priceTime: 1795302302,
  samples: 15,
  edited: false,
};

export const presets = [
  { name: "Antminer S21 Pro", th: 234, watts: 3510, source: "31321354157593" },
  { name: "Antminer S21", th: 200, watts: 3500, source: "23794895251609" },
  { name: "Antminer S19j Pro", th: 100, watts: 2950, source: "4403541716761" },
];
const rigSchema = z.object({
  preset: z.number().int().min(0).max(2),
  name: z.string().max(100),
  th: amount,
  watts: amount,
  quantity: z.number().int().min(1).max(100000),
  measured: z.boolean(),
  accepted: z.boolean(),
  cooling: amount,
  purchase: amount,
  install: amount,
  hosting: amount,
  included: z.boolean(),
});
export type Rig = z.infer<typeof rigSchema>;
export function rigPreset(index: number): Rig {
  const { name, th, watts } = presets[index];
  return {
    preset: index,
    name,
    th,
    watts,
    quantity: 1,
    measured: false,
    accepted: false,
    cooling: 0,
    purchase: 0,
    install: 0,
    hosting: 0,
    included: false,
  };
}

const settingsSchema = z.object({
  payout: z.enum(["FPPS", "PPS", "PPLNS"]),
  pool: percent,
  rejects: percent,
  uptime: percent,
  tariff: z.enum(["flat", "split"]),
  rate: amount,
  peakRate: amount,
  offRate: amount,
  peakHours: z.number().min(0).max(24),
  offHours: z.number().min(0).max(24),
});
export type Settings = z.infer<typeof settingsSchema>;
export const initialSettings: Settings = {
  payout: "FPPS",
  pool: 2,
  rejects: 0.5,
  uptime: 98,
  tariff: "flat",
  rate: 0.2,
  peakRate: 0.25,
  offRate: 0.16,
  peakHours: 16,
  offHours: 8,
};
export const scenarioSchema = z.object({
  network: networkSchema,
  settings: settingsSchema,
  rigs: z.array(rigSchema).length(3),
});
export type Scenario = z.infer<typeof scenarioSchema>;
export const initialScenario: Scenario = {
  network: snapshot,
  settings: initialSettings,
  rigs: presets.map((_, i) => rigPreset(i)),
};

export function miningResult(r: Rig, s: Settings, n: Network) {
  // Schedule is the actual number of hours run in each tariff band per day.
  const hours = s.peakHours + s.offHours;
  if (hours > 24) return null;
  const online = s.uptime / 100;
  const kw = ((r.watts + r.cooling) * r.quantity) / 1000;
  const energy = kw * hours * online;
  const electricity = r.included
    ? 0
    : kw *
      online *
      (s.tariff === "flat" ? hours * s.rate : s.peakHours * s.peakRate + s.offHours * s.offRate);
  // Accepted TH/s is already averaged over a full calendar day.
  const effectiveTH =
    r.th * r.quantity * (r.accepted ? 1 : (hours / 24) * online * (1 - s.rejects / 100));
  if (r.accepted && effectiveTH > 0 && hours * online === 0) return null;
  const blocks = (effectiveTH * 1e12 * 86400) / (n.difficulty * 2 ** 32);
  // Next block's subsidy, truncated to integer satoshis as in Bitcoin Core.
  const subsidy = Math.floor(5e9 / 2 ** Math.floor((n.height + 1) / 210000)) / 1e8;
  const btc = blocks * (subsidy + (s.payout === "PPS" ? 0 : n.feeBtc)) * (1 - s.pool / 100);
  const revenue = btc * n.eur;
  const fixed = r.hosting * r.quantity;
  const margin = revenue - electricity - fixed;
  const capex = (r.purchase + r.install) * r.quantity;
  return {
    effectiveTH,
    energy,
    electricity,
    btc,
    revenue,
    margin,
    capex,
    breakEven: r.included || energy === 0 ? null : (revenue - fixed) / energy,
    payback: capex > 0 && margin > 0 ? capex / margin : null,
  };
}

const blocksSchema = z
  .array(
    z.object({
      height: z.number().int().nonnegative(),
      timestamp: z.number().int().positive(),
      difficulty: amount.positive(),
      extras: z.object({ totalFees: amount }),
    }),
  )
  .nonempty();
export function networkSnapshot(blockData: unknown, priceData: unknown): Network {
  const blocks = blocksSchema.parse(blockData);
  const price = z
    .object({ EUR: amount.positive(), time: z.number().int().positive() })
    .parse(priceData);
  const tip = blocks[0];
  return {
    height: tip.height,
    difficulty: tip.difficulty,
    eur: price.EUR,
    feeBtc: blocks.reduce((sum, b) => sum + b.extras.totalFees, 0) / blocks.length / 1e8,
    blockTime: tip.timestamp,
    priceTime: price.time,
    samples: blocks.length,
    edited: false,
  };
}
