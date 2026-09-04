import { DEFAULT_HARDWARE, type Hardware } from "./hardware";
import { extractAsin, extractUrl } from "./affiliate";
import { retailerByHost, type RetailerId } from "./retailers";

export type ParsedProduct = {
  name: string;
  matched: Hardware | null;
  vram: number;
  tflops: number;
  bandwidth: number;
  priceNum: number;
  priceLabel: string;
  site: string;
  raw: string;
  url: string | null;
  asin: string | null;
  retailerId: RetailerId | null;
};

const SITE_PATTERNS: Array<{ test: RegExp; site: string }> = [
  { test: /ldlc\.com/i, site: "ldlc.com" },
  { test: /amazon\.fr|amzn/i, site: "amazon.fr" },
  { test: /materiel\.net/i, site: "materiel.net" },
  { test: /topachat/i, site: "topachat.com" },
  { test: /alternate/i, site: "alternate.fr" },
  { test: /fnac\.com/i, site: "fnac.com" },
  { test: /apple\.com/i, site: "apple.com" },
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

export function parsePrice(text: string): number | null {
  const compact = text.replace(/\u00a0/g, " ");
  const m = compact.match(/(\d{1,3}(?:[ .]\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*€/);
  if (m?.[1]) {
    const euros = parseInt(m[1].replace(/[^\d]/g, ""), 10);
    const cents = m[2] ? parseInt(m[2].padEnd(2, "0"), 10) / 100 : 0;
    const n = Math.round(euros + cents);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const usd = compact.match(/\$\s*(\d[\d,]*)/);
  if (usd?.[1]) {
    const n = Math.round(parseInt(usd[1].replace(/[^\d]/g, ""), 10) * 0.92);
    return Number.isFinite(n) && n > 0 ? n : null;
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

export function parseProductText(
  raw: string,
  pool: Hardware[],
  extras?: { title?: string | null; price?: number | null },
): ParsedProduct {
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
  const hay = `${extras?.title ?? ""} ${text}`.toLowerCase();
  const matched = matchSku(hay, pool);
  const parsedPrice = extras?.price ?? parsePrice(`${extras?.title ?? ""} ${text}`);
  const priceNum = (() => {
    if (matched && parsedPrice && (parsedPrice > matched.priceNum * 8 || parsedPrice < matched.priceNum / 8)) {
      return matched.priceNum;
    }
    return parsedPrice ?? matched?.priceNum ?? 0;
  })();
  const vramMatch = hay.match(/(\d+)\s*(go|gb)\b/);
  const inferredVram = vramMatch ? parseInt(vramMatch[1], 10) : 0;
  const site = detectSite(text, url);
  const displayName = extras?.title?.trim() || matched?.name;

  if (matched) {
    const vram =
      inferredVram >= 8 && inferredVram <= 256 && inferredVram !== matched.vram
        ? inferredVram
        : matched.vram;
    return {
      name: displayName || matched.name,
      matched,
      vram,
      tflops: matched.tflops,
      bandwidth: matched.bandwidth,
      priceNum: priceNum || matched.priceNum,
      priceLabel: `${priceNum || matched.priceNum} €`,
      site,
      raw: text,
      url,
      asin,
      retailerId,
    };
  }

  const vram = inferredVram >= 4 ? inferredVram : 16;
  const firstLine = text.split(/\n/)[0]?.slice(0, 80).trim() || "Composant inconnu";
  return {
    name: displayName || firstLine,
    matched: null,
    vram,
    tflops: vram * 10,
    bandwidth: vram * 25,
    priceNum: priceNum || 500,
    priceLabel: `${priceNum || 500} €`,
    site,
    raw: text,
    url,
    asin,
    retailerId,
  };
}

export function parsedToHardware(p: ParsedProduct): Hardware {
  const id = `parsed-${Date.now()}`;
  return {
    id,
    name: p.matched ? p.matched.name : `[Fiche] ${p.name}`,
    vendor: p.matched?.vendor ?? "custom",
    vram: p.vram,
    tflops: p.tflops,
    bandwidth: p.bandwidth,
    priceNum: p.priceNum,
    notes: `Importé depuis ${p.site}`,
    custom: !p.matched,
  };
}

export const SAMPLE_LISTINGS: Array<{ title: string; site: string; price: string; body: string }> = [
  {
    title: "RTX 5090 32 Go",
    site: "ldlc.com",
    price: "2 399 €",
    body: "https://www.ldlc.com/fiche/PB0065090.html NVIDIA GeForce RTX 5090 32 Go GDDR7 — 2 399,00 €",
  },
  {
    title: "RTX 4090 24 Go",
    site: "amazon.fr",
    price: "1 899 €",
    body: "https://www.amazon.fr/dp/B0CXXXX409 ASUS TUF Gaming GeForce RTX 4090 24GB — 1 899,00 €",
  },
  {
    title: "RTX 4060 Ti 16 Go",
    site: "ldlc.com",
    price: "489 €",
    body: "https://www.ldlc.com/fiche/PB0054060.html Gigabyte GeForce RTX 4060 Ti GAMING OC 16 Go — 489,90 €",
  },
  {
    title: "Mac Studio M4 Max",
    site: "amazon.fr",
    price: "2 399 €",
    body: "https://www.amazon.fr/dp/B0M4MAX64A Apple Mac Studio (M4 Max, 64 Go, 1 To) — 2 399,00 €",
  },
  {
    title: "Mac Studio M3 Ultra",
    site: "ldlc.com",
    price: "5 299 €",
    body: "https://www.ldlc.com/fiche/PB00M3ULTRA.html Apple Mac Studio M3 Ultra 192 Go — 5 299,00 €",
  },
  {
    title: "RX 7900 XTX 24 Go",
    site: "topachat.com",
    price: "899 €",
    body: "https://www.topachat.com/pages/recherche.php?cat=off&mc=7900%20XTX Sapphire Pulse AMD Radeon RX 7900 XTX 24 Go — 899,00 €",
  },
];
