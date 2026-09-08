export type Vendor = "nvidia" | "apple" | "amd" | "intel" | "custom";

export type Hardware = {
  id: string;
  name: string;
  vendor: Vendor;
  vram: number;
  tflops: number;
  bandwidth: number;
  priceNum: number;
  notes?: string;
  custom?: boolean;
  image?: string | null;
};

export const VENDOR_LABEL: Record<Vendor, string> = {
  nvidia: "NVIDIA",
  apple: "Apple",
  amd: "AMD",
  intel: "Intel",
  custom: "Perso",
};

export const EFFICIENCY: Record<Vendor, number> = {
  nvidia: 1,
  apple: 0.82,
  amd: 0.72,
  intel: 0.65,
  custom: 0.9,
};

export const DEFAULT_HARDWARE: Hardware[] = [
  {
    id: "rtx-4060-8",
    name: "RTX 4060 8 Go",
    vendor: "nvidia",
    vram: 8,
    tflops: 121,
    bandwidth: 272,
    priceNum: 299,
    notes: "Entrée de gamme local, Q4 7B seulement",
  },
  {
    id: "rtx-4060-ti-16",
    name: "RTX 4060 Ti 16 Go",
    vendor: "nvidia",
    vram: 16,
    tflops: 137,
    bandwidth: 288,
    priceNum: 489,
    notes: "Meilleur rapport 16 Go grand public",
  },
  {
    id: "rtx-4070-super-12",
    name: "RTX 4070 Super 12 Go",
    vendor: "nvidia",
    vram: 12,
    tflops: 177,
    bandwidth: 504,
    priceNum: 619,
  },
  {
    id: "rtx-4070-ti-super-16",
    name: "RTX 4070 Ti Super 16 Go",
    vendor: "nvidia",
    vram: 16,
    tflops: 222,
    bandwidth: 672,
    priceNum: 849,
  },
  {
    id: "rtx-4080-super-16",
    name: "RTX 4080 Super 16 Go",
    vendor: "nvidia",
    vram: 16,
    tflops: 261,
    bandwidth: 736,
    priceNum: 1099,
  },
  {
    id: "rtx-4090-24",
    name: "RTX 4090 24 Go",
    vendor: "nvidia",
    vram: 24,
    tflops: 330,
    bandwidth: 1008,
    priceNum: 1899,
    notes: "Référence locale 24 Go",
  },
  {
    id: "dual-4090-48",
    name: "Dual RTX 4090 (48 Go)",
    vendor: "nvidia",
    vram: 48,
    tflops: 660,
    bandwidth: 2016,
    priceNum: 3850,
    notes: "Tensor parallèle / multi-instance",
  },
  {
    id: "rtx-5070-12",
    name: "RTX 5070 12 Go",
    vendor: "nvidia",
    vram: 12,
    tflops: 246,
    bandwidth: 672,
    priceNum: 649,
  },
  {
    id: "rtx-5070-ti-16",
    name: "RTX 5070 Ti 16 Go",
    vendor: "nvidia",
    vram: 16,
    tflops: 351,
    bandwidth: 896,
    priceNum: 879,
  },
  {
    id: "rtx-5080-16",
    name: "RTX 5080 16 Go",
    vendor: "nvidia",
    vram: 16,
    tflops: 450,
    bandwidth: 960,
    priceNum: 1199,
  },
  {
    id: "rtx-5090-32",
    name: "RTX 5090 32 Go",
    vendor: "nvidia",
    vram: 32,
    tflops: 660,
    bandwidth: 1792,
    priceNum: 2399,
    notes: "Plafond grand public Blackwell",
  },
  {
    id: "dual-5090-64",
    name: "Dual RTX 5090 (64 Go)",
    vendor: "nvidia",
    vram: 64,
    tflops: 1320,
    bandwidth: 3584,
    priceNum: 4890,
  },
  {
    id: "rtx-6000-ada-48",
    name: "RTX 6000 Ada 48 Go",
    vendor: "nvidia",
    vram: 48,
    tflops: 364,
    bandwidth: 960,
    priceNum: 6790,
    notes: "Station pro, ECC, 4 slots",
  },
  {
    id: "a100-80",
    name: "NVIDIA A100 PCIe 80 Go",
    vendor: "nvidia",
    vram: 80,
    tflops: 312,
    bandwidth: 2039,
    priceNum: 12500,
    notes: "HBM2e, datacenter",
  },
  {
    id: "h100-80",
    name: "NVIDIA H100 PCIe 80 Go",
    vendor: "nvidia",
    vram: 80,
    tflops: 756,
    bandwidth: 2039,
    priceNum: 27900,
    notes: "Transformer Engine, FP8",
  },
  {
    id: "mbp-m4-max-36",
    name: "MacBook Pro M4 Max 36 Go",
    vendor: "apple",
    vram: 36,
    tflops: 38,
    bandwidth: 410,
    priceNum: 3999,
    notes: "Portable, mémoire unifiée",
  },
  {
    id: "studio-m4-max-64",
    name: "Mac Studio M4 Max 64 Go",
    vendor: "apple",
    vram: 64,
    tflops: 46,
    bandwidth: 546,
    priceNum: 2399,
    notes: "Mémoire unifiée, silencieux",
  },
  {
    id: "studio-m4-max-128",
    name: "Mac Studio M4 Max 128 Go",
    vendor: "apple",
    vram: 128,
    tflops: 46,
    bandwidth: 546,
    priceNum: 4199,
  },
  {
    id: "studio-m3-ultra-96",
    name: "Mac Studio M3 Ultra 96 Go",
    vendor: "apple",
    vram: 96,
    tflops: 81,
    bandwidth: 800,
    priceNum: 4599,
  },
  {
    id: "studio-m3-ultra-192",
    name: "Mac Studio M3 Ultra 192 Go",
    vendor: "apple",
    vram: 192,
    tflops: 92,
    bandwidth: 800,
    priceNum: 5299,
    notes: "Contexte long, 70B+ confortable",
  },
  {
    id: "rx-7900-xtx-24",
    name: "Radeon RX 7900 XTX 24 Go",
    vendor: "amd",
    vram: 24,
    tflops: 123,
    bandwidth: 960,
    priceNum: 899,
    notes: "ROCm / llama.cpp, moins mature",
  },
  {
    id: "strix-halo-128",
    name: "Ryzen AI Max+ 395 128 Go",
    vendor: "amd",
    vram: 128,
    tflops: 59,
    bandwidth: 256,
    priceNum: 1899,
    notes: "Strix Halo, NPU + iGPU unifiée",
  },
  {
    id: "arc-b580-12",
    name: "Intel Arc B580 12 Go",
    vendor: "intel",
    vram: 12,
    tflops: 46,
    bandwidth: 456,
    priceNum: 249,
    notes: "SYCL / IPEX-LLM expérimental",
  },
];

export function hardwarePriceLabel(hw: Hardware): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(hw.priceNum);
}

export function findHardware(pool: Hardware[], id: string): Hardware | undefined {
  return pool.find((h) => h.id === id);
}
