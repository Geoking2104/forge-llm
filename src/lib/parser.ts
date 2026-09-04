import { DEFAULT_HARDWARE, type Hardware } from "./hardware";
import { extractAsin, extractUrl } from "./affiliate";
import { retailerByHost, type RetailerId } from "./retailers";

export type ListingExtras = {
  title?: string | null;
  price?: number | null;
  image?: string | null;
  brand?: string | null;
  memory?: string | null;
  vram?: number | null;
};

export type ParsedProduct = {
  name: string;
  matched: Hardware | null;
  vram: number;
  tflops: number;
  bandwidth: number;
  priceNum: number;
  priceExact: boolean;
  priceLabel: string;
  site: string;
  raw: string;
  url: string | null;
  asin: string | null;
  retailerId: RetailerId | null;
  image: string | null;
  brand: string | null;
  memory: string | null;
};

const SITE_PATTERNS: Array<{ test: RegExp; site: string }> = [
  { test: /ldlc\.com/i, site: "ldlc.com" },
  { test: /amazon\.fr|amzn/i, site: "amazon.fr" },
  { test: /materiel\.net/i, site: "materiel.net" },
  { test: /topachat/i, site: "topachat.com" },
  { test: /alternate/i, site: "alternate.fr" },
  { test: /fnac\.com/i, site: "fnac.com" },
  { test: /apple\.com/i, site: "apple.com" },
  { test: /nvidia\.com/i, site: "nvidia.com" },
];

const SKU_RULES: Array<{ test: RegExp; id: string }> = [
  { test: /5090/, id: "rtx-5090-32" },
  { test: /5080/, id: "rtx-5080-16" },
  { test: /5070\s*ti/, id: "rtx-5070-ti-16" },
  { test: /5070/, id: "rtx-5070-12" },
  { test: /4090/, id: "rtx-4090-24" },
  { test: /4080/, id: "rtx-4080-super-16" },
  { test: /4070\s*ti/, id: "rtx-4070-ti-super-16" },
  { test: /4070/, id: "rtx-4070-super-12" },
  { test: /4060\s*ti/, id: "rtx-4060-ti-16" },
  { test: /4060/, id: "rtx-4060-8" },
  { test: /6000\s*ada|rtx\s*6000/, id: "rtx-6000-ada-48" },
  { test: /\ba100\b/, id: "a100-80" },
  { test: /\bh100\b/, id: "h100-80" },
  { test: /m4\s*max/, id: "studio-m4-max-64" },
  { test: /m3\s*ultra/, id: "studio-m3-ultra-192" },
  { test: /m3\s*max/, id: "studio-m4-max-64" },
  { test: /7900\s*xtx/, id: "rx-7900-xtx-24" },
  { test: /strix\s*halo|ai\s*max\+?\s*395|395\+?/, id: "strix-halo-128" },
  { test: /b580|arc\s*b/, id: "arc-b580-12" },
];

export function extractListingSignals(text: string): { vram: number | null; memory: string | null } {
  const memory = text.match(/\b(GDDR7|GDDR6X|GDDR6|HBM3e|HBM3E|HBM3|HBM2e|HBM2E|LPDDR5X|LPDDR5)\b/i);
  const vram = text.match(/\b(256|192|128|96|80|64|48|36|32|24|16|12|8)\s*(?:go|gb)\b/i);
  let mem = memory?.[1] ? memory[1].toUpperCase() : null;
  if (mem === "HBM3E") mem = "HBM3e";
  if (mem === "HBM2E") mem = "HBM2e";
  return {
    memory: mem,
    vram: vram ? parseInt(vram[1]!, 10) : null,
  };
}

export function parsePrice(text: string): number | null {
  const compact = text.replace(/\u00a0/g, " ").replace(/&nbsp;/gi, " ");
  const m = compact.match(/(\d{1,3}(?:[ .]\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*€/);
  if (m?.[1]) {
    const euros = parseInt(m[1].replace(/[^\d]/g, ""), 10);
    const cents = m[2] ? parseInt(m[2].padEnd(2, "0"), 10) / 100 : 0;
    const n = euros + cents;
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const usd = compact.match(/\$\s*(\d[\d,]*(?:\.\d{2})?)/);
  if (usd?.[1]) {
    const n = parseFloat(usd[1].replace(/,/g, "")) * 0.92;
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
  }
  return null;
}

function detectSite(text: string, url: string | null): string {
  if (url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* fall through */
    }
  }
  for (const p of SITE_PATTERNS) {
    if (p.test.test(text)) return p.site;
  }
  return "saisie";
}

function matchSku(haystack: string, pool: Hardware[]): Hardware | null {
  for (const rule of SKU_RULES) {
    if (rule.test.test(haystack)) {
      return pool.find((h) => h.id === rule.id) ?? DEFAULT_HARDWARE.find((h) => h.id === rule.id) ?? null;
    }
  }
  return null;
}

export function parseProductText(raw: string, pool: Hardware[], extras?: ListingExtras): ParsedProduct {
  const text = raw.trim();
  const url = extractUrl(text);
  const asin = extractAsin(text);
  let retailerId: RetailerId | null = null;
  if (url) {
    try {
      retailerId = retailerByHost(new URL(url).hostname)?.id ?? null;
    } catch {
      retailerId = null;
    }
  }
  const hay = `${extras?.title ?? ""} ${text} ${url ?? ""}`.toLowerCase();
  const matched = matchSku(hay, pool);
  const signals = extractListingSignals(`${extras?.title ?? ""} ${text}`);
  const listingVram = extras?.vram ?? signals.vram;
  const memory = extras?.memory ?? signals.memory;
  const parsedPrice = extras?.price ?? parsePrice(`${extras?.title ?? ""} ${text}`);
  const priceExact = parsedPrice != null && parsedPrice > 0;
  const priceNum = priceExact ? parsedPrice : 0;
  const site = detectSite(text, url);
  const displayName = extras?.title?.trim() || matched?.name;
  const vram =
    listingVram && listingVram >= 4 && listingVram <= 256
      ? listingVram
      : (matched?.vram ?? (listingVram && listingVram >= 4 ? listingVram : 16));

  if (matched) {
    return {
      name: displayName || matched.name,
      matched,
      vram,
      tflops: matched.tflops,
      bandwidth: matched.bandwidth,
      priceNum,
      priceExact,
      priceLabel: priceExact ? `${priceNum} €` : "—",
      site,
      raw: text,
      url,
      asin,
      retailerId,
      image: extras?.image ?? null,
      brand: extras?.brand ?? null,
      memory,
    };
  }

  const inferredVram = listingVram && listingVram >= 4 ? listingVram : 16;
  const firstLine = (extras?.title ?? text.split(/\n/)[0] ?? "").slice(0, 80).trim() || "Composant inconnu";
  return {
    name: displayName || firstLine,
    matched: null,
    vram: inferredVram,
    tflops: inferredVram * 10,
    bandwidth: inferredVram * 25,
    priceNum,
    priceExact,
    priceLabel: priceExact ? `${priceNum} €` : "—",
    site,
    raw: text,
    url,
    asin,
    retailerId,
    image: extras?.image ?? null,
    brand: extras?.brand ?? null,
    memory,
  };
}

export function parsedToHardware(p: ParsedProduct): Hardware {
  const stem = p.asin ?? p.matched?.id ?? p.site.replace(/\W+/g, "");
  return {
    id: `listing-${stem}`,
    name: p.name,
    vendor: p.matched?.vendor ?? "custom",
    vram: p.vram,
    tflops: p.tflops,
    bandwidth: p.bandwidth,
    priceNum: p.priceExact ? p.priceNum : (p.matched?.priceNum ?? 0),
    notes: `Importé depuis ${p.site}`,
    custom: true,
  };
}

export const SAMPLE_LISTINGS: Array<{ title: string; site: string; body: string }> = [
  {
    title: "RTX 5090 32 Go",
    site: "ldlc.com",
    body: "https://www.ldlc.com/fiche/PB00663198.html",
  },
  {
    title: "RTX 5090 NVIDIA",
    site: "nvidia.com",
    body: "https://www.nvidia.com/fr-fr/geforce/graphics-cards/50-series/rtx-5090/",
  },
  {
    title: "RTX 4090 24 Go",
    site: "ldlc.com",
    body: "https://www.ldlc.com/fiche/PB00594740.html",
  },
];
