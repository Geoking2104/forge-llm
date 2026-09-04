import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MODEL_PRESETS, QUANT_OPTIONS } from "@/lib/models";
import { bytesForQuant, kvCacheGB, requiredVramGB, weightGB } from "@/lib/calc";
import { useForgeStore } from "@/lib/store";
import { formatNumber } from "@/lib/utils";

const CONTEXTS = [2048, 4096, 8192, 16384, 32768, 65536, 131072];

export function ModelPanel() {
  const { t } = useTranslation();
  const modelParamSize = useForgeStore((s) => s.modelParamSize);
  const quantization = useForgeStore((s) => s.quantization);
  const context = useForgeStore((s) => s.context);
  const presetId = useForgeStore((s) => s.presetId);
  const setModelParamSize = useForgeStore((s) => s.setModelParamSize);
  const setQuantization = useForgeStore((s) => s.setQuantization);
  const setContext = useForgeStore((s) => s.setContext);
  const applyPreset = useForgeStore((s) => s.applyPreset);

  const bytes = bytesForQuant(quantization);
  const weights = weightGB(modelParamSize, bytes);
  const kv = kvCacheGB(modelParamSize, context, bytes);
  const required = requiredVramGB(modelParamSize, bytes, context);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("model.title")}</CardTitle>
        <CardDescription>{t("model.desc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="preset">{t("model.preset")}</Label>
          <Select value={presetId} onValueChange={applyPreset}>
            <SelectTrigger id="preset">
              <SelectValue placeholder={t("model.choose")} />
            </SelectTrigger>
            <SelectContent>
              {MODEL_PRESETS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
              <SelectItem value="custom">{t("model.customSize")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="size">{t("model.params")}</Label>
            <span className="font-mono text-sm tabular-nums text-fg">{modelParamSize}B</span>
          </div>
          <Slider
            id="size"
            min={1}
            max={150}
            step={1}
            value={[modelParamSize]}
            onValueChange={(v) => setModelParamSize(v[0] ?? 8)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="quant">{t("model.quant")}</Label>
            <Select value={quantization} onValueChange={(v) => setQuantization(v as typeof quantization)}>
              <SelectTrigger id="quant">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUANT_OPTIONS.map((q) => (
                  <SelectItem key={q.key} value={q.key}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ctx">{t("model.context")}</Label>
            <Select value={String(context)} onValueChange={(v) => setContext(Number(v))}>
              <SelectTrigger id="ctx">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTEXTS.map((c) => (
                  <SelectItem key={c} value={String(c)}>
                    {c >= 1024 ? `${c / 1024}k` : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-xl bg-secondary p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted">{t("model.vram")}</p>
              <p className="font-display text-3xl font-semibold tracking-tight tabular-nums">
                {formatNumber(required, 1)}
                <span className="ml-1 text-base font-normal text-muted">Go</span>
              </p>
            </div>
            <Badge variant="signal">{t("model.margin")}</Badge>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-subtle">{t("model.weights")}</dt>
              <dd className="font-mono tabular-nums text-fg">{formatNumber(weights, 1)} Go</dd>
            </div>
            <div>
              <dt className="text-subtle">{t("model.kv")}</dt>
              <dd className="font-mono tabular-nums text-fg">{formatNumber(kv, 1)} Go</dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
