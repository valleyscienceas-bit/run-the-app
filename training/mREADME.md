# Training data for Valerie

Put Grade 3 curriculum notes under `grade3/` as `.md` or `.txt` files.

The backend **RAG** retriever (`backend/services/rag.ts`) reads these files at runtime and injects the best-matching chunks into Valerie’s prompt. This is **not** weight fine-tuning — you can swap LM Studio models anytime without re-training.

See `docs/local-ai.md` for LM Studio + Phi-4-mini setup.
