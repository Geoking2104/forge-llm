import { tokensPerSec, vramFits } from "./calc";
import type { Hardware } from "./hardware";

export type SuggestionKind = "deal";

export type Suggestion = {
  kind: SuggestionKind;
  hardware: Hardware;
  save: number;
};

/** At least as much VRAM and tok/s, strictly cheaper than the listing price. */
export function suggestCheaperEquivalents(
  current: Hardware,
  listedPrice: number,
  pool: Hardware[],
  requiredVram: number,
  modelWeightGB: number,
): Suggestion[] {
  if (!(listedPrice > 0)) return [];
  const speed = tokensPerSec(current, modelWeightGB);
  const listedFits = vramFits(current, requiredVram);

  const deals = pool
    .filter((h) => {
      if (h.priceNum <= 0 || h.priceNum >= listedPrice) return false;
      if (h.vram + 1e-6 < current.vram) return false;
      if (tokensPerSec(h, modelWeightGB) + 1e-6 < speed) return false;
      if (listedFits && !vramFits(h, requiredVram)) return false;
      return true;
    })
    .sort((a, b) => a.priceNum - b.priceNum || b.vram - a.vram);

  const seen = new Set<string>();
  const unique: Suggestion[] = [];
  for (const hardware of deals) {
    const key = `${hardware.name}|${hardware.vram}|${hardware.priceNum}`;
    if (seen.has(key) || seen.has(hardware.id)) continue;
    seen.add(key);
    seen.add(hardware.id);
    unique.push({ kind: "deal", hardware, save: Math.max(0, listedPrice - hardware.priceNum) });
    if (unique.length >= 4) break;
  }
  return unique;
}

/** @deprecated use suggestCheaperEquivalents */
export function suggestAlternatives(
  current: Hardware,
  pool: Hardware[],
  requiredVram: number,
  modelWeightGB: number,
): Suggestion[] {
  return suggestCheaperEquivalents(current, current.priceNum, pool, requiredVram, modelWeightGB);
}