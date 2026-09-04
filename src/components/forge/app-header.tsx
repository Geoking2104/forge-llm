import { useRef, type ReactNode } from "react";
import { Download, MoreHorizontal, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ForgeMark } from "./logo";
import { LanguageSwitch } from "./language-switch";
import { useForgeStore } from "@/lib/store";
import { DEFAULT_HARDWARE } from "@/lib/hardware";
import { cn } from "@/lib/utils";

export function AppHeader({ onAddCustom }: { onAddCustom: () => void }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const pool = useForgeStore((s) => s.pool);
  const slotAId = useForgeStore((s) => s.slotAId);
  const slotBId = useForgeStore((s) => s.slotBId);
  const slotCId = useForgeStore((s) => s.slotCId);
  const entry = useForgeStore((s) => s.entry);
  const setEntry = useForgeStore((s) => s.setEntry);
  const replaceAll = useForgeStore((s) => s.replaceAll);
  const resetDefaults = useForgeStore((s) => s.resetDefaults);

  const exportJson = () => {
    const payload = { pool, configurations: { slotAId, slotBId, slotCId } };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forge-hardware.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("toast.exported"));
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        const nextPool = Array.isArray(json.pool) ? json.pool : DEFAULT_HARDWARE;
        const conf = json.configurations ?? {};
        replaceAll({
          pool: nextPool,
          slotAId: conf.slotAId ?? nextPool[0]?.id ?? slotAId,
          slotBId: conf.slotBId ?? nextPool[1]?.id ?? slotBId,
          slotCId: conf.slotCId ?? nextPool[2]?.id ?? slotCId,
        });
        toast.success(t("toast.imported"));
      } catch {
        toast.error(t("toast.invalid"));
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          className="flex min-w-0 items-center gap-3"
          onClick={() => setEntry("choose")}
        >
          <ForgeMark className="size-8 shrink-0" />
          <div className="min-w-0 text-left">
            <p className="font-display text-base font-semibold tracking-tight">{t("brand.name")}</p>
            <p className="hidden truncate text-xs text-muted sm:block">{t("brand.tagline")}</p>
          </div>
        </button>
        {entry !== "choose" ? (
          <div className="hidden items-center rounded-full bg-secondary p-0.5 md:flex">
            <ModeChip active={entry === "station"} onClick={() => setEntry("station")}>
              {t("mode.station")}
            </ModeChip>
            <ModeChip active={entry === "model"} onClick={() => setEntry("model")}>
              {t("mode.model")}
            </ModeChip>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          {entry !== "choose" ? (
            <>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={onAddCustom}>
                {t("nav.add")}
              </Button>
              <Button variant="secondary" size="sm" className="hidden lg:inline-flex" onClick={exportJson}>
                <Download />
                {t("nav.export")}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={t("nav.more")}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEntry("choose")}>{t("nav.home")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEntry("station")} className="md:hidden">
                    {t("mode.station")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEntry("model")} className="md:hidden">
                    {t("mode.model")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onAddCustom} className="sm:hidden">
                    {t("nav.addFull")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportJson} className="lg:hidden">
                    <Download className="size-4" /> {t("nav.exportFull")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => inputRef.current?.click()}>
                    <Upload className="size-4" /> {t("nav.import")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      resetDefaults();
                      toast.success(t("toast.reset"));
                    }}
                  >
                    <RotateCcw className="size-4" /> {t("nav.reset")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importJson(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </header>
  );
}

function ModeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-8 rounded-full px-3.5 text-xs font-medium transition-colors duration-150",
        active ? "bg-surface text-fg shadow-[var(--shadow-border)]" : "text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
