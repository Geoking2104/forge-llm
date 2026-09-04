import type { Retailer } from "./retailers";

export type AffiliateTags = {
  amazon: string;
};

export const EMPTY_TAGS: AffiliateTags = { amazon: "" };

export type AffiliateEvent = {
  at: number;
  retailer: string;
  sku: string;
  query: string;
};

export function isTagged(tags: AffiliateTags, retailer: Retailer): boolean {
  return retailer.id === "amazon" && Boolean(tags.amazon.trim());
}

export function withAffiliate(dest: string, retailer: Retailer, tags: AffiliateTags): string {
  try {
    const u = new URL(dest);
    if (retailer.id === "amazon" && tags.amazon.trim()) {
      u.searchParams.set("tag", tags.amazon.trim());
      u.searchParams.set("linkCode", "ll1");
    } else {
      u.searchParams.set("utm_source", "forge");
      u.searchParams.set("utm_medium", "referral");
    }
    return u.toString();
  } catch {
    return dest;
  }
}

export function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  if (!m?.[0]) return null;
  try {
    const u = new URL(m[0].replace(/[).,;]+$/, ""));
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function extractAsin(text: string): string | null {
  const m = text.match(/(?:\/dp\/|\/gp\/product\/|\/product\/|asin=)([A-Z0-9]{10})/i);
  return m?.[1]?.toUpperCase() ?? null;
}

export function productOrSearchUrl(retailer: Retailer, query: string, asin?: string | null): string {
  if (retailer.id === "amazon" && asin) return `https://www.amazon.fr/dp/${asin}`;
  return retailer.searchPath(query);
}

export function listingBuyUrl(
  dest: string | null,
  retailer: Retailer | null,
  tags: AffiliateTags,
  query: string,
  asin?: string | null,
): string | null {
  if (dest) {
    try {
      const u = new URL(dest);
      if (retailer) return withAffiliate(u.toString(), retailer, tags);
      return u.toString();
    } catch {
      /* fall through */
    }
  }
  if (!retailer || !query.trim()) return null;
  return withAffiliate(productOrSearchUrl(retailer, query.trim(), asin), retailer, tags);
}