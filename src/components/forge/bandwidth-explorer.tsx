import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  arithmeticIntensity,
  computeCeilingToks,
  generationSeconds,
  memoryCeilingToks,
  ridgePoint,
  type SlotAnalysis,
} from "@/lib/calc";
import { formatNumber, formatDuration, cn } from "@/lib/utils";
import { localeTag } from "@/i18n";

const GEN_TOKENS = 512;
const BW_MAX = 3600;

export function BandwidthExplorer({
  slots,
  modelWeightGB,
  paramsB,
  bytesPerParam,
}: {
  slots: SlotAnalysis[];
  modelWeightGB: number;
  paramsB: number;
  bytesPerParam: number;
}) {
  const { t, i18n } = useTranslation();
  const slotA = slots[0];
  const [whatIf, setWhatIf] = useState(slotA?.data.bandwidth ?? 1000);

  useEffect(() => {
    if (slotA?.data.bandwidth) setWhatIf(slotA.data.bandwidth);
  }, [slotA?.data.id, slotA?.data.bandwidth]);

  const intensity = arithmeticIntensity(bytesPerParam);
  const whatIfToks = memoryCeilingToks(whatIf, modelWeightGB, 1);
  const whatIfSeconds = generationSeconds(whatIfToks, GEN_TOKENS);

  const curve = useMemo(() => {
    const rows: Array<{ bw: number; mem: number }> = [];
    for (let bw = 0; bw <= BW_MAX; bw += 60) {
      rows.push({ bw, mem: Math.round(memoryCeilingToks(bw, modelWeightGB, 1)) });
    }
    return rows;
  }, [modelWeightGB]);

  const markers = slots
    .filter((s) => s.fits)
    .map((s) => ({
      bw: s.data.bandwidth,
      tok: s.speed,
      name: s.data.name,
      id: s.id,
    }));

  const maxCompute = Math.max(...slots.map((s) => s.computeToks), 1);
  const roofY = Math.min(maxCompute, memoryCeilingToks(BW_MAX, modelWeightGB, 1) * 1.15);
  void i18n.language;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{t("bw.title")}</CardTitle>
        <CardDescription>{t("bw.desc", { intensity: formatNumber(intensity, 1) })}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Insight slots={slots} paramsB={paramsB} modelWeightGB={modelWeightGB} />

        <div className="h-64 min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="bw"
                type="number"
                domain={[0, BW_MAX]}
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => String(v)}
              />
              <YAxis
                type="number"
                domain={[0, Math.ceil(roofY / 50) * 50 || 100]}
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip
                cursor={{ stroke: "var(--color-border-strong)" }}
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 16,
                  color: "var(--color-fg)",
                  fontSize: 12,
                }}
                formatter={(value, name) => {
                  const n = typeof value === "number" ? value : Number(value);
                  if (name === "tok") return [`${Math.round(n)} tok/s`, t("bw.tooltipSlot")];
                  return [`${Math.round(n)} tok/s`, t("bw.tooltipMem")];
                }}
                labelFormatter={(label, payload) => {
                  const bw = payload?.[0]?.payload?.bw ?? label;
                  return `${bw} Go/s`;
                }}
              />
              <Line
                type="monotone"
                dataKey="mem"
                stroke="var(--color-signal)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Scatter data={markers} dataKey="tok" fill="var(--color-primary)" isAnimationActive={false} />
              <ReferenceLine x={whatIf} stroke="var(--color-primary)" strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted">{t("bw.curve")}</p>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="whatif">{t("bw.whatIf")}</Label>
            <span className="font-mono text-sm tabular-nums">{whatIf} Go/s</span>
          </div>
          <Slider
            id="whatif"
            min={80}
            max={BW_MAX}
            step={16}
            value={[whatIf]}
            onValueChange={(v) => setWhatIf(v[0] ?? 1000)}
          />
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setWhatIf(s.data.bandwidth)}
                className={cn(
                  "min-h-11 rounded-full border px-3 text-xs transition-colors duration-150",
                  whatIf === s.data.bandwidth
                    ? "border-primary bg-primary text-primary-fg"
                    : "border-border text-muted hover:border-border-strong hover:text-fg",
                )}
              >
                Slot {s.id} · {s.data.bandwidth} Go/s
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-secondary p-4 sm:grid-cols-4">
            <Stat label={t("bw.simulated")} value={`${Math.round(whatIfToks)} tok/s`} />
            <Stat label={t("bw.tokens", { count: GEN_TOKENS })} value={formatDuration(whatIfSeconds)} />
            <Stat
              label={t("bw.gain")}
              value={slotA && slotA.speed ? `×${formatNumber(whatIfToks / slotA.speed, 2)}` : "—"}
            />
            <Stat label={t("bw.perGb")} value={`+${formatNumber(1 / Math.max(modelWeightGB, 0.01), 1)}`} />
          </div>
        </div>

        <div className="min-w-0">
          <div className="hidden min-w-0 overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-border text-xs text-muted">
                <tr>
                  <th className="py-2 pr-3 font-medium">Slot</th>
                  <th className="py-2 pr-3 font-medium">Go/s</th>
                  <th className="py-2 pr-3 font-medium">{t("bw.mem")}</th>
                  <th className="py-2 pr-3 font-medium">{t("bw.compute")}</th>
                  <th className="py-2 pr-3 font-medium">{t("bw.bound")}</th>
                  <th className="py-2 pr-3 font-medium">{GEN_TOKENS} tok</th>
                  <th className="py-2 font-medium">{t("bw.ridge")}</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => (
                  <BoundRow key={s.id} s={s} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col divide-y divide-border md:hidden">
            {slots.map((s) => (
              <MobileBound key={s.id} s={s} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function boundLabel(s: SlotAnalysis, t: (k: string) => string) {
  if (!s.fits) return t("slot.noVram");
  return s.memoryBound ? t("bw.mem") : t("bw.compute");
}

function BoundRow({ s }: { s: SlotAnalysis }) {
  const { t } = useTranslation();
  const ridge = ridgePoint(s.data.tflops, s.data.bandwidth);
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2.5 pr-3 font-medium">
        {s.id}
        <span className="ml-2 text-xs font-normal text-muted">{s.data.name}</span>
      </td>
      <td className="py-2.5 pr-3 font-mono tabular-nums">{s.data.bandwidth}</td>
      <td className="py-2.5 pr-3 font-mono tabular-nums">{s.fits ? s.speed : "—"}</td>
      <td className="py-2.5 pr-3 font-mono tabular-nums">
        {Math.round(s.computeToks).toLocaleString(localeTag())}
      </td>
      <td className="py-2.5 pr-3">
        <Badge variant={!s.fits ? "danger" : s.memoryBound ? "signal" : "warn"}>{boundLabel(s, t)}</Badge>
      </td>
      <td className="py-2.5 pr-3 font-mono tabular-nums">
        {s.fits ? formatDuration(generationSeconds(s.speed, GEN_TOKENS)) : "—"}
      </td>
      <td className="py-2.5 font-mono tabular-nums text-muted">{formatNumber(ridge, 0)} FLOP/o</td>
    </tr>
  );
}

function MobileBound({ s }: { s: SlotAnalysis }) {
  const { t } = useTranslation();
  const ridge = ridgePoint(s.data.tflops, s.data.bandwidth);
  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate font-medium">
          {s.id} · {s.data.name}
        </p>
        <Badge variant={!s.fits ? "danger" : s.memoryBound ? "signal" : "warn"}>{boundLabel(s, t)}</Badge>
      </div>
      <p className="font-mono text-xs tabular-nums text-muted">
        {s.data.bandwidth} Go/s · {s.fits ? `${s.speed} tok/s` : "—"} · {t("bw.compute")}{" "}
        {Math.round(s.computeToks).toLocaleString(localeTag())} ·{" "}
        {s.fits ? formatDuration(generationSeconds(s.speed, GEN_TOKENS)) : "—"} · {t("bw.ridge")}{" "}
        {formatNumber(ridge, 0)} FLOP/o
      </p>
    </div>
  );
}

function Insight({
  slots,
  paramsB,
  modelWeightGB,
}: {
  slots: SlotAnalysis[];
  paramsB: number;
  modelWeightGB: number;
}) {
  const { t } = useTranslation();
  const fitted = slots.filter((s) => s.fits);
  const sample = fitted[0] ?? slots[0];
  if (!sample) return null;
  const ratio = sample.intensityHeadroom;
  const compute = computeCeilingToks(sample.data.tflops, paramsB);
  const mem = memoryCeilingToks(sample.data.bandwidth, modelWeightGB, 1);

  if (!sample.fits) {
    return (
      <p className="rounded-xl bg-secondary px-4 py-3 text-sm leading-relaxed text-muted">
        {t("bw.insightNone")}
      </p>
    );
  }

  const values = {
    name: sample.data.name,
    compute: Math.round(compute).toLocaleString(localeTag()),
    mem: Math.round(mem),
    ratio: formatNumber(ratio, 0),
  };

  return (
    <p className="rounded-xl bg-secondary px-4 py-3 text-sm leading-relaxed">
      {ratio >= 2 ? t("bw.insightGap", values) : t("bw.insightClose", values)}
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
