import assert from "node:assert/strict";
import test from "node:test";
import {
  bytesForQuant,
  compareSlots,
  decodeLimits,
  decodeWorkload,
  vramFits,
} from "../src/lib/calc.ts";
import { DEFAULT_MODEL, MODEL_PRESETS } from "../src/lib/models.ts";
import { DEFAULT_HARDWARE } from "../src/lib/hardware.ts";

const gpu = DEFAULT_HARDWARE.find((h) => h.id === "rtx-4090-24");
const workload = (context, batch = 1, bytes = bytesForQuant("q4"), kv = 2) =>
  decodeWorkload(8, bytes, context, DEFAULT_MODEL, batch, kv);

test("Llama GQA cache uses cache precision independently of weight blocks", () => {
  const w = workload(8192);
  assert.equal(w.kv, 1073741824 / 1e9);
  assert.equal(w.weights, 4.5);
  assert.equal(workload(8192, 1, 2).kv, w.kv);
  assert.equal(workload(8192, 1, 2, 1).kv, w.kv / 2);
});

test("batch shares dense weights, but keeps one cache per sequence", () => {
  const a = workload(8192),
    b = workload(8192, 4);
  assert.equal(b.traffic, a.weights + 4 * a.kv);
  assert.ok(decodeLimits(gpu, b).speed < decodeLimits(gpu, a).speed);
  assert.ok(decodeLimits(gpu, b).speed * 4 > decodeLimits(gpu, a).speed);
  assert.ok(decodeLimits(gpu, workload(32768)).speed < decodeLimits(gpu, a).speed);
});

test("MoE retains all experts and sliding attention stops growing at its window", () => {
  const m = MODEL_PRESETS.find((m) => m.id === "gpt-oss-20b");
  const w = decodeWorkload(m.paramsB, 1, 1024, m);
  assert.equal(w.weights, 21);
  assert.equal(w.traffic, 3.6 + w.kv);
  assert.equal(w.kv, (2 * 12 * (1024 + 128) * 8 * 64 * 2) / 1e9);
});

test("compute bound device and unknown compute use the appropriate ceiling", () => {
  const w = workload(8192);
  const slow = decodeLimits({ ...gpu, tflops: 0.01 }, w);
  assert.ok(slow.speed < slow.memory && Math.abs(slow.speed - slow.compute) < 0.001);
  const unknown = decodeLimits({ ...gpu, tflops: 0 }, w);
  assert.ok(Number.isFinite(unknown.speed) && unknown.compute === Infinity);
});

test("unified memory reserve, unpriced devices and nonresident models affect rankings", () => {
  const apple = DEFAULT_HARDWARE.find((h) => h.id === "mbp-m6-16");
  assert.ok(vramFits(apple, 12) && !vramFits(apple, 12.1));
  assert.equal(compareSlots(apple, apple, apple, workload(2048)).bestValue, null);
  assert.equal(compareSlots(gpu, gpu, gpu, workload(131072, 16)).winner, null);
});
