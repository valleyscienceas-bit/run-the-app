# Local AI setup (Valerie)

Valley Science talks to AI models through the backend (`POST /api/chat`). You can run a model on your laptop with **LM Studio**, or fall back to cloud keys.

## Exact model (8GB machines)

1. Install [LM Studio](https://lmstudio.ai).
2. Search and download **Microsoft Phi-4-mini Instruct** quantized as **Q4_K_M** (~3.8B parameters).
3. Load the model → **Start Server** (default `http://127.0.0.1:1234/v1`).

**B vs GB:** 3.8B = model “brain” size. 8GB = your computer’s RAM. An 8B model usually needs ~16GB RAM; use Phi-4-mini on 8GB.

## Env vars (`backend/.env`)

```bash
AI_PROVIDER=local
LOCAL_LLM_BASE_URL=http://127.0.0.1:1234/v1
LOCAL_LLM_MODEL=phi-4-mini-instruct
LOCAL_LLM_API_KEY=lm-studio

# Optional cloud fallbacks
GEMINI_API_KEY=
OPENROUTER_API_KEY=
```

| `AI_PROVIDER` | Behavior |
| ------------- | -------- |
| `local` | LM Studio / OpenAI-compatible URL only |
| `openrouter` | OpenRouter, then Gemini if OpenRouter fails |
| `gemini` | Google Gemini only |
| `auto` (default) | Local if `LOCAL_LLM_BASE_URL` set → OpenRouter → Gemini |

**OpenAI-compatible** means LM Studio accepts the same `/v1/chat/completions` JSON format many servers use. You are not required to use OpenAI the company.

## RAG (Grade 3 facts)

Put markdown under `training/grade3/`. The backend retrieves relevant chunks and injects them as `RETRIEVED_GRADE3_CONTEXT`. This is **not** weight fine-tuning — swap models anytime; the corpus stays.

## System prompt (Valerie)

The Valerie system prompt lives in code: `backend/services/llm.ts` (`SYSTEM_INSTRUCTION`).

**Do not paste it into LM Studio’s System Prompt box** for in-app chat. Valley Science sends it automatically as a `system` message on every `/api/chat` request.

LM Studio’s System Prompt field is only for chatting inside LM Studio itself.

## How we “train” Valerie (order of operations)

1. **System prompt** (behavior / Socratic style) — edit `llm.ts`, restart backend
2. **RAG notes** (facts) — add markdown under `training/grade3/`
3. **Per-module context** — curriculum `ahHaGoal` / lesson text
4. **Weight fine-tuning** — later, optional, needs more hardware; not required now

Restart the backend after prompt changes.
