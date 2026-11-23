# Forge

Inspecteur matériel pour LLM locaux — VRAM, bande passante, tokens/s, comparaison de stations, liens boutiques affiliés.

The [Bitcoin mining calculator](docs/bitcoin-mining.md) compares expected pool payouts, electricity costs and ASIC payback in EUR. Open **Bitcoin** in the Forge header.

## Stack

TanStack Start + Vite + React 19. Auth off, no database. State in the browser.

## Deploy

Vercel. Build: `npm run build` (Nitro `vercel` preset).

## Local inference estimator (21 November 2026)

Choose a model, weight format, occupied context per sequence, KV precision, concurrent sequences and runtime utilization. The comparison reports decode tokens/s **per sequence**, aggregate tokens/s, inter-token latency, time for 512 generated tokens at the selected context, and throughput per purchase euro when a price is available.

- Resident memory = (all weights + all sequence caches) × 1.20, in decimal GB. Unified-memory systems also reserve 4 GB for the OS. Both margins are planning assumptions.
- Quantized weight sizes approximate block storage. Actual mixed-precision GGUF, GPT-OSS MXFP4, embeddings and runtime buffers vary. INT8 KV assumes one byte per cache element.
- Architecture profiles sum key and value storage by layer, KV heads, head dimension and attended positions. Sliding layers cap their window. Qwen also includes recurrent state. Older presets without geometry and custom sizes use a parameter-count cache heuristic and omit attention FLOPs.
- One synchronous decode step reads active weights plus cache. Dense sequences share weights. For MoE, distinct expert reads per batch are conservatively capped at total weights. Compute includes approximately two operations per active parameter plus attention over the occupied context.
- The lower available compute or memory ceiling determines speed. Runtime utilization defaults to 80%, with the existing vendor factor applied to bandwidth. Missing compute specifications give a bandwidth-only estimate. New configurations without verified euro prices are excluded from value awards.
- Predictions cover fully resident text decode. Prompt prefill, queueing, time to first token, CPU offload, multi-GPU interconnect overhead, speculative decoding, power consumption and thermal throttling require runtime-specific measurements. The 512-token estimate holds context constant.

### Catalog sources

- Model architecture and size: [Qwen3.8](https://huggingface.co/Qwen/Qwen3.8-27B/blob/main/config.json), [Gemma 4](https://huggingface.co/google/gemma-4-31B-it/blob/main/config.json), [Granite 4.2 family](https://huggingface.co/ibm-granite/granite-4.2-3b), [Ministral 3](https://huggingface.co/mistralai/Ministral-3-14B-Instruct-2512/blob/main/config.json), [gpt-oss-20b](https://huggingface.co/openai/gpt-oss-20b) and [gpt-oss-120b](https://huggingface.co/openai/gpt-oss-120b).
- Memory capacity and bandwidth: [MacBook Air M5](https://support.apple.com/en-us/126320), [MacBook Pro M5 Pro/Max](https://support.apple.com/en-gb/126319), [MacBook Pro M6](https://support.apple.com/en-la/148300), [RTX PRO 6000 Blackwell Workstation](https://www.nvidia.com/en-us/products/workstations/professional-desktop-gpus/rtx-pro-6000/), [Radeon AI PRO R9700](https://www.amd.com/en/products/graphics/workstations/radeon-ai-pro/ai-9000-series/amd-radeon-ai-pro-r9700.html) and [Intel Arc Pro B-series](https://dgpu-docs.intel.com/overview/architecture/gpu-architecture.html).
