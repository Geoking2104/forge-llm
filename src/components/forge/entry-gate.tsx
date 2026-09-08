import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ModelArt, ProductPhoto } from "./product-art";
import { FEATURED_STATION_IMAGE } from "@/lib/product-images";
import { useForgeStore } from "@/lib/store";

export function EntryGate() {
  const { t } = useTranslation();
  const setEntry = useForgeStore((s) => s.setEntry);

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium tracking-widest text-muted">{t("entry.kicker")}</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("entry.title")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          {t("entry.subtitle")}
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <PathCard
          art={<ProductPhoto src={FEATURED_STATION_IMAGE} alt="RTX 5090" className="rounded-xl" />}
          title={t("entry.stationTitle")}
          body={t("entry.stationBody")}
          cta={t("entry.stationCta")}
          onClick={() => setEntry("station")}
        />
        <PathCard
          art={<ModelArt />}
          title={t("entry.modelTitle")}
          body={t("entry.modelBody")}
          cta={t("entry.modelCta")}
          onClick={() => setEntry("model")}
        />
      </div>
    </section>
  );
}

function PathCard({
  art,
  title,
  body,
  cta,
  onClick,
}: {
  art: ReactNode;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl bg-surface text-left shadow-[var(--shadow-border)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-smooth-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-border-hover)]"
    >
      <div className="p-5 pb-0">{art}</div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm leading-relaxed text-muted">{body}</p>
        <span className="mt-auto inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary">
          {cta}
          <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}
