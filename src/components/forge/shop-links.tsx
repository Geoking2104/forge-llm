import { ExternalLink, ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { retailersForVendor, type Retailer } from "@/lib/retailers";
import { isTagged, productOrSearchUrl, withAffiliate } from "@/lib/affiliate";
import { RETAILER_MARK } from "@/lib/product-images";
import { useAffiliateTags, useForgeStore } from "@/lib/store";

type ShopTarget = {
  query: string;
  vendor: string;
  sku: string;
  asin?: string | null;
};

export function ShopLinks({ query, vendor, sku, asin = null, compact = false }: ShopTarget & { compact?: boolean }) {
  const { t } = useTranslation();
  const tags = useAffiliateTags();
  const log = useForgeStore((s) => s.logAffiliate);
  const clicks = useForgeStore((s) => s.affiliateLog.length);
  const shops = retailersForVendor(vendor);
  const anyTagged = shops.some((r) => isTagged(tags, r));
  if (!query.trim()) return null;

  return (
    <div>
      {!compact ? (
        <>
          <p className="font-display text-base font-semibold tracking-tight">{t("parser.shops")}</p>
          <p className="mt-1 text-sm text-muted">{t("parser.shopsDesc")}</p>
        </>
      ) : null}
      <div className={compact ? "flex flex-col gap-2" : "mt-3 grid gap-3 sm:grid-cols-2"}>
        {shops.map((r) => (
          <ShopCard
            key={r.id}
            retailer={r}
            compact={compact}
            href={withAffiliate(productOrSearchUrl(r, query.trim(), asin), r, tags)}
            tagged={isTagged(tags, r)}
            onShop={() => log({ retailer: r.id, sku, query: query.trim() })}
          />
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        {anyTagged ? t("parser.disclosure") : t("parser.disclosureOff")}{" "}
        {clicks > 0 ? t("parser.clicks", { count: clicks }) : null}
      </p>
    </div>
  );
}

export function ShopMenu({ query, vendor, sku, asin = null }: ShopTarget) {
  const { t } = useTranslation();
  const tags = useAffiliateTags();
  const log = useForgeStore((s) => s.logAffiliate);
  const shops = retailersForVendor(vendor);
  if (!query.trim()) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("custom.searchBuy")}>
          <ShoppingBag className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {shops.map((r) => (
          <DropdownMenuItem key={r.id} asChild>
            <a
              href={withAffiliate(productOrSearchUrl(r, query.trim(), asin), r, tags)}
              target="_blank"
              rel="noopener noreferrer sponsored nofollow"
              onClick={() => log({ retailer: r.id, sku, query: query.trim() })}
            >
              <img src={RETAILER_MARK[r.id]} alt="" className="size-5 rounded-sm" />
              {r.name}
              {isTagged(tags, r) ? (
                <span className="ml-auto text-xs text-muted">{t("parser.affiliate")}</span>
              ) : null}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ShopCard({
  retailer,
  href,
  tagged,
  onShop,
  compact,
}: {
  retailer: Retailer;
  href: string;
  tagged: boolean;
  onShop: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const firstAdv = retailer.advantageKeys[0];
  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored nofollow"
        onClick={onShop}
        className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-secondary px-3 py-2 text-sm transition-colors duration-150 hover:bg-accent"
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <img src={RETAILER_MARK[retailer.id]} alt="" className="size-7 shrink-0 rounded-md" />
          <span className="min-w-0 truncate">
            <span className="font-medium">{retailer.name}</span>
            {firstAdv ? <span className="ml-2 text-muted">{t(`parser.adv.${firstAdv}`)}</span> : null}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
          {tagged ? t("parser.affiliate") : t("custom.searchBuy")}
          <ExternalLink className="size-3.5" />
        </span>
      </a>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-secondary p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <img src={RETAILER_MARK[retailer.id]} alt="" className="size-9 rounded-lg" />
          <p className="font-medium">{retailer.name}</p>
        </div>
        {tagged ? <Badge variant="signal">{t("parser.affiliate")}</Badge> : null}
      </div>
      <ul className="flex flex-col gap-1 text-sm text-muted">
        {retailer.advantageKeys.map((k) => (
          <li key={k}>{t(`parser.adv.${k}`)}</li>
        ))}
      </ul>
      <Button size="sm" variant="outline" className="mt-auto" asChild>
        <a href={href} target="_blank" rel="noopener noreferrer sponsored nofollow" onClick={onShop}>
          {t("parser.shop")}
          <ExternalLink className="size-3.5" />
        </a>
      </Button>
    </div>
  );
}
