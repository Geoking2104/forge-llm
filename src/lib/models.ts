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
  { key: "q5", bytes: 0.625, label: "Q5_K", hint: "Haute fidélité" },
  { key: "q4", bytes: 0.5, label: "Q4_K", hint: "Compact 4-bit" },
  { key: "q3", bytes: 0.375, label: "Q3_K", hint: "Agressive" },
];

export type ModelPreset = {
  id: string;
  name: string;
  paramsB: number;
  defaultQuant: QuantKey;
  context: number;
  family: string;
};

export const MODEL_PRESETS: ModelPreset[] = [
  { id: "llama-3.2-3b", name: "Llama 3.2 3B", paramsB: 3, defaultQuant: "q4", context: 8192, family: "Meta" },
  { id: "qwen-7b", name: "Qwen 2.5 7B", paramsB: 7, defaultQuant: "q4", context: 8192, family: "Alibaba" },
  { id: "llama-8b", name: "Llama 3.1 8B", paramsB: 8, defaultQuant: "q4", context: 8192, family: "Meta" },
  { id: "gemma-9b", name: "Gemma 2 9B", paramsB: 9, defaultQuant: "q4", context: 8192, family: "Google" },
  { id: "phi-14b", name: "Phi-4 14B", paramsB: 14, defaultQuant: "q4", context: 16384, family: "Microsoft" },
  { id: "mistral-22b", name: "Mistral Small 22B", paramsB: 22, defaultQuant: "q4", context: 8192, family: "Mistral" },
  { id: "gemma-27b", name: "Gemma 3 27B", paramsB: 27, defaultQuant: "q4", context: 8192, family: "Google" },
  { id: "qwen-32b", name: "Qwen 2.5 32B", paramsB: 32, defaultQuant: "q4", context: 8192, family: "Alibaba" },
  { id: "mixtral-47b", name: "Mixtral 8×7B", paramsB: 47, defaultQuant: "q4", context: 8192, family: "Mistral" },
  { id: "llama-70b", name: "Llama 3.3 70B", paramsB: 70, defaultQuant: "q4", context: 8192, family: "Meta" },
  { id: "qwen-72b", name: "Qwen 2.5 72B", paramsB: 72, defaultQuant: "q4", context: 8192, family: "Alibaba" },
  { id: "command-r-104", name: "Command R+ 104B", paramsB: 104, defaultQuant: "q4", context: 16384, family: "Cohere" },
];

export const DEFAULT_MODEL = MODEL_PRESETS[2];
