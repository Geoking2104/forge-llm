import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MODEL_PRESETS } from "@/lib/models";
import {
  bytesForQuant,
  generationSeconds,
  requiredVramGB,
  tokensPerSec,
  vramFits,
  weightGB,
} from "@/lib/calc";
import { findHardware, VENDOR_LABEL } from "@/lib/hardware";
import { useForgeStore } from "@/lib/store";
import { cn, formatEur, formatNumber, formatDuration } from "@/lib/utils";

const SNAPPY = 15;
const GEN = 512;

export function ModelForStation() {
  const { t } = useTranslation();
  const pool = useForgeStore((s) => s.pool);
  const focusHardwareId = useForgeStore((s) => s.focusHardwareId);
  const setFocusHardware = useForgeStore((s) => s.setFocusHardware);
  const applyPreset = useForgeStore((s) => s.applyPreset);
  const quantization = useForgeStore((s) => s.quantization);
  const context = useForgeStore((s) => s.context);

  const hw = findHardware(pool, focusHardwareId) ?? pool[0];
  const bytes = bytesForQuant(quantization);

  const ranked = useMemo(() => {
    if (!hw) return [];
    return MODEL_PRESETS.map((m) => {
      const required = requiredVramGB(m.paramsB, bytes, context);
      const speed = tokensPerSec(hw, weightGB(m.paramsB, bytes));
      const fits = vramFits(hw, required);
      return { m, required, speed, fits };
    }).sort((a, b) => {
      if (a.fits !== b.fits) return a.fits ? -1 : 1;
      return b.m.paramsB - a.m.paramsB;
    });
  }, [hw, bytes, context]);

  const largest = ranked.find((r) => r.fits) ?? null;
  const snappy =
    [...ranked].filter((r) => r.fits && r.speed >= SNAPPY).sort((a, b) => b.speed - a.speed)[0] ??
    [...ranked].filter((r) => r.fits).sort((a, b) => b.speed - a.speed)[0] ??
    null;

  if (!hw) return null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("recommend.pickTitle")}</CardTitle>
          <CardDescription>{t("recommend.pickDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pool.map((h) => {
              const selected = h.id === hw.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setFocusHardware(h.id)}
                  className={cn(
                    "flex min-h-24 flex-col items-start gap-1 rounded-xl bg-secondary p-4 text-left transition-[transform,box-shadow] duration-150 ease-[var(--ease-smooth-out)] hover:-translate-y-0.5",
                    selected && "bg-surface shadow-[var(--shadow-border-hover)] ring-2 ring-primary",
                  )}
                >
                  <span className="text-xs text-muted">{VENDOR_LABEL[h.vendor]}</span>
                  <span className="line-clamp-2 text-sm font-medium leading-snug">{h.name}</span>
                  <span className="mt-auto font-mono text-xs tabular-nums text-muted">
                    {h.vram} Go · {h.bandwidth} Go/s
                  </span>
                </button>
              );
            })}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="VRAM" value={`${hw.vram} Go`} />
            <Stat label="Go/s" value={String(hw.bandwidth)} />
            <Stat label="TFLOPS" value={String(hw.tflops)} />
            <Stat label={t("slot.price")} value={formatEur(hw.priceNum)} />
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <WinnerCard
          kicker={t("recommend.largest")}
          name={largest?.m.name ?? "—"}
          meta={largest ? `${largest.m.paramsB}B · ${largest.speed} tok/s` : t("recommend.noFit")}
        />
        <WinnerCard
          kicker={`${t("recommend.snappy")} · ${t("recommend.snappyHint")}`}
          name={snappy?.m.name ?? "—"}
          meta={snappy ? `${snappy.speed} tok/s · ${formatDuration(generationSeconds(snappy.speed, GEN))}` : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("recommend.resultsTitle")}</CardTitle>
          <CardDescription>{t("recommend.resultsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {ranked.map(({ m, required, speed, fits }) => (
            <button
              key={m.id}
              type="button"
              onClick={() => applyPreset(m.id)}
              className={cn(
                "flex flex-col gap-3 rounded-xl bg-secondary p-5 text-left transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]",
                !fits && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted">{m.family}</p>
                  <p className="font-display text-lg font-semibold tracking-tight">{m.name}</p>
                </div>
                <Badge variant={fits ? "ok" : "danger"}>
                  {fits ? t("recommend.fits") : t("recommend.tooBig")}
                </Badge>
              </div>
              <p className="font-display text-3xl font-semibold tabular-nums tracking-tight">
                {fits ? speed : "—"}
                {fits ? <span className="ml-1 text-sm font-medium text-muted">tok/s</span> : null}
              </p>
              <p className="font-mono text-xs tabular-nums text-muted">
                {t("recommend.need")} {formatNumber(required, 1)} / {hw.vram} Go · {t("recommend.time")}{" "}
                {fits ? formatDuration(generationSeconds(speed, GEN)) : "—"}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function WinnerCard({ kicker, name, meta }: { kicker: string; name: string; meta: string }) {
  return (
    <Card className="p-6">
      <p className="text-xs font-medium tracking-widest text-muted">{kicker}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight">{name}</p>
      <p className="mt-1 font-mono text-sm tabular-nums text-muted">{meta}</p>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
