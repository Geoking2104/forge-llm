import { EFFICIENCY, type Hardware } from "./hardware";
import type { QuantKey } from "./models";
import { QUANT_OPTIONS } from "./models";

export const SYSTEM_OVERHEAD = 1.2;

export function bytesForQuant(key: QuantKey): number {
  return QUANT_OPTIONS.find((q) => q.key === key)?.bytes ?? 0.5;
}

export function weightGB(paramsB: number, bytes: number): number {
  return paramsB * bytes;
}

/** KV-cache approximatif (GQA type Llama) : ~0,0025 Go / milliard de params / 1k tokens / octet. */
export function kvCacheGB(paramsB: number, context: number, bytes: number): number {
  return paramsB * 0.0025 * (context / 1024) * bytes;
}

export function requiredVramGB(
  paramsB: number,
  bytes: number,
  context: number,
  overhead = SYSTEM_OVERHEAD,
): number {
  return (weightGB(paramsB, bytes) + kvCacheGB(paramsB, bytes, context)) * overhead;
}

export function tokensPerSec(hw: Hardware, modelWeightGB: number): number {
  if (!hw.bandwidth || !modelWeightGB) return 0;
  const eff = EFFICIENCY[hw.vendor] ?? 1;
  return Math.round(memoryCeilingToks(hw.bandwidth, modelWeightGB, eff));
}

/** Décodage dense : ~2 FLOPs par paramètre et par token généré. */
export function flopsPerToken(paramsB: number): number {
  return 2 * paramsB * 1e9;
}

export function memoryCeilingToks(bandwidth: number, modelWeightGB: number, efficiency = 1): number {
  if (!bandwidth || !modelWeightGB) return 0;
  return (bandwidth / modelWeightGB) * efficiency;
}

export function computeCeilingToks(tflops: number, paramsB: number): number {
  if (!tflops || !paramsB) return 0;
  return (tflops * 1e12) / flopsPerToken(paramsB);
}

/** Intensité arithmétique du décodage : 2 FLOPs par octet de poids lu. */
export function arithmeticIntensity(bytesPerParam: number): number {
  return 2 / Math.max(bytesPerParam, 0.05);
}

/** Crête du GPU (FLOPs/octet) : au-dessus, borné calcul ; en-dessous, borné mémoire. */
export function ridgePoint(tflops: number, bandwidth: number): number {
  if (!bandwidth) return 0;
  return (tflops * 1000) / bandwidth;
}

export function isMemoryBound(hw: Hardware, paramsB: number, modelWeightGB: number): boolean {
  const mem = memoryCeilingToks(hw.bandwidth, modelWeightGB, EFFICIENCY[hw.vendor] ?? 1);
  const cmp = computeCeilingToks(hw.tflops, paramsB);
  return mem <= cmp;
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
  return toks / Math.max(price, 1);
}

export function vramFits(hw: Hardware, required: number): boolean {
  return hw.vram + 1e-6 >= required;
}

export type SlotId = "A" | "B" | "C";

export type SlotAnalysis = {
  id: SlotId;
  data: Hardware;
  speed: number;
  valScore: number;
  fits: boolean;
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
  modelWeightGB: number,
  required: number,
  paramsB: number,
): ComparisonResult {
  const slots: SlotAnalysis[] = (["A", "B", "C"] as const).map((id) => {
    const data = id === "A" ? slotA : id === "B" ? slotB : slotC;
    const speed = tokensPerSec(data, modelWeightGB);
    const fits = vramFits(data, required);
    const computeToks = computeCeilingToks(data.tflops, paramsB);
    const memoryBound = speed <= computeToks;
    const intensityHeadroom = speed > 0 ? computeToks / speed : 0;
    return {
      id,
      data,
      speed,
      valScore: valueScore(speed, data.priceNum),
      fits,
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
  const bestValue = [...valid].sort((x, y) => y.valScore - x.valScore)[0] ?? null;

  return { slots, winner, bestValue };
}
