import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppHeader } from "./app-header";
import { EntryGate } from "./entry-gate";
import { ModelPanel } from "./model-panel";
import { SlotCard } from "./slot-card";
import { AnalysisBanner } from "./analysis-banner";
import { BandwidthExplorer } from "./bandwidth-explorer";
import { Catalog } from "./catalog";
import { ParserPanel } from "./parser-panel";
import { CustomSheet } from "./custom-sheet";
import { FormulaNotes } from "./formula-notes";
import { ModelForStation } from "./model-for-station";
import { InspectPanel } from "./inspect-panel";
import { bytesForQuant, compareSlots, requiredVramGB, weightGB } from "@/lib/calc";
import { parseProductText } from "@/lib/parser";
import { slotHardware, useForgeStore } from "@/lib/store";
import i18n from "@/i18n";

export function ForgeApp() {
  const { t } = useTranslation();
  const [customOpen, setCustomOpen] = useState(false);
  const setHydrated = useForgeStore((s) => s.setHydrated);
  const modelParamSize = useForgeStore((s) => s.modelParamSize);
  const quantization = useForgeStore((s) => s.quantization);
  const context = useForgeStore((s) => s.context);
  const entry = useForgeStore((s) => s.entry);
  const state = useForgeStore();

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(useForgeStore.persist.rehydrate()).then(
      () => {
        if (cancelled) return;
        const lng = useForgeStore.getState().locale;
        void i18n.changeLanguage(lng);
        if (typeof document !== "undefined") document.documentElement.lang = lng;
        setHydrated(true);
      },
      () => {
        if (!cancelled) setHydrated(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [setHydrated]);

  const bytes = bytesForQuant(quantization);
  const modelWeight = weightGB(modelParamSize, bytes);
  const required = requiredVramGB(modelParamSize, bytes, context);

  const slotA = slotHardware(state, "A");
  const slotB = slotHardware(state, "B");
  const slotC = slotHardware(state, "C");

  const listingRaw = useForgeStore((s) => s.listingRaw);
  const listingTitle = useForgeStore((s) => s.listingTitle);
  const listingPrice = useForgeStore((s) => s.listingPrice);
  const pool = useForgeStore((s) => s.pool);
  const parsedListing = listingRaw.trim()
    ? parseProductText(listingRaw, pool, { title: listingTitle, price: listingPrice })
    : null;

  const analysis = useMemo(
    () => compareSlots(slotA, slotB, slotC, modelWeight, required, modelParamSize),
    [slotA, slotB, slotC, modelWeight, required, modelParamSize],
  );

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <AppHeader onAddCustom={() => setCustomOpen(true)} />
      {entry === "choose" ? (
        <EntryGate />
      ) : entry === "model" ? (
        <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
          <Hero kicker={t("brand.kicker")} title={t("hero.modelTitle")} body={t("hero.modelBody")} />
          <div className="grid min-w-0 gap-6 lg:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-1">
              <ModelPanel />
              <ParserPanel />
              <FormulaNotes />
            </div>
            <div className="min-w-0 lg:col-span-2">
              {parsedListing ? (
                <div className="mb-6">
                  <InspectPanel
                    parsed={parsedListing}
                    modelWeightGB={modelWeight}
                    requiredVram={required}
                  />
                </div>
              ) : null}
              <ModelForStation />
            </div>
          </div>
        </main>
      ) : (
        <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
          <Hero kicker={t("brand.kicker")} title={t("hero.stationTitle")} body={t("hero.stationBody")} />
          <div className="grid min-w-0 gap-6 lg:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-1">
              <ModelPanel />
              <ParserPanel />
              <FormulaNotes />
            </div>
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
              {parsedListing ? (
                <InspectPanel
                  parsed={parsedListing}
                  modelWeightGB={modelWeight}
                  requiredVram={required}
                />
              ) : null}
              <div className="grid gap-3 sm:grid-cols-3">
                <SlotCard
                  id="A"
                  hardware={slotA}
                  modelWeightGB={modelWeight}
                  requiredVram={required}
                  paramsB={modelParamSize}
                  isWinner={analysis.winner?.id === "A"}
                  isValue={analysis.bestValue?.id === "A"}
                />
                <SlotCard
                  id="B"
                  hardware={slotB}
                  modelWeightGB={modelWeight}
                  requiredVram={required}
                  paramsB={modelParamSize}
                  isWinner={analysis.winner?.id === "B"}
                  isValue={analysis.bestValue?.id === "B"}
                />
                <SlotCard
                  id="C"
                  hardware={slotC}
                  modelWeightGB={modelWeight}
                  requiredVram={required}
                  paramsB={modelParamSize}
                  isWinner={analysis.winner?.id === "C"}
                  isValue={analysis.bestValue?.id === "C"}
                />
              </div>
              <AnalysisBanner analysis={analysis} />
              <BandwidthExplorer
                slots={analysis.slots}
                modelWeightGB={modelWeight}
                paramsB={modelParamSize}
                bytesPerParam={bytes}
              />
              <Catalog modelWeightGB={modelWeight} requiredVram={required} />
            </div>
          </div>
        </main>
      )}
      <CustomSheet open={customOpen} onOpenChange={setCustomOpen} />
    </div>
  );
}

function Hero({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <section className="max-w-2xl">
      <p className="text-xs font-medium tracking-widest text-muted">{kicker}</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">{body}</p>
    </section>
  );
}
