import { useState } from "react";
import { ClipboardPaste, Link2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SAMPLE_LISTINGS } from "@/lib/parser";
import { extractUrl } from "@/lib/affiliate";
import { inspectListingUrl } from "@/lib/inspect-listing";
import { useForgeStore } from "@/lib/store";

export function ParserPanel() {
  const { t } = useTranslation();
  const listingRaw = useForgeStore((s) => s.listingRaw);
  const setListing = useForgeStore((s) => s.setListing);
  const amazonTag = useForgeStore((s) => s.amazonTag);
  const setAmazonTag = useForgeStore((s) => s.setAmazonTag);
  const [raw, setRaw] = useState(listingRaw);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(false);
  const [tagDraft, setTagDraft] = useState(amazonTag);

  const applyRaw = (
    value: string,
    extras?: {
      title?: string | null;
      price?: number | null;
      image?: string | null;
      brand?: string | null;
      memory?: string | null;
      vram?: number | null;
    },
  ) => {
    setRaw(value);
    setListing(value, extras);
  };

  const inspect = async (value: string) => {
    const url = extractUrl(value);
    applyRaw(value);
    if (!url) return;
    setBusy(true);
    try {
      const result = await inspectListingUrl({ data: { url } });
      if (result.ok && (result.title || result.price || result.image)) {
        applyRaw(result.url || value, {
          title: result.title,
          price: result.price,
          image: result.image,
          brand: result.brand,
          memory: result.memory,
          vram: result.vram,
        });
        toast.success(t("parser.fetched"));
      } else {
        toast.message(t("parser.fetchFail"));
      }
    } catch {
      toast.message(t("parser.fetchFail"));
    } finally {
      setBusy(false);
    }
  };

  const pasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) void inspect(text.trim());
    } catch {
      toast.message(t("parser.paste"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>{t("parser.title")}</CardTitle>
            <CardDescription>{t("parser.desc")}</CardDescription>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label={t("parser.tagCta")} onClick={() => setSettings(true)}>
            <Settings2 />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="paste">{t("parser.paste")}</Label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                id="paste"
                value={raw}
                onChange={(e) => applyRaw(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void inspect(raw);
                  }
                }}
                placeholder={t("parser.placeholder")}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void inspect(raw)} disabled={busy || !raw.trim()}>
              {busy ? t("parser.fetching") : t("parser.inspect")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void pasteClipboard()}>
              <ClipboardPaste />
              {t("parser.clipboard")}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_LISTINGS.map((s) => (
            <button
              key={s.title}
              type="button"
              onClick={() => void inspect(s.body)}
              className="min-h-11 rounded-full border border-border bg-surface px-3 py-2 text-left text-xs text-muted transition-colors duration-150 hover:border-border-strong hover:text-fg"
            >
              {s.site} · {s.title}
            </button>
          ))}
        </div>
      </CardContent>

      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("parser.tagCta")}</DialogTitle>
            <DialogDescription>{t("parser.tagHint")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="amztag">{t("parser.tagLabel")}</Label>
            <Input
              id="amztag"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              placeholder="forge21-21"
              autoComplete="off"
            />
          </div>
          <p className="text-xs leading-relaxed text-muted">{t("parser.disclosure")}</p>
          <Button
            onClick={() => {
              setAmazonTag(tagDraft.trim());
              setSettings(false);
              toast.success(t("parser.tagSave"));
            }}
          >
            {t("parser.tagSave")}
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
