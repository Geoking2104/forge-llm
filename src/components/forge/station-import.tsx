import { useState } from "react";
import { Button } from "@/components/ui/button";
import { extractUrl } from "@/lib/affiliate";
import { inspectListingUrl } from "@/lib/inspect-listing";
import { parsePrice } from "@/lib/parser";
import { useForgeStore } from "@/lib/store";
import {
  explicitSpecs,
  matchStation,
  readMeasurements,
  workstation,
} from "@/lib/mining/workstation";
import { rigPreset, type Rig } from "@/lib/mining/calculator";
import type { Hardware } from "@/lib/hardware";

const input = "block w-full rounded-lg border border-border bg-bg p-2 text-fg";
type Translate = (fr: string, en: string) => string;
export function StationImport({
  tr,
  apply,
}: {
  tr: Translate;
  apply: (slot: number, rig: Rig) => void;
}) {
  const pool = useForgeStore((s) => s.pool);
  const { slotAId, slotBId, slotCId } = useForgeStore();
  const [target, setTarget] = useState(0),
    [raw, setRaw] = useState(""),
    [selected, setSelected] = useState("");
  const [spec, setSpec] = useState<Hardware | null>(null),
    [measure, setMeasure] = useState(readMeasurements(""));
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  function choose(hw: Hardware | undefined) {
    setSpec(hw ? { ...hw } : null);
    setSelected(hw?.id ?? "");
    setMeasure(readMeasurements(""));
    setMessage("");
  }
  async function identify() {
    setBusy(true);
    setMessage("");
    let description = raw,
      price = parsePrice(raw) ?? 0;
    try {
      const url = extractUrl(raw);
      if (url) {
        const response = await inspectListingUrl({ data: { url } });
        if (response.ok && response.title) {
          description = response.title + " " + raw;
          price = response.price ?? price;
        }
      }
    } catch {
      /* The pasted description is still usable. */
    }
    const found = matchStation(description, pool);
    const unknown: Hardware = {
      id: "manual",
      name:
        description
          .replace(/https?:\/\/\S+/g, "")
          .trim()
          .slice(0, 100) || tr("Ma station", "My workstation"),
      vendor: /macbook|mac studio|mac mini/i.test(description) ? "apple" : "custom",
      ...explicitSpecs(description),
      priceNum: 0,
    };
    choose(found ?? unknown);
    setMeasure(readMeasurements(raw));
    const priceFromListing = price > 0;
    setSpec({ ...(found ?? unknown), priceNum: priceFromListing ? price : (found?.priceNum ?? 0) });
    setMessage(
      found
        ? tr(
            "Profil reconnu. Vérifiez le prix de la solution complète.",
            "Profile matched. Check the purchase price of the whole system.",
          )
        : tr(
            "Référence inconnue ou ambiguë. Sélectionnez un profil ou complétez la fiche.",
            "Unknown or ambiguous model. Select a profile or complete the specifications.",
          ),
    );
    setBusy(false);
  }
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-xl font-semibold">
        {tr("Importer une station Forge LLM", "Import a Forge LLM workstation")}
      </h2>
      <fieldset disabled={busy} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>
          {tr("Catalogue ou station enregistrée", "Catalog or saved workstation")}
          <select
            className={input}
            value={selected}
            onChange={(e) => choose(pool.find((h) => h.id === e.target.value))}
          >
            <option value="">
              {tr("Choisir un PC, un Mac ou un GPU", "Select a PC, Mac or GPU")}
            </option>
            {selected === "manual" && (
              <option value="manual">{tr("Saisie libre", "Manual entry")}</option>
            )}
            {pool.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}{" "}
                {[slotAId, slotBId, slotCId]
                  .map((id, i) => (id === h.id ? " · Forge " + "ABC"[i] : ""))
                  .join("")}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr("Configuration de destination", "Destination slot")}
          <select className={input} value={target} onChange={(e) => setTarget(+e.target.value)}>
            {[0, 1, 2].map((i) => (
              <option key={i} value={i}>
                {"ABC"[i]}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          {tr(
            "Ou collez une description ou un lien marchand",
            "Or paste a description or retail link",
          )}
          <textarea
            className={input}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="PC RTX 4090 24 Go · 2400 € · SHA-256d 1 GH/s · mining 340 W · IA 380 W"
          />
        </label>
        <Button variant="outline" disabled={!raw.trim()} onClick={identify}>
          {busy ? "…" : tr("Reconstituer la fiche", "Identify specifications")}
        </Button>
        {message && <p role="status">{message}</p>}
        {spec && (
          <>
            <div className="sm:col-span-2 grid gap-2 sm:grid-cols-3">
              <label>
                {tr("Nom de la solution", "System name")}
                <input
                  className={input}
                  maxLength={100}
                  value={spec.name}
                  onChange={(e) => setSpec({ ...spec, name: e.target.value })}
                />
              </label>
              {(
                [
                  ["vram", tr("Mémoire accélérateur (Go)", "Accelerator memory (GB)")],
                  ["bandwidth", tr("Bande passante (Go/s)", "Bandwidth (GB/s)")],
                  ["tflops", "TFLOPS"],
                  ["priceNum", tr("Prix complet (€)", "Whole-system price (€)")],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    className={input}
                    type="number"
                    min="0"
                    step="any"
                    value={spec[key] || ""}
                    onChange={(e) =>
                      setSpec({ ...spec, [key]: Math.max(0, Number(e.target.value)) })
                    }
                  />
                </label>
              ))}
            </div>
            <Button
              disabled={!spec.name.trim() || !spec.vram || !spec.bandwidth}
              onClick={() => {
                apply(target, {
                  ...rigPreset(0),
                  name: spec.name.slice(0, 100),
                  station: { ...workstation(spec), aiWatts: measure.aiWatts },
                  purchase: spec.priceNum,
                  th: measure.th,
                  watts: measure.watts,
                  measured: true,
                });
                setMessage(
                  tr("Station chargée en configuration ", "Workstation loaded into slot ") +
                    "ABC"[target],
                );
              }}
            >
              {tr("Charger en configuration ", "Load into slot ") + "ABC"[target]}
            </Button>
          </>
        )}
      </fieldset>
    </section>
  );
}
