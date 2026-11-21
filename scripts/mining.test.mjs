import assert from "node:assert/strict";
import test from "node:test";
import {
  initialSettings,
  miningResult,
  networkSnapshot,
  rigPreset,
  snapshot,
} from "../src/lib/mining/calculator.ts";

const rig = rigPreset(0);
const s = { ...initialSettings, pool: 0, rejects: 0, uptime: 100 };
const n = { ...snapshot, feeBtc: 0, height: 900000, difficulty: 1e14, eur: 80000 };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("S21 Pro at 24 hours matches independent meter and difficulty arithmetic", () => {
  const a = miningResult(rig, s, n);
  near(a.energy, 84.24);
  near(a.electricity, 16.848);
  near(a.btc, (234e12 * 86400 * 3.125) / (1e14 * 4294967296));
  near(a.breakEven, a.revenue / 84.24);
  assert.equal(a.payback, null);
});
test("accepted full-day hashrate avoids reapplying hours, uptime and rejection", () => {
  const schedule = { ...s, uptime: 50, rejects: 10, peakHours: 0, offHours: 8 };
  const rated = miningResult(rig, schedule, n);
  const measured = miningResult({ ...rig, th: 35.1, accepted: true }, schedule, n);
  near(rated.btc, measured.btc);
  near(measured.energy, 14.04);
  assert.equal(miningResult({ ...rig, accepted: true }, { ...schedule, offHours: 0 }, n), null);
});
test("split energy rates, quantity, cooling and all-inclusive hosting", () => {
  const r = { ...rig, quantity: 2, cooling: 490, hosting: 1, purchase: 100, install: 20 };
  const a = miningResult(r, { ...s, tariff: "split", peakRate: 0.2, offRate: 0.1 }, n);
  near(a.energy, 192);
  near(a.electricity, 32);
  near(a.capex, 240);
  const hosted = miningResult({ ...r, included: true }, s, n);
  near(hosted.electricity, 0);
  near(hosted.margin, hosted.revenue - 2);
  assert.equal(hosted.breakEven, null);
});
test("pool payout, next-block halving, non-positive margin and invalid duration", () => {
  const pre = miningResult(rig, s, { ...n, height: 839998 });
  const post = miningResult(rig, s, { ...n, height: 839999 });
  near(pre.btc, 2 * post.btc);
  const pps = miningResult(rig, { ...s, payout: "PPS" }, { ...n, feeBtc: 1 });
  near(pps.btc, post.btc);
  const fpps = miningResult(rig, { ...s, pool: 2 }, { ...n, feeBtc: 1 });
  near(fpps.btc, pps.btc * (4.125 / 3.125) * 0.98);
  assert.equal(miningResult({ ...rig, purchase: 2000 }, { ...s, rate: 10 }, n).payback, null);
  assert.equal(miningResult(rig, { ...s, peakHours: 23 }, n), null);
});
test("snapshot uses actual sample size, separate timestamps and rejects incomplete feeds", () => {
  const b = { height: 987654, timestamp: 1000, difficulty: 100, extras: { totalFees: 2000000 } };
  const sample = networkSnapshot([b, { ...b, extras: { totalFees: 4000000 } }], {
    EUR: 50000,
    time: 1200,
  });
  near(sample.feeBtc, 0.03);
  assert.equal(sample.samples, 2);
  assert.equal(sample.blockTime, 1000);
  assert.equal(sample.priceTime, 1200);
  assert.throws(() => networkSnapshot([], {}));
});
