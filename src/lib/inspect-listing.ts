import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ALLOWED_INSPECT_HOSTS } from "./retailers";

export type InspectResult = {
  ok: boolean;
  url: string;
  title: string | null;
  price: number | null;
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
  return s
    .replace(/&/g, "&")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function extractTitle(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (og?.[1]) return decodeEntities(og[1]).slice(0, 180);
  const amazon = html.match(/id=["']productTitle["'][^>]*>\s*([^<]+)/i);
  if (amazon?.[1]) return decodeEntities(amazon[1].trim()).slice(0, 180);
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (t?.[1]) return decodeEntities(t[1].replace(/\s+/g, " ").trim()).slice(0, 180);
  return null;
}

function extractPrice(html: string): number | null {
  const jsonBlocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of jsonBlocks) {
    try {
      const data = JSON.parse(block[1] ?? "null") as unknown;
      const price = priceFromJsonLd(data);
      if (price) return price;
    } catch {
      /* ignore malformed ld+json */
    }
  }
  const amazon = html.match(/class=["'][^"']*a-price-whole[^"']*["'][^>]*>\s*([\d.\s]+)/i);
  if (amazon?.[1]) {
    const n = parseInt(amazon[1].replace(/[^\d]/g, ""), 10);
    if (n > 20 && n < 100000) return n;
  }
  const euro = html.match(/([\d]{1,3}(?:[ .\u00a0]\d{3})+|\d{2,5})(?:[.,]\d{2})?\s*€/);
  if (euro?.[1]) {
    const n = parseInt(euro[1].replace(/[^\d]/g, ""), 10);
    if (n > 20 && n < 100000) return n;
  }
  return null;
}

function priceFromJsonLd(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const walk = (node: unknown): number | null => {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (const item of node) {
        const p = walk(item);
        if (p) return p;
      }
      return null;
    }
    const rec = node as Record<string, unknown>;
    const offers = rec.offers;
    if (offers && typeof offers === "object") {
      const offer = Array.isArray(offers) ? offers[0] : offers;
      if (offer && typeof offer === "object" && "price" in offer) {
        const n = Number((offer as { price: unknown }).price);
        if (Number.isFinite(n) && n > 20) return Math.round(n);
      }
    }
    if (typeof rec["@graph"] !== "undefined") return walk(rec["@graph"]);
    return null;
  };
  return walk(data);
}

export const inspectListingUrl = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ url: z.string().min(8).max(2000) }).parse(input))
  .handler(async ({ data }): Promise<InspectResult> => {
    let parsed: URL;
    try {
      parsed = new URL(data.url);
    } catch {
      return { ok: false, url: data.url, title: null, price: null, site: null, error: "invalid" };
    }
    if (parsed.protocol !== "https:" || !hostAllowed(parsed.hostname)) {
      return { ok: false, url: data.url, title: null, price: null, site: parsed.hostname, error: "host" };
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    try {
      const res = await fetch(parsed.toString(), {
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent":
            "Mozilla/5.0 (compatible; ForgeInspector/1.0; +https://forge.local) AppleWebKit/537.36 Chrome/122.0.0.0",
        },
      });
      if (!res.ok) {
        return { ok: false, url: parsed.toString(), title: null, price: null, site: parsed.hostname, error: "http" };
      }
      const html = (await res.text()).slice(0, 400_000);
      return {
        ok: true,
        url: parsed.toString(),
        title: extractTitle(html),
        price: extractPrice(html),
        site: parsed.hostname.replace(/^www\./, ""),
      };
    } catch {
      return { ok: false, url: parsed.toString(), title: null, price: null, site: parsed.hostname, error: "fetch" };
    } finally {
      clearTimeout(timer);
    }
  });
