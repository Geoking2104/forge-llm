import { z } from "zod";
import { tokensPerSec, vramFits, type Workload } from "../calc.ts";
import type { Hardware } from "../hardware.ts";
import type { Rig, Settings } from "./calculator.ts";

const quantity = z.number().finite().nonnegative();
export const workstationSchema = z.object({
  id: z.string(),
  name: z.string(),
  vendor: z.enum(["nvidia", "amd", "apple", "intel", "custom"]),
  vram: quantity,
  bandwidth: quantity,
  tflops: quantity,
  priceNum: quantity,
  aiWatts: quantity,
  aiRate: quantity,
  demand: quantity.max(100),
});
export function workstation(hw: Hardware) {
  return { ...hw, aiWatts: 0, aiRate: 0, demand: 100 };
}

export function aiReturn(r: Rig, s: Settings, work: Workload) {
  const hw = r.station;
  const hours = s.peakHours + s.offHours;
  if (!hw || hours > 24 || !hw.bandwidth || !vramFits(hw, work.required)) return null;
  const speed = tokensPerSec(hw, work) * work.batch;
  const operatingHours = (hours * s.uptime) / 100;
  const tokens = (speed * 3600 * operatingHours * r.quantity * hw.demand) / 100;
  // Wall watts are the average over scheduled online hours, including unbilled idle time.
  const kw = ((hw.aiWatts + r.cooling) * r.quantity) / 1000;
  const energy = kw * operatingHours;
  const charge =
    s.tariff === "flat" ? s.rate * hours : s.peakRate * s.peakHours + s.offRate * s.offHours;
  const electricity = r.included ? 0 : ((kw * s.uptime) / 100) * charge;
  const revenue = (tokens * hw.aiRate) / 1e6;
  const priced = hw.aiRate > 0 && (hw.aiWatts > 0 || r.included);
  const margin = priced ? revenue - electricity - r.hosting * r.quantity : null;
  const investment = (r.purchase + r.install) * r.quantity;
  return {
    speed,
    tokens,
    revenue,
    margin,
    payback: margin !== null && margin > 0 && investment > 0 ? investment / margin : null,
  };
}

function normalized(name: string) {
  return name
    .toLowerCase()
    .replace(/\b(?:nvidia|geforce|apple|amd|intel)\b/g, " ")
    .replace(/\bdual\b|\b2\s*[x×]/g, " dual ")
    .replace(/\(\d+ gpu\)/g, " ")
    .replace(/\b(?:13|14|15|16)(?:[.,]\d+)?\s*(?:pouces?|inch(?:es)?|["″])|\b(?:chip|puce)\b/g, " ")
    .replace(/(\d)\s*(?:gb|go)\b/g, "$1gb")
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();
}
export function matchStation(description: string, pool: Hardware[]) {
  const text = " " + normalized(description) + " ";
  const matches = pool.filter((hw) => {
    const name = normalized(hw.name);
    const sku = name.replace(/\s+\d+gb$/, "");
    if (!sku || !text.includes(" " + sku + " ")) return false;
    if (/\bdual\b/.test(sku) !== /\bdual\b/.test(text)) return false;
    if (
      /\brtx \d+\b/.test(sku) &&
      /\b(ti|super|laptop|mobile)\b/.test(text) &&
      ["ti", "super", "laptop", "mobile"].some(
        (v) => text.includes(" " + v + " ") && !sku.split(" ").includes(v),
      )
    )
      return false;
    // Unified-memory variants can have different bandwidth (e.g. M6 16 vs 32 GB).
    if (hw.vendor === "apple" && /\d+gb\b/.test(text) && !text.includes(" " + hw.vram + "gb "))
      return false;
    return true;
  });
  const exact = matches.filter((hw) => text.includes(" " + normalized(hw.name) + " "));
  return exact.length === 1 ? exact[0] : matches.length === 1 ? matches[0] : undefined;
}

export function readMeasurements(text: string) {
  const hash = text.match(/(?:sha-?256d\s*[:=]?\s*)(\d+(?:[.,]\d+)?)\s*([kmgt]?)h\/s\b/i);
  const val = (v: string) => Number(v.replace(",", "."));
  const watts = (label: string) => {
    const m = text.match(
      new RegExp("(?:^|[^a-z])(?:" + label + ")\\s*[:=]?\\s*(\\d+(?:[.,]\\d+)?)\\s*w\\b", "i"),
    );
    return m ? val(m[1]) : 0;
  };
  const unit: Record<string, number> = { t: 1, g: 1e-3, m: 1e-6, k: 1e-9, "": 1e-12 };
  return {
    th: hash ? val(hash[1]) * unit[hash[2].toLowerCase()] : 0,
    watts: watts("mining|minage"),
    aiWatts: watts("ai|ia"),
  };
}

export function explicitSpecs(text: string) {
  const number = (match: RegExpMatchArray | null) =>
    match ? Number(match[1].replace(",", ".")) : 0;
  // Only accelerator/unified memory qualifies. A PC's system RAM is not its VRAM.
  const memory =
    text.match(/(?:vram|unified memory|mémoire unifiée)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*g[bo]\b/i) ??
    text.match(/(\d+(?:[.,]\d+)?)\s*g[bo]\s*(?:vram|unified memory|de mémoire unifiée)\b/i);
  return {
    vram: number(memory),
    bandwidth: number(text.match(/(\d+(?:[.,]\d+)?)\s*g[bo]\/s\b/i)),
    tflops: number(text.match(/(\d+(?:[.,]\d+)?)\s*tflops\b/i)),
  };
}
