import { tokensPerSec, valueScore, vramFits } from "./calc";
import type { Hardware } from "./hardware";

export type SuggestionKind = "cheaper" | "vram" | "faster" | "value";

export type Suggestion = {
  kind: SuggestionKind;
  hardware: Hardware;
};

export function suggestAlternatives(
  current: Hardware,
  pool: Hardware[],
  requiredVram: number,
  modelWeightGB: number,
): Suggestion[] {
  const others = pool.filter((h) => h.id !== current.id);
  const pick = (kind: SuggestionKind, hw: Hardware | undefined): Suggestion | null =>
    hw ? { kind, hardware: hw } : null;

  const cheaper = others
    .filter((h) => h.vram >= current.vram && h.priceNum < current.priceNum && vramFits(h, requiredVram))
    .sort((a, b) => a.priceNum - b.priceNum)[0];

  const vram = others
    .filter((h) => h.vram > current.vram && h.priceNum <= current.priceNum * 1.4)
    .sort((a, b) => a.priceNum / a.vram - b.priceNum / b.vram)[0];

  const faster = others
    .filter((h) => h.bandwidth > current.bandwidth && vramFits(h, requiredVram))
    .sort((a, b) => b.bandwidth - a.bandwidth)[0];

  const value = others
    .filter((h) => vramFits(h, requiredVram))
    .sort(
      (a, b) =>
        valueScore(tokensPerSec(b, modelWeightGB), b.priceNum) -
        valueScore(tokensPerSec(a, modelWeightGB), a.priceNum),
    )[0];

  const ordered = [pick("cheaper", cheaper), pick("vram", vram), pick("faster", faster), pick("value", value)];
  const seen = new Set<string>();
  const unique: Suggestion[] = [];
  for (const s of ordered) {
    if (!s || seen.has(s.hardware.id)) continue;
    seen.add(s.hardware.id);
    unique.push(s);
  }
  return unique.slice(0, 3);
}
