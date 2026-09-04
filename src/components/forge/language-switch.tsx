import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useForgeStore } from "@/lib/store";
import type { Locale } from "@/i18n";
import i18n from "@/i18n";

export function LanguageSwitch() {
  const { t } = useTranslation();
  const locale = useForgeStore((s) => s.locale);
  const setLocale = useForgeStore((s) => s.setLocale);

  const set = (next: Locale) => {
    setLocale(next);
    void i18n.changeLanguage(next);
    if (typeof document !== "undefined") document.documentElement.lang = next;
  };

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex h-9 items-center rounded-full bg-secondary p-0.5"
    >
      {(["fr", "en"] as const).map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => set(lng)}
          className={cn(
            "min-h-8 min-w-10 rounded-full px-2.5 text-xs font-medium transition-colors duration-150",
            locale === lng ? "bg-surface text-fg shadow-[var(--shadow-border)]" : "text-muted hover:text-fg",
          )}
        >
          {t(`lang.${lng}`)}
        </button>
      ))}
    </div>
  );
}
