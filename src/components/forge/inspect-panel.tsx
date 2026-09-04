import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ParsedProduct } from "@/lib/parser";
import { parsedToHardware } from "@/lib/parser";
import { tokensPerSec, generationSeconds, vramFits } from "@/lib/calc";
import { suggestAlternatives } from "@/lib/suggest";
import { formatEur, formatNumber, formatDuration, cn } from "@/lib/utils";
import { useForgeStore } from "@/lib/store";
import type { Hardware } from "@/lib/hardware";
import { ShopLinks } from "./shop-links";

export function InspectPanel({
  parsed,
  modelWeightGB,
  requiredVram,
}: {
  parsed: ParsedProduct;
  modelWeightGB: number;
  requiredVram: number;
}) {
  const { t } = useTranslation();
  const pool = useForgeStore((s) => s.pool);
  const addHardware = useForgeStore((s) => s.addHardware);
  const setSlot = useForgeStore((s) => s.setSlot);
  const setFocus = useForgeStore((s) => s.setFocusHardware);
  const setEntry = useForgeStore((s) => s.setEntry);
  const hw = parsed.matched ?? parsedToHardware(parsed);
  const fits = vramFits(hw, requiredVram);
  const speed = tokensPerSec(hw, modelWeightGB);
  const alts = parsed.matched ? suggestAlternatives(parsed.matched, pool, requiredVram, modelWeightGB) : [];

  const inject = (slot?: "A" | "B" | "C") => {
    addHardware(hw);
    if (slot) setSlot(slot, hw.id);
  };

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{parsed.name}</CardTitle>
            <CardDescription className="mt-1">
              {parsed.site}
              {parsed.asin ? ` · ASIN ${parsed.asin}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant={parsed.matched ? "ok" : "warn"}>
              {parsed.matched ? t("parser.sku") : t("parser.estimate")}
            </Badge>
            {fits ? <Badge variant="ok">{t("recommend.fits")}</Badge> : <Badge variant="danger">VRAM</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted">{t("parser.vsModel")}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="VRAM"
              value={`${hw.vram} Go`}
              hint={`${formatNumber(requiredVram, 1)} Go ${t("model.vram").toLowerCase()}`}
              ok={fits}
            />
            <Stat label="tok/s" value={fits ? String(speed) : "—"} hint={formatDuration(generationSeconds(speed, 512))} />
            <Stat label="Go/s" value={String(hw.bandwidth)} />
            <Stat label={t("slot.price")} value={formatEur(parsed.priceNum)} />
          </dl>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => inject("A")}>
            Slot A
          </Button>
          <Button size="sm" variant="secondary" onClick={() => inject("B")}>
            Slot B
          </Button>
          <Button size="sm" variant="secondary" onClick={() => inject("C")}>
            Slot C
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              addHardware(hw);
              setFocus(hw.id);
              setEntry("model");
            }}
          >
            {t("parser.useStation")}
          </Button>
        </div>

        <ShopLinks query={parsed.matched?.name ?? parsed.name} asin={parsed.asin} vendor={hw.vendor} sku={hw.id} />

        {alts.length > 0 ? (
          <div>
            <p className="font-display text-base font-semibold tracking-tight">{t("parser.alts")}</p>
            <p className="mt-1 text-sm text-muted">{t("parser.altsDesc")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {alts.map((s) => (
                <AltCard
                  key={s.hardware.id}
                  kind={s.kind}
                  hardware={s.hardware}
                  current={hw}
                  modelWeightGB={modelWeightGB}
                  onLoad={() => {
                    addHardware(s.hardware);
                    setSlot("B", s.hardware.id);
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  hint,
  ok,
}: {
  label: string;
  value: string;
  hint?: string;
  ok?: boolean;
}) {
  return (
    <div className="rounded-xl bg-secondary p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("mt-1 font-display text-lg font-semibold tabular-nums", ok === false && "text-danger")}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 font-mono text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function AltCard({
  kind,
  hardware,
  current,
  modelWeightGB,
  onLoad,
}: {
  kind: "cheaper" | "vram" | "faster" | "value";
  hardware: Hardware;
  current: Hardware;
  modelWeightGB: number;
  onLoad: () => void;
}) {
  const { t } = useTranslation();
  const why =
    kind === "cheaper"
      ? t("parser.whyCheaper", { delta: Math.max(0, current.priceNum - hardware.priceNum) })
      : kind === "vram"
        ? t("parser.whyVram", { vram: hardware.vram, from: current.vram })
        : kind === "faster"
          ? t("parser.whyFaster", { bw: hardware.bandwidth, from: current.bandwidth })
          : t("parser.whyValue");
  const speed = tokensPerSec(hardware, modelWeightGB);

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-secondary p-4">
      <p className="text-xs font-medium tracking-widest text-muted">{t(`parser.kind.${kind}`)}</p>
      <p className="font-medium leading-snug">{hardware.name}</p>
      <p className="font-display text-2xl font-semibold tabular-nums">
        {speed}
        <span className="ml-1 text-sm font-medium text-muted">tok/s</span>
      </p>
      <p className="text-sm text-muted">{why}</p>
      <p className="font-mono text-xs tabular-nums text-muted">
        {hardware.vram} Go · {hardware.bandwidth} Go/s · {formatEur(hardware.priceNum)}
      </p>
      <Button size="sm" variant="outline" onClick={onLoad}>
        Slot B
      </Button>
    </div>
  );
}
