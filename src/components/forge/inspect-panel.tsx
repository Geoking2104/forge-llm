import { ExternalLink, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ParsedProduct } from "@/lib/parser";
import { parsedToHardware } from "@/lib/parser";
import { tokensPerSec, vramFits } from "@/lib/calc";
import { suggestCheaperEquivalents } from "@/lib/suggest";
import { formatEur, formatNumber, cn } from "@/lib/utils";
import { useAffiliateTags, useForgeStore } from "@/lib/store";
import type { Hardware } from "@/lib/hardware";
import { retailerByHost, RETAILERS } from "@/lib/retailers";
import { listingBuyUrl } from "@/lib/affiliate";
import { ShopMenu } from "./shop-links";
import { ProductPhoto } from "./product-art";

function hostRetailer(url: string | null) {
  if (!url) return null;
  try {
    return retailerByHost(new URL(url).hostname);
  } catch {
    return null;
  }
}

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
  const setFocus = useForgeStore((s) => s.setFocusHardware);
  const setEntry = useForgeStore((s) => s.setEntry);
  const setListing = useForgeStore((s) => s.setListing);
  const tags = useAffiliateTags();
  const log = useForgeStore((s) => s.logAffiliate);

  const hw = parsedToHardware(parsed);
  const fits = vramFits(hw, requiredVram);
  const speed = tokensPerSec(hw, modelWeightGB);
  const listedPrice = parsed.priceExact ? parsed.priceNum : 0;
  const alts = suggestCheaperEquivalents(hw, listedPrice, pool, requiredVram, modelWeightGB);

  const retailer =
    (parsed.retailerId ? RETAILERS.find((r) => r.id === parsed.retailerId) : null) ??
    hostRetailer(parsed.url);
  const buyHref = listingBuyUrl(parsed.url, retailer, tags, parsed.name, parsed.asin);

  const inject = () => {
    addHardware(hw);
    setFocus(hw.id);
    setEntry("model");
  };

  const chips = [
    `${hw.vram} Go`,
    parsed.memory,
    `${formatNumber(hw.bandwidth)} Go/s`,
    parsed.brand,
  ].filter(Boolean) as string[];

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent className="p-0">
        <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <ProductPhoto src={parsed.image} alt={parsed.name} className="rounded-none" />
          <div className="flex min-w-0 flex-col gap-5 p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-widest text-muted">{parsed.site}</p>
                <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-pretty">
                  {parsed.name}
                </h2>
              </div>
              <button
                type="button"
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-secondary hover:text-fg"
                aria-label={t("parser.clear")}
                onClick={() => setListing("")}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant={fits ? "ok" : "danger"}>
                {fits ? t("recommend.fits") : t("recommend.tooBig")}
              </Badge>
              <Badge variant={parsed.matched ? "ok" : "warn"}>
                {parsed.matched ? t("parser.sku") : t("parser.estimate")}
              </Badge>
            </div>

            {chips.length > 0 ? (
              <p className="font-mono text-xs tabular-nums text-muted">{chips.join(" · ")}</p>
            ) : null}

            <dl className="grid grid-cols-3 gap-3">
              <Stat
                label={t("parser.toks")}
                value={fits ? String(speed) : "—"}
                hint={`${formatNumber(requiredVram, 1)} Go ${t("model.vram").toLowerCase()}`}
                ok={fits}
              />
              <Stat label={t("parser.flops")} value={formatNumber(hw.tflops)} hint="TFLOPS" />
              <Stat
                label={t("parser.priceExact")}
                value={parsed.priceExact ? formatEur(parsed.priceNum, true) : t("parser.noPrice")}
                hint={parsed.priceExact ? parsed.site : undefined}
              />
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={inject}>
                {t("parser.useStation")}
              </Button>
              {buyHref ? (
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={buyHref}
                    target="_blank"
                    rel="noopener noreferrer sponsored nofollow"
                    onClick={() =>
                      log({ retailer: retailer?.id ?? parsed.site, sku: hw.id, query: parsed.name })
                    }
                  >
                    {t("parser.buyThis")}
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t border-border px-6 py-6">
          <p className="font-display text-base font-semibold tracking-tight">{t("parser.shops")}</p>
          <p className="mt-1 text-sm text-muted">{t("parser.altsDesc")}</p>
          {parsed.priceExact && alts.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {alts.map((s) => (
                <DealCard
                  key={s.hardware.id}
                  hardware={s.hardware}
                  save={s.save}
                  modelWeightGB={modelWeightGB}
                  onLoad={() => {
                    addHardware(s.hardware);
                    setFocus(s.hardware.id);
                    setEntry("model");
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm text-muted">{t("parser.noAlts")}</p>
          )}
        </div>
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

function DealCard({
  hardware,
  save,
  modelWeightGB,
  onLoad,
}: {
  hardware: Hardware;
  save: number;
  modelWeightGB: number;
  onLoad: () => void;
}) {
  const { t } = useTranslation();
  const speed = tokensPerSec(hardware, modelWeightGB);
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-secondary p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium leading-snug">{hardware.name}</p>
        <ShopMenu query={hardware.name} vendor={hardware.vendor} sku={hardware.id} />
      </div>
      <p className="font-display text-2xl font-semibold tabular-nums">{formatEur(hardware.priceNum)}</p>
      <p className="text-sm text-ok">{t("parser.whyDeal", { delta: formatEur(save) })}</p>
      <p className="font-mono text-xs tabular-nums text-muted">
        {speed} tok/s · {formatNumber(hardware.tflops)} TF · {hardware.vram} Go
      </p>
      <Button size="sm" variant="outline" onClick={onLoad}>
        {t("parser.useStation")}
      </Button>
    </div>
  );
}