import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import type { ComparisonResult } from "@/lib/calc";
import { cn } from "@/lib/utils";

export function AnalysisBanner({ analysis }: { analysis: ComparisonResult }) {
  const { t } = useTranslation();
  const failed = !analysis.winner;
  const rationale = !analysis.winner
    ? t("analysis.noneBody")
    : analysis.winner.id === analysis.bestValue?.id
      ? t("analysis.same", { slot: analysis.winner.id, speed: analysis.winner.speed })
      : t("analysis.split", {
          peak: analysis.winner.id,
          speed: analysis.winner.speed,
          value: analysis.bestValue?.id,
        });

  return (
    <Card className={cn("p-6", failed ? "ring-1 ring-danger/30" : "ring-1 ring-ok/25")}>
      <p className="text-xs font-medium tracking-widest text-muted">{t("analysis.kicker")}</p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs text-muted">{t("analysis.peak")}</p>
          <p className="font-display text-lg font-semibold tracking-tight">
            {analysis.winner
              ? `Slot ${analysis.winner.id} · ${analysis.winner.data.name}`
              : t("analysis.none")}
          </p>
          {analysis.winner ? (
            <p className="font-mono text-sm tabular-nums text-ok">~{analysis.winner.speed} tok/s</p>
          ) : null}
        </div>
        <div>
          <p className="text-xs text-muted">{t("analysis.value")}</p>
          <p className="font-display text-lg font-semibold tracking-tight">
            {analysis.bestValue
              ? `Slot ${analysis.bestValue.id} · ${analysis.bestValue.data.name}`
              : "—"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">{rationale}</p>
    </Card>
  );
}
