import type { Hardware } from "./hardware";
import type { RetailerId } from "./retailers";

/** Local catalog shots — always available, no hotlink. */
export const CATALOG_IMAGES: Record<string, string> = {
  "rtx-4060-8": "/hardware/rtx-4060.jpg",
  "rtx-4060-ti-16": "/hardware/rtx-4060.jpg",
  "rtx-4070-super-12": "/hardware/rtx-4060.jpg",
  "rtx-4070-ti-super-16": "/hardware/rtx-4090.jpg",
  "rtx-4080-super-16": "/hardware/rtx-4090.jpg",
  "rtx-4090-24": "/hardware/rtx-4090.jpg",
  "dual-4090-48": "/hardware/rtx-4090.jpg",
  "rtx-5070-12": "/hardware/rtx-5080.jpg",
  "rtx-5070-ti-16": "/hardware/rtx-5080.jpg",
  "rtx-5080-16": "/hardware/rtx-5080.jpg",
  "rtx-5090-32": "/hardware/rtx-5090.jpg",
  "dual-5090-64": "/hardware/rtx-5090.jpg",
  "rtx-6000-ada-48": "/hardware/h100.jpg",
  "a100-80": "/hardware/a100.jpg",
  "h100-80": "/hardware/h100.jpg",
  "mbp-m4-max-36": "/hardware/macbook-pro.jpg",
  "studio-m4-max-64": "/hardware/mac-studio.jpg",
  "studio-m4-max-128": "/hardware/mac-studio.jpg",
  "studio-m3-ultra-96": "/hardware/mac-studio.jpg",
  "studio-m3-ultra-192": "/hardware/mac-studio.jpg",
  "rx-7900-xtx-24": "/hardware/rx-7900-xtx.jpg",
  "strix-halo-128": "/hardware/strix-halo.jpg",
  "arc-b580-12": "/hardware/arc-b580.jpg",
};

export const FEATURED_STATION_IMAGE = "/hardware/rtx-5090.jpg";
export const SAMPLE_IMAGES: Record<string, string> = {
  "ldlc.com": "/hardware/rtx-5090-partner.jpg",
  "nvidia.com": "/hardware/rtx-5090.jpg",
};

export const RETAILER_MARK: Record<RetailerId, string> = {
  amazon: "/retailers/amazon.svg",
  ldlc: "/retailers/ldlc.svg",
  materiel: "/retailers/materiel.svg",
  topachat: "/retailers/topachat.svg",
  fnac: "/retailers/fnac.svg",
  apple: "/retailers/apple.svg",
  alternate: "/retailers/alternate.svg",
};

export function catalogImageForId(id: string | null | undefined): string | null {
  if (!id) return null;
  if (CATALOG_IMAGES[id]) return CATALOG_IMAGES[id];
  const stem = id.replace(/^listing-/, "");
  if (CATALOG_IMAGES[stem]) return CATALOG_IMAGES[stem];
  for (const [key, src] of Object.entries(CATALOG_IMAGES)) {
    if (stem.includes(key) || id.includes(key)) return src;
  }
  return null;
}

export function hardwareImage(hw: Pick<Hardware, "id"> & { image?: string | null }): string | null {
  if (hw.image && hw.image.trim()) return hw.image;
  return catalogImageForId(hw.id);
}

/** Local and data URLs stay as-is. Remote listing CDNs go through the image proxy. */
export function displayImageSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  const value = src.trim();
  if (!value) return null;
  if (value.startsWith("/") || value.startsWith("data:") || value.startsWith("blob:")) return value;
  if (value.startsWith("https://") || value.startsWith("http://")) {
    return `/api/img?u=${encodeURIComponent(value)}`;
  }
  return value;
}
