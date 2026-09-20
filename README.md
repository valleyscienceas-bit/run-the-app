# Valley Science — Workspace Guide

## Folder Structure

```
run-the-app/
├── frontend/        → React + Vite web app (what students see)
├── backend/         → Express server, Firebase, Valerie AI
├── modules/         → Curriculum data (CSV spreadsheets, standards)
├── sandbox/         → Standalone HTML Grade 3 labs
├── training/        → RAG source text for Valerie (Grade 3 notes)
├── docs/            → Setup guides (see local-ai.md)
└── .gitignore       → Files git should never track
```

## Quick Reference

| Folder | What lives here | Tech |
|--------|----------------|------|
| `frontend/src/components/` | UI screens (Dashboard, Chat, ModuleGrid…) | React, TypeScript, Tailwind |
| `frontend/src/curriculum.ts` | Module definitions (grades 3, 5, 8) | TypeScript |
| `backend/server.ts` | API routes, auth, progress | Express, Firebase Admin |
| `backend/services/llm.ts` | Valerie AI (LM Studio / Gemini / OpenRouter) | Local + cloud |
| `training/grade3/` | Grade 3 RAG markdown | Markdown |
| `docs/local-ai.md` | Phi-4-mini + LM Studio setup | Docs |
| `sandbox/` | Interactive HTML prototypes | Vanilla HTML5/JS/CSS |

## Local AI

See [docs/local-ai.md](docs/local-ai.md) for **Phi-4-mini Instruct (Q4)** in LM Studio and `AI_PROVIDER` env switching.

## Email (verification + parent invites)

Gmail needs an **App Password**. If you see `535 BadCredentials`, follow [docs/email-setup.md](docs/email-setup.md).

### Quick start

```bash
npm run deps
# Terminal 1
npm run dev:backend
# Terminal 2
npm run dev:frontend
# Optional: LM Studio → load Phi-4-mini Instruct Q4_K_M → Start Server
```
