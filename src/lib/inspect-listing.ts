import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ALLOWED_INSPECT_HOSTS } from "./retailers";
import { extractListingSignals } from "./parser";

export type InspectResult = {
  ok: boolean;
  url: string;
  title: string | null;
  price: number | null;
  image: string | null;
  brand: string | null;
  memory: string | null;
  vram: number | null;
  site: string | null;
  error?: string;
};

function hostAllowed(hostname: string): boolean {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return false;
  if (/^\d/.test(host) || host.includes(":")) return false;
  return ALLOWED_INSPECT_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

function decodeEntities(s: string): string {
  const amp = "\u0026";
  return s
    .replace(new RegExp(`${amp}nbsp;`, "gi"), " ")
    .replace(new RegExp(`${amp}amp;`, "g"), "&")
    .replace(new RegExp(`${amp}quot;`, "g"), '"')
    .replace(new RegExp(`${amp}(#39|apos);`, "gi"), "'")
    .replace(new RegExp(`${amp}lt;`, "g"), "<")
    .replace(new RegExp(`${amp}gt;`, "g"), ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function attr(html: string, key: string, value: string): string | null {
  const a = html.match(new RegExp(`${key}=["']${value}["'][^>]+content=["']([^"']+)["']`, "i"));
  if (a?.[1]) return decodeEntities(a[1]);
  const b = html.match(new RegExp(`content=["']([^"']+)["'][^>]+${key}=["']${value}["']`, "i"));
  return b?.[1] ? decodeEntities(b[1]) : null;
}

function metaContent(html: string, names: string[]): string | null {
  for (const name of names) {
    const fromProp = attr(html, "property", name);
    if (fromProp) return fromProp;
    const fromName = attr(html, "name", name);
    if (fromName) return fromName;
  }
  return null;
}

function toAbs(url: string, pageUrl: string): string | null {
  try {
    const abs = new URL(url, pageUrl).toString();
    if (!abs.startsWith("https:")) return null;
    return abs;
  } catch {
    return null;
  }
}

function imageScore(url: string): number {
  const u = url.toLowerCase();
  if (/logo|sprite|pixel|icon|favicon|1x1|tracking|badge/.test(u)) return -1;
  if (/\/products\/|\/images\/i\/|ld\/products/.test(u)) return 4;
  if (/\.(jpg|jpeg|png|webp)(\?|$)/.test(u)) return 2;
  return 1;
}

function firstImage(node: unknown): string | null {
  if (!node) return null;
  if (typeof node === "string") return node;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = firstImage(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === "object") {
    const rec = node as Record<string, unknown>;
    if (typeof rec.url === "string") return rec.url;
    if (typeof rec.contentUrl === "string") return rec.contentUrl;
  }
  return null;
}

function walkJsonLd(data: unknown, visit: (rec: Record<string, unknown>) => void): void {
  if (!data || typeof data !== "object") return;
  if (Array.isArray(data)) {
    for (const item of data) walkJsonLd(item, visit);
    return;
  }
  const rec = data as Record<string, unknown>;
  visit(rec);
  if (rec["@graph"]) walkJsonLd(rec["@graph"], visit);
  if (rec.mainEntity) walkJsonLd(rec.mainEntity, visit);
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

type LdBits = {
  title: string | null;
  price: number | null;
  image: string | null;
  brand: string | null;
};

function extractJsonLd(html: string): LdBits {
  const bits: LdBits = { title: null, price: null, image: null, brand: null };
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1] ?? "null") as unknown;
      walkJsonLd(data, (rec) => {
        const type = String(rec["@type"] ?? "");
        if (!/product|offer/i.test(type) && !rec.offers && !rec.image) return;
        if (!bits.title && typeof rec.name === "string") bits.title = decodeEntities(rec.name);
        if (!bits.brand) {
          const brand = rec.brand;
          if (typeof brand === "string") bits.brand = brand;
          else if (brand && typeof brand === "object" && "name" in brand && typeof (brand as { name: unknown }).name === "string") {
            bits.brand = (brand as { name: string }).name;
          }
        }
        if (!bits.image) {
          const img = firstImage(rec.image);
          if (img) bits.image = img;
        }
        if (bits.price == null) {
          const offers = rec.offers;
          const offer = Array.isArray(offers) ? offers[0] : offers;
          if (offer && typeof offer === "object") {
            const n = parseNumber((offer as { price?: unknown }).price);
            if (n != null && n > 10 && n < 200000) bits.price = n;
          }
          if (bits.price == null) {
            const n = parseNumber(rec.price);
            if (n != null && n > 10 && n < 200000) bits.price = n;
          }
        }
      });
    } catch {
      /* malformed ld+json */
    }
  }
  return bits;
}

function extractTitle(html: string, ld: LdBits): string | null {
  if (ld.title) return ld.title.slice(0, 180);
  const og = metaContent(html, ["og:title"]);
  if (og) return og.slice(0, 180);
  const amazon = html.match(/id=["']productTitle["'][^>]*>\s*([^<]+)/i);
  if (amazon?.[1]) return decodeEntities(amazon[1].replace(/\s+/g, " ").trim()).slice(0, 180);
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (t?.[1]) return decodeEntities(t[1].replace(/\s+/g, " ").trim()).slice(0, 180);
  return null;
}

function extractPrice(html: string, ld: LdBits): number | null {
  if (ld.price != null) return ld.price;
  const dataPrice = html.match(/data-price=["']([\d.,]+)/i);
  if (dataPrice?.[1]) {
    const n = parseNumber(dataPrice[1]);
    if (n != null && n > 10 && n < 200000) return n;
  }
  const amount = metaContent(html, ["product:price:amount", "og:price:amount"]);
  if (amount) {
    const n = parseNumber(amount);
    if (n != null && n > 10 && n < 200000) return n;
  }
  const normalized = html.replace(/&nbsp;/gi, " ").replace(/\u00a0/g, " ");
  const amazonWhole = normalized.match(/class=["'][^"']*a-price-whole[^"']*["'][^>]*>\s*([\d.\s]+)/i);
  const amazonFrac = normalized.match(/class=["'][^"']*a-price-fraction[^"']*["'][^>]*>\s*(\d{1,2})/i);
  if (amazonWhole?.[1]) {
    const whole = parseInt(amazonWhole[1].replace(/[^\d]/g, ""), 10);
    const frac = amazonFrac?.[1] ? parseInt(amazonFrac[1], 10) / 100 : 0;
    const n = whole + frac;
    if (n > 10 && n < 200000) return n;
  }
  const euro = normalized.match(/(\d{1,3}(?:[ .\u00a0]\d{3})+|\d{2,5})([.,]\d{2})?\s*€/);
  if (euro?.[1]) {
    const whole = parseInt(euro[1].replace(/[^\d]/g, ""), 10);
    const frac = euro[2] ? parseInt(euro[2].replace(/\D/g, "").padEnd(2, "0"), 10) / 100 : 0;
    const n = whole + frac;
    if (n > 10 && n < 200000) return n;
  }
  return null;
}

function extractImage(html: string, pageUrl: string, ld: LdBits): string | null {
  const candidates: string[] = [];
  if (ld.image) candidates.push(ld.image);
  const og = metaContent(html, ["og:image", "og:image:secure_url", "twitter:image"]);
  if (og) candidates.push(og);
  const landing =
    html.match(/id=["']landingImage["'][^>]+(?:data-old-hires|src)=["']([^"']+)["']/i) ??
    html.match(/data-old-hires=["']([^"']+)["']/i);
  if (landing?.[1]) candidates.push(landing[1]);
  const ranked = candidates
    .map((c) => toAbs(c.replace(/&/g, "&"), pageUrl))
    .filter((u): u is string => Boolean(u))
    .map((u) => ({ u, s: imageScore(u) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s);
  return ranked[0]?.u ?? null;
}

export function parseListingHtml(html: string, pageUrl: string): Omit<InspectResult, "ok" | "error" | "site"> & { site?: string } {
  const ld = extractJsonLd(html);
  const title = extractTitle(html, ld);
  const desc = metaContent(html, ["og:description", "description"]);
  const signals = extractListingSignals(`${title ?? ""} ${desc ?? ""}`);
  return {
    url: pageUrl,
    title,
    price: extractPrice(html, ld),
    image: extractImage(html, pageUrl, ld),
    brand: ld.brand,
    memory: signals.memory,
    vram: signals.vram,
  };
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const inspectListingUrl = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ url: z.string().min(8).max(2000) }).parse(input))
  .handler(async ({ data }): Promise<InspectResult> => {
    let parsed: URL;
    try {
      parsed = new URL(data.url);
    } catch {
      return {
        ok: false,
        url: data.url,
        title: null,
        price: null,
        image: null,
        brand: null,
        memory: null,
        vram: null,
        site: null,
        error: "invalid",
      };
    }
    if (parsed.protocol !== "https:" || !hostAllowed(parsed.hostname)) {
      return {
        ok: false,
        url: data.url,
        title: null,
        price: null,
        image: null,
        brand: null,
        memory: null,
        vram: null,
        site: parsed.hostname,
        error: "host",
      };
    }

    const empty = (error: string, url = parsed.toString()): InspectResult => ({
      ok: false,
      url,
      title: null,
      price: null,
      image: null,
      brand: null,
      memory: null,
      vram: null,
      site: parsed.hostname.replace(/^www\./, ""),
      error,
    });

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(parsed.toString(), {
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.4",
          "User-Agent": BROWSER_UA,
        },
      });
      const finalUrl = res.url || parsed.toString();
      if (!res.ok) return empty("http", finalUrl);
      const html = (await res.text()).slice(0, 700_000);
      const bits = parseListingHtml(html, finalUrl);
      return {
        ok: Boolean(bits.title || bits.price || bits.image),
        url: finalUrl,
        title: bits.title,
        price: bits.price,
        image: bits.image,
        brand: bits.brand,
        memory: bits.memory,
        vram: bits.vram,
        site: new URL(finalUrl).hostname.replace(/^www\./, ""),
        error: bits.title || bits.price || bits.image ? undefined : "empty",
      };
    } catch {
      return empty("fetch");
    } finally {
      clearTimeout(timer);
    }
  });
