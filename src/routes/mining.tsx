import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ForgeMark } from "@/components/forge/logo";
import { LanguageSwitch } from "@/components/forge/language-switch";
import { useForgeStore } from "@/lib/store";
import {
  initialScenario,
  miningResult,
  networkSchema,
  presets,
  rigPreset,
  scenarioSchema,
  type Rig,
  type Settings,
  type Network,
} from "@/lib/mining/calculator";

export const Route = createFileRoute("/mining")({
  component: Mining,
  head: () => ({ meta: [{ title: "Bitcoin Mining · Forge" }] }),
});
const storageKey = "forge-mining-v1";
const panel = "rounded-2xl border border-border bg-surface p-5";
const grid = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4";
const input = "mt-1 block w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg";
type Translate = (fr: string, en: string) => string;

function Field({
  label,
  value,
  change,
  min = 0,
  max = 1e15,
  integer = false,
}: {
  label: string;
  value: number;
  change: (n: number) => void;
  min?: number;
  max?: number;
  integer?: boolean;
}) {
  // Allow an empty/intermediate value while typing. Commit only a valid quantity.
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const valid = (s: string) =>
    s.trim() !== "" &&
    Number.isFinite(Number(s)) &&
    +s >= min &&
    +s <= max &&
    (!integer || Number.isInteger(+s));
  return (
    <label className="text-sm">
      {label}
      <input
        className={input}
        type="number"
        min={min}
        max={max}
        step={integer ? 1 : "any"}
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          if (valid(v)) change(Number(v));
        }}
        onBlur={() => setDraft(String(value))}
        aria-invalid={!valid(draft)}
      />
    </label>
  );
}
function Select({
  label,
  value,
  change,
  children,
}: {
  label: string;
  value: string;
  change: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-sm">
      {label}
      <select aria-label={label} className={input} value={value} onChange={(e) => change(e.target.value)}>
        {children}
      </select>
    </label>
  );
}

function Mining() {
  const { i18n } = useTranslation();
  const tr: Translate = (fr, en) => (i18n.language.startsWith("en") ? en : fr);
  const [scenario, setScenario] = useState(initialScenario);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    void Promise.resolve(useForgeStore.persist.rehydrate()).then(() => {
      const locale = useForgeStore.getState().locale;
      void i18n.changeLanguage(locale);
      document.documentElement.lang = locale;
    });
    try {
      const restored = scenarioSchema.safeParse(
        JSON.parse(localStorage.getItem(storageKey) ?? "null"),
      );
      if (restored.success) setScenario(restored.data);
    } catch {
      /* Default on missing or invalid local storage. */
    }
    setReady(true);
  }, [i18n]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(storageKey, JSON.stringify(scenario));
        setSaved(true);
      } catch {
        setSaved(false);
      }
  }, [scenario, ready]);
  const { network: n, settings: s, rigs } = scenario;
  const setting = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setScenario((old) => ({ ...old, settings: { ...old.settings, [key]: value } }));
  const net = (key: keyof Pick<Network, "height" | "difficulty" | "eur" | "feeBtc">, v: number) =>
    setScenario((old) => ({ ...old, network: { ...old.network, [key]: v, edited: true } }));
  async function refresh() {
    setStatus("loading");
    try {
      const res = await fetch("/api/mining-network");
      if (!res.ok) throw Error();
      const network = networkSchema.parse(await res.json());
      setScenario((old) => ({ ...old, network }));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }
  const fmt = (v: number, d = 2) => v.toLocaleString(i18n.language, { maximumFractionDigits: d });
  const date = (seconds: number) =>
    new Date(seconds * 1000).toLocaleString(i18n.language, { timeZone: "UTC" });
  const changes = (index: number, patch: Partial<Rig>) =>
    setScenario((old) => ({
      ...old,
      rigs: old.rigs.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  const results = rigs.map((r) => miningResult(r, s, n));
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <ForgeMark className="size-8" /> Forge
          </Link>
          <LanguageSwitch />
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6">
        <h1 className="font-display text-4xl font-semibold">
          {tr("Minage de Bitcoin", "Bitcoin mining")}
        </h1>
        <p className="text-muted">
          {tr(
            "Comparez trois mineurs en pool selon votre tarif électrique et vos heures de fonctionnement.",
            "Compare three pool miners at your electricity rates and operating hours.",
          )}
        </p>
        <section className={panel}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">
              {tr("Réseau et cours du bitcoin", "Network and bitcoin price")}
            </h2>
            <Button variant="outline" disabled={!ready || status === "loading"} onClick={refresh}>
              {status === "loading" ? "…" : tr("Actualiser les données", "Refresh network data")}
            </Button>
          </div>
          <p className="mb-3 text-sm text-muted">
            {n.edited
              ? tr("Hypothèses modifiées. Données sources", "Manual overrides. Source data")
              : tr("Données enregistrées", "Saved snapshot")}{" "}
            · mempool.space · {tr("bloc", "block")} {date(n.blockTime)} UTC · BTC/EUR{" "}
            {date(n.priceTime)} UTC · {n.samples}{" "}
            {tr("blocs pour la moyenne des frais", "blocks in fee average")}
          </p>
          {status === "error" && (
            <p role="alert">
              {tr(
                "Source indisponible. Les valeurs affichées sont conservées et modifiables.",
                "Source unavailable. Displayed inputs are preserved and editable.",
              )}
            </p>
          )}
          {!saved && (
            <p role="alert">{tr("Sauvegarde locale indisponible.", "Local saving unavailable.")}</p>
          )}
          <fieldset disabled={status === "loading"} className={grid}>
            <Field
              label={tr("Hauteur du bloc", "Block height")}
              value={n.height}
              integer
              change={(v) => net("height", v)}
            />
            <Field
              label={tr("Difficulté (billions, 10¹²)", "Difficulty (trillions, 10¹²)")}
              value={n.difficulty / 1e12}
              min={1e-12}
              max={1000}
              change={(v) => net("difficulty", v * 1e12)}
            />
            <Field label="BTC/EUR" value={n.eur} min={0.000001} change={(v) => net("eur", v)} />
            <Field
              label={tr("Frais moyens (BTC/bloc)", "Mean fees (BTC/block)")}
              value={n.feeBtc}
              change={(v) => net("feeBtc", v)}
            />
          </fieldset>
        </section>
        <section className={panel}>
          <h2 className="mb-3 text-xl font-semibold">
            {tr("Pool et électricité", "Pool and electricity")}
          </h2>
          <div className={grid}>
            <Select
              label={tr("Rémunération du pool", "Pool payout")}
              value={s.payout}
              change={(v) => setting("payout", v as Settings["payout"])}
            >
              <option>FPPS</option>
              <option>PPS</option>
              <option>PPLNS</option>
            </Select>
            <Field
              label={tr("Commission du pool (%)", "Pool fee (%)")}
              value={s.pool}
              max={100}
              change={(v) => setting("pool", v)}
            />
            <Field
              label={tr("Travail rejeté (%)", "Rejected shares (%)")}
              value={s.rejects}
              max={100}
              change={(v) => setting("rejects", v)}
            />
            <Field
              label={tr(
                "Disponibilité pendant les heures prévues (%)",
                "Uptime during scheduled hours (%)",
              )}
              value={s.uptime}
              max={100}
              change={(v) => setting("uptime", v)}
            />
            <Select
              label={tr("Tarification", "Tariff")}
              value={s.tariff}
              change={(v) => setting("tariff", v as Settings["tariff"])}
            >
              <option value="flat">{tr("Tarif unique", "Flat rate")}</option>
              <option value="split">{tr("Heures pleines / creuses", "Peak / off-peak")}</option>
            </Select>
            {s.tariff === "flat" ? (
              <Field label="€/kWh" value={s.rate} change={(v) => setting("rate", v)} />
            ) : (
              <>
                <Field
                  label={tr("Heures pleines (€/kWh)", "Peak (€/kWh)")}
                  value={s.peakRate}
                  change={(v) => setting("peakRate", v)}
                />
                <Field
                  label={tr("Heures creuses (€/kWh)", "Off-peak (€/kWh)")}
                  value={s.offRate}
                  change={(v) => setting("offRate", v)}
                />
              </>
            )}
            <Field
              label={tr("Marche en heures pleines (h/j)", "Peak running hours/day")}
              value={s.peakHours}
              max={24}
              change={(v) => setting("peakHours", v)}
            />
            <Field
              label={tr("Marche en heures creuses (h/j)", "Off-peak running hours/day")}
              value={s.offHours}
              max={24}
              change={(v) => setting("offHours", v)}
            />
          </div>
          <p className="mt-3 text-sm text-muted">
            {s.payout === "PPS"
              ? tr("PPS utilise la subvention seule.", "PPS uses the subsidy only.")
              : tr(
                  "Les frais de transaction sont inclus. En PPLNS, les versements peuvent varier fortement autour de la moyenne.",
                  "Transaction fees are included. PPLNS payouts can vary substantially around the expected average.",
                )}
          </p>
          {s.peakHours + s.offHours > 24 && (
            <p role="alert">
              {tr("La durée totale dépasse 24 h/j.", "Total runtime exceeds 24 h/day.")}
            </p>
          )}
        </section>
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {rigs.map((r, i) => {
            const patch = (p: Partial<Rig>) => changes(i, p);
            const a = results[i];
            return (
              <section key={i} className={panel}>
                <p className="text-sm text-muted">
                  {"Configuration"} {"ABC"[i]}
                </p>
                <h2 className="mb-3 text-2xl font-semibold">{r.name}</h2>
                <Select
                  label={tr("Profil constructeur", "Manufacturer profile")}
                  value={String(r.preset)}
                  change={(v) => {
                    const profile = rigPreset(+v);
                    patch({
                      preset: +v,
                      name: profile.name,
                      th: profile.th,
                      watts: profile.watts,
                      accepted: false,
                      measured: false,
                    });
                  }}
                >
                  {presets.map((p, j) => (
                    <option key={p.name} value={j}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <details className="my-4">
                  <summary className="cursor-pointer font-medium">
                    {tr("Machine, mesures et coûts", "Hardware, measurements and costs")}
                  </summary>
                  <div className="mt-3 grid gap-3">
                    <label>
                      {tr("Nom", "Name")}
                      <input
                        className={input}
                        maxLength={100}
                        value={r.name}
                        onChange={(e) => patch({ name: e.target.value })}
                      />
                    </label>
                    <Select
                      label={tr("Base de calcul du hashrate", "Hashrate basis")}
                      value={r.accepted ? "accepted" : "nominal"}
                      change={(v) =>
                        patch({
                          accepted: v === "accepted",
                          measured: true,
                          th: v === "accepted" ? 0 : presets[r.preset].th,
                        })
                      }
                    >
                      <option value="nominal">
                        {tr("Nominal en fonctionnement", "Nominal while online")}
                      </option>
                      <option value="accepted">
                        {tr("Accepté, moyenne sur 24 h", "Accepted, full-day average")}
                      </option>
                    </Select>
                    <Field
                      label="TH/s"
                      value={r.th}
                      change={(v) => patch({ th: v, measured: true })}
                    />
                    <Field
                      label={tr("Puissance à la prise (W)", "Wall power (W)")}
                      value={r.watts}
                      min={1}
                      change={(v) => patch({ watts: v, measured: true })}
                    />
                    <Field
                      label={tr(
                        "Refroidissement supplémentaire (W/unité)",
                        "Additional cooling (W/unit)",
                      )}
                      value={r.cooling}
                      change={(v) => patch({ cooling: v })}
                    />
                    <Field
                      label={tr("Quantité", "Quantity")}
                      integer
                      min={1}
                      max={100000}
                      value={r.quantity}
                      change={(v) => patch({ quantity: v })}
                    />
                    <Field
                      label={tr("Achat (€/unité)", "Purchase (€/unit)")}
                      value={r.purchase}
                      change={(v) => patch({ purchase: v })}
                    />
                    <Field
                      label={tr("Installation (€/unité)", "Installation (€/unit)")}
                      value={r.install}
                      change={(v) => patch({ install: v })}
                    />
                    <Field
                      label={tr(
                        "Hébergement et frais fixes (€/unité/j)",
                        "Hosting and fixed costs (€/unit/day)",
                      )}
                      value={r.hosting}
                      change={(v) => patch({ hosting: v })}
                    />
                    <label>
                      <input
                        type="checkbox"
                        checked={r.included}
                        onChange={(e) => patch({ included: e.target.checked })}
                      />{" "}
                      {tr("Électricité incluse dans l’hébergement", "Hosting includes electricity")}
                    </label>
                  </div>
                </details>
                <p className="text-sm text-muted">
                  {fmt(r.th)} TH/s · {fmt(r.watts)} W · ×{r.quantity} ·{" "}
                  {r.measured ? (
                    tr("saisie utilisateur", "user input")
                  ) : (
                    <a
                      className="underline"
                      href={
                        "https://support.bitmain.com/hc/en-us/articles/" + presets[r.preset].source
                      }
                    >
                      BITMAIN
                    </a>
                  )}
                </p>
                {r.accepted && (
                  <p className="mt-2 text-sm">
                    {tr(
                      "Saisir le débit accepté sur une journée entière pour cet horaire. Disponibilité et rejets sont déjà inclus.",
                      "Enter accepted hashrate averaged over a whole day for this schedule. Uptime and rejects are already included.",
                    )}
                  </p>
                )}
                {!a ? (
                  <p role="alert">
                    {tr(
                      "Vérifiez les heures de marche et le débit accepté.",
                      "Check the scheduled hours and accepted hashrate.",
                    )}
                  </p>
                ) : (
                  <>
                    <h3 className="mt-5 font-semibold">
                      {tr("Exploiter la machine", "Run this machine")}
                    </h3>
                    <p className="mt-2 text-sm text-muted">
                      {tr("Tarif électrique d’équilibre", "Break-even electricity price")}
                    </p>
                    <strong className="text-3xl">
                      {a.breakEven === null ? "—" : fmt(a.breakEven, 4) + " €/kWh"}
                    </strong>
                    <dl className="my-3 grid grid-cols-[1fr_auto] gap-2 text-sm">
                      {[
                        [tr("Production attendue", "Expected payout"), fmt(a.btc, 8) + " BTC/j"],
                        [tr("Consommation", "Energy"), fmt(a.energy) + " kWh/j"],
                        [tr("Recettes", "Revenue"), fmt(a.revenue) + " €/j"],
                        [tr("Électricité", "Electricity"), fmt(a.electricity) + " €/j"],
                        [tr("Marge d’exploitation", "Operating margin"), fmt(a.margin) + " €/j"],
                      ].map(([k, v]) => (
                        <Pair key={k} label={k} value={v.replace("/j", tr("/j", "/day"))} />
                      ))}
                    </dl>
                    <h3 className="mt-4 font-semibold">
                      {tr("Acheter la machine", "Buy this machine")}
                    </h3>
                    <p>
                      {a.capex === 0
                        ? tr(
                            "Saisissez le coût d’achat installé.",
                            "Enter installed purchase cost.",
                          )
                        : a.payback === null
                          ? tr(
                              "Aucun amortissement dans ce scénario.",
                              "No payback under this scenario.",
                            )
                          : tr("Amortissement simple", "Simple payback") +
                            " · " +
                            fmt(a.payback, 1) +
                            " " +
                            tr("jours", "days")}
                    </p>
                  </>
                )}
              </section>
            );
          })}
        </div>
        <Sensitivity tr={tr} rigs={rigs} n={n} s={s} fmt={fmt} />
        <Validation tr={tr} rigs={rigs} results={results} fmt={fmt} />
      </main>
    </div>
  );
}
function Pair({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </>
  );
}
type Format = (v: number, d?: number) => string;
function Sensitivity({
  tr,
  rigs,
  n,
  s,
  fmt,
}: {
  tr: Translate;
  rigs: Rig[];
  n: Network;
  s: Settings;
  fmt: Format;
}) {
  const [price, setPrice] = useState(0);
  const [diff, setDifficulty] = useState(0);
  const [power, setPower] = useState(0);
  const k = 1 + power / 100;
  const network = {
    ...n,
    eur: n.eur * (1 + price / 100),
    difficulty: n.difficulty * (1 + diff / 100),
  };
  const settings = { ...s, rate: s.rate * k, peakRate: s.peakRate * k, offRate: s.offRate * k };
  return (
    <section className={panel}>
      <h2 className="mb-3 text-xl font-semibold">
        {tr("Sensibilité de la marge et de l’amortissement", "Margin and payback sensitivity")}
      </h2>
      <div className={grid}>
        <Field
          label={tr("Variation BTC/EUR (%)", "BTC/EUR change (%)")}
          value={price}
          min={-99}
          max={1000}
          change={setPrice}
        />
        <Field
          label={tr("Variation de difficulté (%)", "Difficulty change (%)")}
          value={diff}
          min={-99}
          max={1000}
          change={setDifficulty}
        />
        <Field
          label={tr("Variation des tarifs électriques (%)", "Electricity rate change (%)")}
          value={power}
          min={-99}
          max={1000}
          change={setPower}
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {rigs.map((r, i) => {
          const a = miningResult(r, settings, network);
          return (
            <div key={i} className="rounded-lg bg-secondary p-3">
              <strong>
                {"ABC"[i]} · {r.name}
              </strong>
              <p>{a ? fmt(a.margin) + " " + tr("€/j", "€/day") : "—"}</p>
              <small>
                {a?.payback
                  ? fmt(a.payback, 1) + " " + tr("jours", "days")
                  : tr("Amortissement indisponible", "Payback unavailable")}
              </small>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-muted">
        {tr(
          "Projection à conditions constantes, avant impôts. Le tarif d’équilibre couvre les frais d’exploitation. Le coût d’achat intervient dans l’amortissement.",
          "Constant-condition projection before tax. The break-even rate covers operating costs. Purchase cost enters the payback estimate.",
        )}
      </p>
    </section>
  );
}

function Validation({
  tr,
  rigs,
  results,
  fmt,
}: {
  tr: Translate;
  rigs: Rig[];
  results: ReturnType<typeof miningResult>[];
  fmt: Format;
}) {
  const [slot, setSlot] = useState("0"),
    [days, setDays] = useState(7);
  const [credited, setCredited] = useState(""),
    [meter, setMeter] = useState("");
  const a = results[Number(slot)];
  return (
    <details className={panel}>
      <summary className="cursor-pointer font-semibold">
        {tr(
          "Vérifier avec un relevé de pool et de compteur",
          "Check against pool and meter records",
        )}
      </summary>
      <p className="my-3 text-sm text-muted">
        {tr(
          "Utilisez les BTC crédités, les kWh et les hypothèses réseau du même intervalle. Écart = relevé moins estimation.",
          "Use credited BTC, metered kWh and network assumptions from the same period. Difference = recorded minus expected.",
        )}
      </p>
      <div className={grid}>
        <Select label={"Configuration"} value={slot} change={setSlot}>
          {rigs.map((r, i) => (
            <option key={i} value={i}>
              {"ABC"[i]} · {r.name}
            </option>
          ))}
        </Select>
        <Field
          label={tr("Durée (jours)", "Period (days)")}
          min={1}
          integer
          value={days}
          change={setDays}
        />
        <label>
          {tr("BTC crédités", "Credited BTC")}
          <input
            type="number"
            step="any"
            min="0"
            className={input}
            value={credited}
            onChange={(e) => setCredited(e.target.value)}
          />
        </label>
        <label>
          {tr("Compteur (kWh)", "Meter (kWh)")}
          <input
            type="number"
            step="any"
            min="0"
            className={input}
            value={meter}
            onChange={(e) => setMeter(e.target.value)}
          />
        </label>
      </div>
      {a && (
        <div className="mt-3 space-y-1 text-sm">
          {[
            [credited, a.btc * days, "BTC", 8],
            [meter, a.energy * days, "kWh", 2],
          ].map(([raw, expected, unit, digits]) => (
            <p key={unit}>
              {tr("Prévision", "Expected")} {fmt(Number(expected), Number(digits))} {unit} ·{" "}
              {tr("Écart", "Difference")}{" "}
              {raw !== "" && Number(raw) >= 0
                ? fmt(Number(raw) - Number(expected), Number(digits)) + " " + unit
                : "—"}
            </p>
          ))}
        </div>
      )}
    </details>
  );
}
