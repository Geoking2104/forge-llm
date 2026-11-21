export type QuantKey = "fp16" | "int8" | "q5" | "q4" | "q3";

export type QuantOption = {
  key: QuantKey;
  bytes: number;
  label: string;
  hint: string;
};

export const QUANT_OPTIONS: QuantOption[] = [
  { key: "fp16", bytes: 2, label: "FP16 / BF16", hint: "Sans compression" },
  { key: "int8", bytes: 1, label: "INT8", hint: "Équilibré" },
  { key: "q5", bytes: 0.6875, label: "Q5_K", hint: "Haute fidélité" },
  { key: "q4", bytes: 0.5625, label: "Q4_K", hint: "Compact 4-bit" },
  { key: "q3", bytes: 0.4296875, label: "Q3_K", hint: "Agressive" },
];

export type ModelPreset = {
  id: string;
  name: string;
  paramsB: number;
  defaultQuant: QuantKey;
  context: number;
  family: string;
  activeB?: number;
  attention?: { layers: number; kvHeads: number; heads: number; dim: number; window?: number }[];
  stateGB?: number;

};

export const MODEL_PRESETS: ModelPreset[] = [
  { id: "llama-3.2-3b", name: "Llama 3.2 3B", paramsB: 3, defaultQuant: "q4", context: 8192, family: "Meta" },
  { id: "qwen-7b", name: "Qwen 2.5 7B", paramsB: 7, defaultQuant: "q4", context: 8192, family: "Alibaba" },
  { id: "llama-8b", attention: [{ layers: 32, kvHeads: 8, heads: 32, dim: 128 }], name: "Llama 3.1 8B", paramsB: 8, defaultQuant: "q4", context: 8192, family: "Meta" },
  { id: "gemma-9b", name: "Gemma 2 9B", paramsB: 9, defaultQuant: "q4", context: 8192, family: "Google" },
  { id: "phi-14b", name: "Phi-4 14B", paramsB: 14, defaultQuant: "q4", context: 16384, family: "Microsoft" },
  { id: "mistral-22b", name: "Mistral Small 22B", paramsB: 22, defaultQuant: "q4", context: 8192, family: "Mistral" },
  { id: "gemma-27b", name: "Gemma 3 27B", paramsB: 27, defaultQuant: "q4", context: 8192, family: "Google" },
  { id: "qwen-32b", name: "Qwen 2.5 32B", paramsB: 32, defaultQuant: "q4", context: 8192, family: "Alibaba" },
  { id: "mixtral-47b", activeB: 12.9, attention: [{ layers: 32, kvHeads: 8, heads: 32, dim: 128 }], name: "Mixtral 8×7B", paramsB: 47, defaultQuant: "q4", context: 8192, family: "Mistral" },
  { id: "llama-70b", name: "Llama 3.3 70B", paramsB: 70, defaultQuant: "q4", context: 8192, family: "Meta" },
  { id: "qwen-72b", name: "Qwen 2.5 72B", paramsB: 72, defaultQuant: "q4", context: 8192, family: "Alibaba" },
  { id: "command-r-104", name: "Command R+ 104B", paramsB: 104, defaultQuant: "q4", context: 16384, family: "Cohere" },
  { id: "granite42-3b", name: "Granite 4.2 3B", family: "IBM", paramsB: 3, defaultQuant: "q4", context: 8192,
    attention: [{ layers: 40, kvHeads: 8, heads: 40, dim: 64 }] },
  { id: "granite42-8b", name: "Granite 4.2 8B", family: "IBM", paramsB: 8, defaultQuant: "q4", context: 8192,
    attention: [{ layers: 40, kvHeads: 8, heads: 32, dim: 128 }] },
  { id: "granite42-30b", name: "Granite 4.2 30B", family: "IBM", paramsB: 30, defaultQuant: "q4", context: 8192,
    attention: [{ layers: 64, kvHeads: 8, heads: 32, dim: 128 }] },
  { id: "ministral3-14b", name: "Ministral 3 14B", paramsB: 14, family: "Mistral", defaultQuant: "q4", context: 8192,
    attention: [{ layers: 40, kvHeads: 8, heads: 32, dim: 128 }] },
  { id: "gpt-oss-120b", name: "gpt-oss-120b", paramsB: 117, activeB: 5.1, family: "OpenAI", defaultQuant: "q4", context: 8192,
    attention: [{ layers: 18, kvHeads: 8, heads: 64, dim: 64 }, { layers: 18, kvHeads: 8, heads: 64, dim: 64, window: 128 }] },
  { id: "qwen38-27b", name: "Qwen3.8 27B", paramsB: 27, family: "Alibaba", defaultQuant: "q4", context: 8192,
    attention: [{ layers: 16, kvHeads: 4, heads: 24, dim: 256 }],
    stateGB: 48 * (48 * 128 * 128 * 4 + (2 * 16 + 48) * 128 * 4 * 2) / 1e9 },
  { id: "gemma4-31b", name: "Gemma 4 31B", paramsB: 31, family: "Google", defaultQuant: "q4", context: 8192,
    attention: [{ layers: 10, kvHeads: 4, heads: 32, dim: 512 }, { layers: 50, kvHeads: 16, heads: 32, dim: 256, window: 1024 }] },
  { id: "gpt-oss-20b", name: "gpt-oss-20b", paramsB: 21, activeB: 3.6, family: "OpenAI", defaultQuant: "q4", context: 8192,
    attention: [{ layers: 12, kvHeads: 8, heads: 64, dim: 64 }, { layers: 12, kvHeads: 8, heads: 64, dim: 64, window: 128 }] },
];

export const DEFAULT_MODEL = MODEL_PRESETS[2];
