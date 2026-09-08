import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VENDOR_LABEL, type Hardware } from "@/lib/hardware";
import { tokensPerSec, vramFits, valueScore } from "@/lib/calc";
import { formatEur, cn } from "@/lib/utils";
import { useForgeStore } from "@/lib/store";
import { ShopMenu } from "./shop-links";
import { ProductPhoto } from "./product-art";
import { hardwareImage } from "@/lib/product-images";

export function Catalog({
  modelWeightGB,
  requiredVram,
}: {
  modelWeightGB: number;
  requiredVram: number;
}) {
  const { t } = useTranslation();
  const pool = useForgeStore((s) => s.pool);
  const setSlot = useForgeStore((s) => s.setSlot);
  const removeHardware = useForgeStore((s) => s.removeHardware);

  const ranked = [...pool]
    .map((h) => {
      const fits = vramFits(h, requiredVram);
      const speed = tokensPerSec(h, modelWeightGB);
      return { h, fits, speed, value: fits ? valueScore(speed, h.priceNum) : 0 };
    })
    .sort((a, b) => {
      if (a.fits !== b.fits) return a.fits ? -1 : 1;
      return b.value - a.value;
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("catalog.title")}</CardTitle>
        <CardDescription>{t("catalog.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-border text-xs text-muted">
              <tr>
                <th className="px-6 py-2 font-medium">{t("catalog.config")}</th>
                <th className="px-3 py-2 font-medium">VRAM</th>
                <th className="px-3 py-2 font-medium">TFLOPS</th>
                <th className="px-3 py-2 font-medium">Go/s</th>
                <th className="px-3 py-2 font-medium">tok/s</th>
                <th className="px-3 py-2 font-medium">{t("slot.price")}</th>
                <th className="px-6 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ h, fits, speed }) => (
                <CatalogRow
                  key={h.id}
                  h={h}
                  fits={fits}
                  speed={speed}
                  onLoad={setSlot}
                  onRemove={removeHardware}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col divide-y divide-border md:hidden">
          {ranked.map(({ h, fits, speed }) => (
            <div key={h.id} className="flex flex-col gap-3 px-6 py-4">
              <div className="flex items-start gap-3">
                <ProductPhoto
                  src={hardwareImage(h)}
                  alt={h.name}
                  className="size-14 shrink-0 rounded-xl"
                  imgClassName="p-1"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{h.name}</p>
                  <p className="text-xs text-muted">{VENDOR_LABEL[h.vendor]}</p>
                </div>
                <FitBadge fits={fits} />
              </div>
              <p className="font-mono text-xs tabular-nums text-muted">
                {h.vram} Go · {h.tflops} TF · {h.bandwidth} Go/s · {fits ? `${speed} tok/s` : "—"} ·{" "}
                {formatEur(h.priceNum)}
              </p>
              <RowActions h={h} onLoad={setSlot} onRemove={removeHardware} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FitBadge({ fits }: { fits: boolean }) {
  return fits ? <Badge variant="ok">OK</Badge> : <Badge variant="danger">VRAM</Badge>;
}

function CatalogRow({
  h,
  fits,
  speed,
  onLoad,
  onRemove,
}: {
  h: Hardware;
  fits: boolean;
  speed: number;
  onLoad: (slot: "A" | "B" | "C", id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <tr className={cn("border-b border-border last:border-0", !fits && "opacity-60")}>
      <td className="px-6 py-3">
        <div className="flex items-center gap-3">
          <ProductPhoto
            src={hardwareImage(h)}
            alt={h.name}
            className="size-12 shrink-0 rounded-xl"
            imgClassName="p-1"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{h.name}</span>
              <FitBadge fits={fits} />
            </div>
            <p className="text-xs text-muted">{VENDOR_LABEL[h.vendor]}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 font-mono tabular-nums">{h.vram}</td>
      <td className="px-3 py-3 font-mono tabular-nums">{h.tflops}</td>
      <td className="px-3 py-3 font-mono tabular-nums">{h.bandwidth}</td>
      <td className="px-3 py-3 font-mono tabular-nums">{fits ? speed : "—"}</td>
      <td className="px-3 py-3 font-mono tabular-nums">{formatEur(h.priceNum)}</td>
      <td className="px-6 py-3">
        <RowActions h={h} onLoad={onLoad} onRemove={onRemove} />
      </td>
    </tr>
  );
}

function RowActions({
  h,
  onLoad,
  onRemove,
}: {
  h: Hardware;
  onLoad: (slot: "A" | "B" | "C", id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-1">
      {(["A", "B", "C"] as const).map((slot) => (
        <Button key={slot} variant="outline" size="sm" className="h-9 px-2.5" onClick={() => onLoad(slot, h.id)}>
          {slot}
        </Button>
      ))}
      <ShopMenu query={h.name} vendor={h.vendor} sku={h.id} />
      {h.custom ? (
        <Button variant="ghost" size="icon-sm" aria-label={t("catalog.remove")} onClick={() => onRemove(h.id)}>
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
