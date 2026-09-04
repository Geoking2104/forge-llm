import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { localeTag } from "@/i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEur(value: number, exact = false): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const cents = Math.round(value * 100) % 100 !== 0;
  return new Intl.NumberFormat(localeTag(), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: exact || cents ? 2 : 0,
    minimumFractionDigits: exact && cents ? 2 : 0,
  }).format(value);
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat(localeTag(), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 0.01) return "< 10 ms";
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  if (seconds < 10) return `${seconds.toFixed(1)} s`;
  return `${Math.round(seconds)} s`;
}
