import type { Retailer } from "./retailers";

export type AffiliateTags = {
  amazon: string;
};

/** SiteStripe Amazon Associates (FR) — AInonymous. */
export const AMAZON_AFFILIATE = {
  tag: "ainonymous09-20",
  linkCode: "ll2",
  linkId: "27adefd75a79bd098fac55f61b7e1ba1",
  ref: "as_li_ss_tl",
} as const;

export const EMPTY_TAGS: AffiliateTags = { amazon: AMAZON_AFFILIATE.tag };

export type AffiliateEvent = {
  at: number;
  retailer: string;
  sku: string;
  query: string;
};

export function amazonTagOrDefault(tag?: string | null): string {
  const t = tag?.trim();
  return t || AMAZON_AFFILIATE.tag;
}

export function isAmazonHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  return (
    host === "amazon.fr" ||
    host.endsWith(".amazon.fr") ||
    host === "amazon.com" ||
    host.endsWith(".amazon.com") ||
    host === "amzn.eu" ||
    host === "amzn.to"
  );
}

export function isTagged(tags: AffiliateTags, retailer: Retailer): boolean {
  return retailer.id === "amazon" && Boolean(amazonTagOrDefault(tags.amazon));
}

export function withAffiliate(
  dest: string,
  retailer: Retailer | null,
  tags: AffiliateTags = EMPTY_TAGS,
): string {
  try {
    const u = new URL(dest);
    if (retailer?.id === "amazon" || isAmazonHost(u.hostname)) {
      u.searchParams.set("tag", amazonTagOrDefault(tags.amazon));
      u.searchParams.set("linkCode", AMAZON_AFFILIATE.linkCode);
      u.searchParams.set("linkId", AMAZON_AFFILIATE.linkId);
      u.searchParams.set("ref_", AMAZON_AFFILIATE.ref);
      return u.toString();
    }
    u.searchParams.set("utm_source", "forge");
    u.searchParams.set("utm_medium", "referral");
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
      return withAffiliate(u.toString(), retailer, tags);
    } catch {
      /* fall through */
    }
  }
  if (!retailer || !query.trim()) return null;
  return withAffiliate(productOrSearchUrl(retailer, query.trim(), asin), retailer, tags);
}