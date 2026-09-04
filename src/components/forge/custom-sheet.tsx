import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Vendor } from "@/lib/hardware";
import { theoreticalTflops } from "@/lib/calc";
import { useForgeStore } from "@/lib/store";
import { ShopLinks } from "./shop-links";

export function CustomSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation();
  const addHardware = useForgeStore((s) => s.addHardware);
  const setSlot = useForgeStore((s) => s.setSlot);
  const [name, setName] = useState("");
  const [vendor, setVendor] = useState<Vendor>("custom");
  const [vram, setVram] = useState(24);
  const [bandwidth, setBandwidth] = useState(1000);
  const [price, setPrice] = useState(1500);
  const [cores, setCores] = useState(16384);
  const [ghz, setGhz] = useState(2.2);
  const [tflops, setTflops] = useState(0);

  const auto = useMemo(() => theoreticalTflops(cores, ghz), [cores, ghz]);
  const tensor = tflops > 0 ? tflops : auto;
  const query = name.trim();

  const save = (slot?: "A" | "B" | "C") => {
    if (!query) return;
    const id = `custom-${Date.now()}`;
    addHardware({
      id,
      name: query,
      vendor,
      vram: Number(vram),
      tflops: Number(tensor.toFixed(1)),
      bandwidth: Number(bandwidth),
      priceNum: Number(price),
      notes: t("custom.notes"),
      custom: true,
    });
    if (slot) setSlot(slot, id);
    toast.success(slot ? t("toast.loadedSlot", { slot }) : t("toast.added"));
    setName("");
    onOpenChange(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("custom.title")}</SheetTitle>
          <SheetDescription>{t("custom.desc")}</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cname">{t("custom.name")}</Label>
            <Input
              id="cname"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("custom.placeholder")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("custom.vendor")}</Label>
            <Select value={vendor} onValueChange={(v) => setVendor(v as Vendor)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nvidia">NVIDIA</SelectItem>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="amd">AMD</SelectItem>
                <SelectItem value="intel">Intel</SelectItem>
                <SelectItem value="custom">{t("custom.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("custom.vram")} id="vram" value={vram} onChange={setVram} />
            <Field label={t("custom.bandwidth")} id="bw" value={bandwidth} onChange={setBandwidth} />
            <Field label={t("custom.cores")} id="cores" value={cores} onChange={setCores} />
            <Field label={t("custom.clock")} id="ghz" value={ghz} onChange={setGhz} step={0.05} />
            <Field label={t("custom.tflops")} id="tf" value={tflops} onChange={setTflops} step={1} />
            <Field label={t("custom.price")} id="price" value={price} onChange={setPrice} />
          </div>
          <p className="font-mono text-xs tabular-nums text-muted">
            {t("custom.auto", { auto: auto.toFixed(1), kept: tensor.toFixed(1) })}
          </p>

          {query.length >= 3 ? (
            <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
              <p className="text-xs font-medium tracking-widest text-muted">{t("custom.searchBuy")}</p>
              <p className="text-sm text-muted">{t("custom.searchBuyDesc")}</p>
              <ShopLinks query={query} vendor={vendor} sku={`draft-${query}`} compact />
            </div>
          ) : null}

          <div className="mt-auto flex flex-col gap-2">
            <Button type="submit">{t("custom.inject")}</Button>
            <p className="text-xs text-muted">{t("custom.insert")}</p>
            <div className="flex gap-2">
              {(["A", "B", "C"] as const).map((slot) => (
                <Button
                  key={slot}
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={!query}
                  onClick={() => save(slot)}
                >
                  {t("custom.addAndSlot", { slot })}
                </Button>
              ))}
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  id: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step={step}
        value={Number.isInteger(step) ? value : value.toFixed(2)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
