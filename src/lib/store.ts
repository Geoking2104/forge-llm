import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_HARDWARE, findHardware, type Hardware } from "./hardware";
import { DEFAULT_MODEL, MODEL_PRESETS, type QuantKey } from "./models";
import type { SlotId } from "./calc";
import type { Locale } from "@/i18n";
import { EMPTY_TAGS, type AffiliateEvent, type AffiliateTags } from "./affiliate";

export type EntryMode = "choose" | "station" | "model";

type ForgeState = {
  hydrated: boolean;
  locale: Locale;
  entry: EntryMode;
  focusHardwareId: string;
  pool: Hardware[];
  slotAId: string;
  slotBId: string;
  slotCId: string;
  modelParamSize: number;
  quantization: QuantKey;
  context: number;
  presetId: string;
  amazonTag: string;
  affiliateLog: AffiliateEvent[];
  listingRaw: string;
  listingTitle: string | null;
  listingPrice: number | null;
  listingImage: string | null;
  listingBrand: string | null;
  listingMemory: string | null;
  listingVram: number | null;
  setHydrated: (v: boolean) => void;
  setLocale: (l: Locale) => void;
  setEntry: (e: EntryMode) => void;
  setFocusHardware: (id: string) => void;
  setModelParamSize: (n: number) => void;
  setQuantization: (q: QuantKey) => void;
  setContext: (n: number) => void;
  applyPreset: (id: string) => void;
  setSlot: (slot: SlotId, hardwareId: string) => void;
  addHardware: (hw: Hardware) => void;
  removeHardware: (id: string) => void;
  replaceAll: (payload: { pool: Hardware[]; slotAId: string; slotBId: string; slotCId: string }) => void;
  resetDefaults: () => void;
  setAmazonTag: (tag: string) => void;
  logAffiliate: (event: Omit<AffiliateEvent, "at">) => void;
  setListing: (
    raw: string,
    extras?: {
      title?: string | null;
      price?: number | null;
      image?: string | null;
      brand?: string | null;
      memory?: string | null;
      vram?: number | null;
    },
  ) => void;
};

const defaultA = "rtx-4090-24";
const defaultB = "rtx-4060-ti-16";
const defaultC = "studio-m4-max-64";

export const useForgeStore = create<ForgeState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      locale: "fr",
      entry: "choose",
      focusHardwareId: defaultA,
      pool: DEFAULT_HARDWARE,
      slotAId: defaultA,
      slotBId: defaultB,
      slotCId: defaultC,
      modelParamSize: DEFAULT_MODEL.paramsB,
      quantization: DEFAULT_MODEL.defaultQuant,
      context: DEFAULT_MODEL.context,
      presetId: DEFAULT_MODEL.id,
      amazonTag: "",
      affiliateLog: [],
      listingRaw: "",
      listingTitle: null,
      listingPrice: null,
      listingImage: null,
      listingBrand: null,
      listingMemory: null,
      listingVram: null,
      setHydrated: (v) => set({ hydrated: v }),
      setLocale: (locale) => set({ locale }),
      setEntry: (entry) => set({ entry }),
      setFocusHardware: (focusHardwareId) => set({ focusHardwareId }),
      setModelParamSize: (n) => set({ modelParamSize: n, presetId: "custom" }),
      setQuantization: (q) => set({ quantization: q }),
      setContext: (n) => set({ context: n }),
      applyPreset: (id) => {
        const p = MODEL_PRESETS.find((m) => m.id === id);
        if (!p) return;
        set({
          presetId: p.id,
          modelParamSize: p.paramsB,
          quantization: p.defaultQuant,
          context: p.context,
        });
      },
      setSlot: (slot, hardwareId) => {
        if (slot === "A") set({ slotAId: hardwareId });
        if (slot === "B") set({ slotBId: hardwareId });
        if (slot === "C") set({ slotCId: hardwareId });
      },
      addHardware: (hw) => {
        const pool = [...get().pool.filter((h) => h.id !== hw.id), hw];
        set({ pool });
      },
      removeHardware: (id) => {
        const { pool, slotAId, slotBId, slotCId, focusHardwareId } = get();
        const next = pool.filter((h) => h.id !== id);
        if (next.length === 0) return;
        const fallback = next[0]!.id;
        set({
          pool: next,
          slotAId: slotAId === id ? fallback : slotAId,
          slotBId: slotBId === id ? fallback : slotBId,
          slotCId: slotCId === id ? fallback : slotCId,
          focusHardwareId: focusHardwareId === id ? fallback : focusHardwareId,
        });
      },
      replaceAll: (payload) => set({ ...payload }),
      resetDefaults: () =>
        set({
          pool: DEFAULT_HARDWARE,
          slotAId: defaultA,
          slotBId: defaultB,
          slotCId: defaultC,
          focusHardwareId: defaultA,
          modelParamSize: DEFAULT_MODEL.paramsB,
          quantization: DEFAULT_MODEL.defaultQuant,
          context: DEFAULT_MODEL.context,
          presetId: DEFAULT_MODEL.id,
        }),
      setAmazonTag: (amazonTag) => set({ amazonTag }),
      logAffiliate: (event) =>
        set({
          affiliateLog: [{ at: Date.now(), ...event }, ...get().affiliateLog].slice(0, 40),
        }),
      setListing: (listingRaw, extras) =>
        set({
          listingRaw,
          listingTitle: extras?.title ?? null,
          listingPrice: extras?.price ?? null,
          listingImage: extras?.image ?? null,
          listingBrand: extras?.brand ?? null,
          listingMemory: extras?.memory ?? null,
          listingVram: extras?.vram ?? null,
        }),
    }),
    {
      name: "forge-hardware-v2",
      skipHydration: true,
      partialize: (s) => ({
        locale: s.locale,
        entry: s.entry,
        focusHardwareId: s.focusHardwareId,
        pool: s.pool,
        slotAId: s.slotAId,
        slotBId: s.slotBId,
        slotCId: s.slotCId,
        modelParamSize: s.modelParamSize,
        quantization: s.quantization,
        context: s.context,
        presetId: s.presetId,
        amazonTag: s.amazonTag,
        affiliateLog: s.affiliateLog,
        listingRaw: s.listingRaw,
        listingTitle: s.listingTitle,
        listingPrice: s.listingPrice,
        listingImage: s.listingImage,
        listingBrand: s.listingBrand,
        listingMemory: s.listingMemory,
        listingVram: s.listingVram,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ForgeState>;
        const customs = (p.pool ?? []).filter((h) => h.custom);
        return {
          ...current,
          ...p,
          pool: [...DEFAULT_HARDWARE, ...customs],
        };
      },
    },
  ),
);

export function slotHardware(state: ForgeState, slot: SlotId): Hardware {
  const id = slot === "A" ? state.slotAId : slot === "B" ? state.slotBId : state.slotCId;
  return findHardware(state.pool, id) ?? state.pool[0] ?? DEFAULT_HARDWARE[0]!;
}

export function useSlot(slot: SlotId): Hardware {
  return useForgeStore((s) => slotHardware(s, slot));
}

export function useAffiliateTags(): AffiliateTags {
  const amazon = useForgeStore((s) => s.amazonTag);
  return amazon ? { amazon } : EMPTY_TAGS;
}
