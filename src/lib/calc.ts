import { EFFICIENCY, type Hardware } from "./hardware.ts";
import type { ModelPreset, QuantKey } from "./models.ts";
import { QUANT_OPTIONS } from "./models.ts";

export const SYSTEM_OVERHEAD = 1.2;

export function bytesForQuant(key: QuantKey): number {
  return QUANT_OPTIONS.find((q) => q.key === key)?.bytes ?? 0.5;
}

export function weightGB(paramsB: number, bytes: number): number {
  return paramsB * bytes;
}

export function decodeWorkload(
  paramsB: number,
  bytes: number,
  context: number,
  preset?: ModelPreset,
  batch = 1,
  kvBytes = 2,
  utilization = 0.8,
) {
  const weights = weightGB(paramsB, bytes);
  const active = preset?.activeB ?? paramsB;
  // Keep a clearly identified heuristic for custom and older presets.
  let cache = paramsB * 0.0025 * (context / 1024) * kvBytes;
  let attentionGflops = 0;
  if (preset?.attention) {
    cache = preset.stateGB ?? 0;
    for (const group of preset.attention) {
      const positions = group.layers * Math.min(context, group.window ?? context);
      cache += (2 * positions * group.kvHeads * group.dim * kvBytes) / 1e9;
      attentionGflops += (4 * positions * group.heads * group.dim) / 1e9;
    }
  }
  // Per synchronous decode step. For MoE assume distinct experts until all weights are read.
  const traffic = Math.min(weights, active * bytes * batch) + cache * batch;
  const gflops = (2 * active + attentionGflops) * batch;
  return {
    weights,
    kv: cache * batch,
    required: (weights + cache * batch) * SYSTEM_OVERHEAD,
    traffic,
    gflops,
    batch,
    utilization,
  };
}

export type Workload = ReturnType<typeof decodeWorkload>;

export function decodeLimits(hw: Hardware, work: Workload) {
  const memory = memoryCeilingToks(
    hw.bandwidth,
    work.traffic,
    EFFICIENCY[hw.vendor] * work.utilization,
  );
  const compute = hw.tflops > 0 ? (hw.tflops * 1000 * work.utilization) / work.gflops : Infinity;
  return { memory, compute, speed: Number(Math.min(memory, compute).toPrecision(3)) };
}

export function tokensPerSec(hw: Hardware, work: Workload): number {
  return decodeLimits(hw, work).speed;
}

export function memoryCeilingToks(
  bandwidth: number,
  modelWeightGB: number,
  efficiency = 1,
): number {
  if (!bandwidth || !modelWeightGB) return 0;
  return (bandwidth / modelWeightGB) * efficiency;
}

/** Crête du GPU (FLOPs/octet) : au-dessus, borné calcul ; en-dessous, borné mémoire. */
export function ridgePoint(tflops: number, bandwidth: number): number {
  if (!bandwidth) return 0;
  return (tflops * 1000) / bandwidth;
}

export function generationSeconds(toksPerSec: number, tokenCount: number): number {
  if (!toksPerSec) return Infinity;
  return tokenCount / toksPerSec;
}

export function theoreticalTflops(cores: number, ghz: number): number {
  if (!cores || !ghz) return 0;
  return (cores * ghz * 2) / 1000;
}

export function valueScore(toks: number, price: number): number {
  return price > 0 ? toks / price : 0;
}

export function vramFits(hw: Hardware, required: number): boolean {
  const reserve = hw.vendor === "apple" || hw.id === "strix-halo-128" ? 4 : 0;
  return hw.vram - reserve + 1e-6 >= required;
}

export type SlotId = "A" | "B" | "C";

export type SlotAnalysis = {
  id: SlotId;
  data: Hardware;
  speed: number;
  valScore: number;
  fits: boolean;
  memoryToks: number;
  computeToks: number;
  memoryBound: boolean;
  intensityHeadroom: number;
};

export type ComparisonResult = {
  slots: SlotAnalysis[];
  winner: SlotAnalysis | null;
  bestValue: SlotAnalysis | null;
};

export function compareSlots(
  slotA: Hardware,
  slotB: Hardware,
  slotC: Hardware,
  work: Workload,
): ComparisonResult {
  const slots: SlotAnalysis[] = (["A", "B", "C"] as const).map((id) => {
    const data = id === "A" ? slotA : id === "B" ? slotB : slotC;
    const { speed, compute: computeToks, memory } = decodeLimits(data, work);
    const fits = vramFits(data, work.required);
    const memoryBound = memory <= computeToks;
    const intensityHeadroom = memory > 0 ? computeToks / memory : 0;
    return {
      id,
      data,
      speed,
      valScore: valueScore(speed, data.priceNum),
      fits,
      memoryToks: memory,
      computeToks,
      memoryBound,
      intensityHeadroom,
    };
  });

  const valid = slots.filter((s) => s.fits);
  if (valid.length === 0) {
    return { slots, winner: null, bestValue: null };
  }

  const winner = [...valid].sort((x, y) => y.speed - x.speed)[0] ?? null;
  const bestValue =
    valid.filter((s) => s.data.priceNum > 0).sort((x, y) => y.valScore - x.valScore)[0] ?? null;

  return { slots, winner, bestValue };
}
