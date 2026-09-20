# LM Link — your computer prompts, his computer runs the model

Use this when you want Valley Science (or any localhost app) on **your** machine, while a larger model runs on your **partner’s Intel iMac (32GB RAM)**.

Your phone → your computer is the same idea, flipped: the machine that **loads the model** does the work. Here, **his** Mac loads the big model; **yours** only sends prompts.

Related: [local-ai.md](./local-ai.md) (solo Phi-4-mini on 8GB).

---

## Right model (his iMac only)

Download on **his** computer, not yours:

| Field | Value |
| ----- | ----- |
| Search | `Qwen2.5-14B-Instruct` |
| Quant | **Q4_K_M** GGUF (~9 GB) |
| Prefer | Official / `lmstudio-community` (or bartowski) — **not** random forks |

**Do not download:**

- `Qwen2.5-Coder-…` (code model, wrong fit for Valerie chat)
- `…Uncensored…` third-party forks (e.g. `roleplaiapp/…`)
- Anything showing **Likely too large** on *your* laptop — that warning is about **your** RAM. Download on **his** 32GB iMac instead.

If his Mac feels too slow with 14B, use **Llama-3.1-8B-Instruct Q4_K_M** instead.

Your machine keeps **Phi-4-mini** (or your 3B) for solo use.

---

## Who turns what on

| Machine | Role | What to enable |
| ------- | ---- | ---------------- |
| **Yours** | Client + localhost API | LM Studio, LM Link, **Start Server** (port `1234`), load **his remote** model |
| **His** | Worker | LM Studio, LM Link, model **downloaded**. No need for him to Start Server for your browser |

Flow:

1. Localhost app / Valley backend → `http://127.0.0.1:1234` on **your** Mac  
2. Your LM Studio → his Mac over LM Link  
3. His Mac runs inference and returns the reply  

**Server = you. Inference = him.**

---

## Setup steps

### 1. Same LM Studio account

1. Install [LM Studio](https://lmstudio.ai/download) on **both** machines.
2. Sign in with the **same** LM Studio account on both.
3. Phone / Locally is optional and not required for this flow.

### 2. Enable LM Link on both

1. On **his** iMac: sidebar → **LM Link** → enable.  
2. On **yours**: sidebar → **LM Link** → enable.  
3. Wait until his device shows as connected on your LM Link page.

### 3. Download the model on his iMac only

1. On **his** machine: Discover / Search → `Qwen2.5-14B-Instruct`.  
2. Pick **Q4_K_M** from a trusted publisher (see table above).  
3. Download (~9 GB).  
4. Leave LM Studio open with LM Link on.

### 4. On your computer: load HIS model

This is the step that sets direction (you → him):

1. Open the **model loader** on **your** computer.  
2. Filter to **Remote** (or find the entry with **his device name** / network icon).  
3. Select **Qwen2.5-14B-Instruct Q4_K_M** on **his** machine.  
4. Click **Load**.

Do **not** load your local Phi-4-mini / 3B if you want him to do the work.

### 5. On your computer: start the local server

1. Developer → **Start Server** (default `http://127.0.0.1:1234`).  
2. Point Valley Science / your localhost app at that URL as usual (`LOCAL_LLM_BASE_URL` in [local-ai.md](./local-ai.md)).

He does **not** need Start Server for your app.

### 6. Solo mode again

1. Unload his remote model on your machine.  
2. Load your local small model.  
3. Keep (or restart) your local server.

---

## When you’re together — checklist

1. His iMac awake, LM Studio open, LM Link on.  
2. Your LM Link on; his device connected.  
3. On **your** machine: load **remote** Qwen 14B (his name), not local mini.  
4. On **your** machine: **Start Server**.  
5. Use Valley Science / localhost as normal.

---

## Optional: preferred device

If the same model name exists on both machines, set a **preferred device** (LM Link docs → preferred device) on **your** Mac so the API always prefers **his** iMac when linked.

---

## Troubleshooting

| Symptom | Likely cause |
| ------- | ------------ |
| App talks to your small model | You loaded **local** instead of **remote** |
| Remote model missing | Different LM Studio accounts, or Link off on one side |
| “Likely too large” on download | You’re downloading on the **small** machine — use **his** iMac |
| Slow replies | Expected on Intel CPU; try 8B Q4_K_M |
| Connection drops | His Mac slept / LM Studio quit |

---

## Privacy note

LM Link uses an encrypted mesh (Tailscale under the hood). Chats stay on your devices; both machines must stay signed into the shared LM Studio account for discovery.
