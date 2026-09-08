import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Hardware } from "@/lib/hardware";
import { VENDOR_LABEL } from "@/lib/hardware";
import type { SlotId } from "@/lib/calc";
import { tokensPerSec, vramFits, isMemoryBound } from "@/lib/calc";
import { formatEur, formatNumber, cn } from "@/lib/utils";
import { useForgeStore } from "@/lib/store";
import { ProductPhoto } from "./product-art";
import { hardwareImage } from "@/lib/product-images";

export function SlotCard({
  id,
  hardware,
  modelWeightGB,
  requiredVram,
  paramsB,
  isWinner,
  isValue,
}: {
  id: SlotId;
  hardware: Hardware;
  modelWeightGB: number;
  requiredVram: number;
  paramsB: number;
  isWinner: boolean;
  isValue: boolean;
}) {
  const { t } = useTranslation();
  const pool = useForgeStore((s) => s.pool);
  const setSlot = useForgeStore((s) => s.setSlot);
  const speed = tokensPerSec(hardware, modelWeightGB);
  const fits = vramFits(hardware, requiredVram);
  const memBound = isMemoryBound(hardware, paramsB, modelWeightGB);
  const fill = Math.min(100, (requiredVram / Math.max(hardware.vram, 0.1)) * 100);
  const vendor =
    hardware.vendor === "custom" ? t("vendor.custom") : VENDOR_LABEL[hardware.vendor];

  return (
    <Card
      className={cn(
        "flex flex-col gap-3 p-5 transition-shadow duration-150",
        isWinner && "shadow-[var(--shadow-border-hover)] ring-2 ring-primary/50",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs tracking-widest text-muted">SLOT {id}</span>
        <div className="flex gap-1">
          {isWinner ? <Badge variant="ok">{t("slot.winner")}</Badge> : null}
          {isValue ? <Badge variant="signal">{t("slot.value")}</Badge> : null}
        </div>
      </div>
      <Select value={hardware.id} onValueChange={(v) => setSlot(id, v)}>
        <SelectTrigger className="h-10 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pool.map((h) => (
            <SelectItem key={h.id} value={h.id}>
              {h.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ProductPhoto src={hardwareImage(hardware)} alt={hardware.name} className="rounded-xl" imgClassName="p-2" />
      <div>
        <p className="text-xs text-muted">{t("slot.throughput")}</p>
        <p className={cn("font-display text-3xl font-semibold tabular-nums", !fits && "text-muted")}>
          {fits ? speed : "—"}
          {fits ? <span className="ml-1 text-sm font-normal text-muted">tok/s</span> : null}
        </p>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted">VRAM</span>
          <span className="font-mono tabular-nums">
            {formatNumber(requiredVram, 1)} / {hardware.vram} Go
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full", fits ? "bg-ok" : "bg-danger")}
            style={{ width: `${Math.min(fill, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs">
          {fits ? (
            <span className="text-ok">{memBound ? t("slot.memBound") : t("slot.computeBound")}</span>
          ) : (
            <span className="text-danger">{t("slot.noVram")}</span>
          )}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-subtle">{t("slot.tensors")}</dt>
          <dd className="font-mono tabular-nums">{hardware.tflops} TF</dd>
        </div>
        <div>
          <dt className="text-subtle">{t("slot.bandwidth")}</dt>
          <dd className="font-mono tabular-nums">{hardware.bandwidth} Go/s</dd>
        </div>
        <div>
          <dt className="text-subtle">{t("slot.vendor")}</dt>
          <dd>{vendor}</dd>
        </div>
        <div>
          <dt className="text-subtle">{t("slot.price")}</dt>
          <dd className="font-mono tabular-nums text-ok">{formatEur(hardware.priceNum)}</dd>
        </div>
      </dl>
    </Card>
  );
}
