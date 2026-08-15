# Valley Science — Workspace Guide

## Folder Structure

```
run-the-app/
├── frontend/        → React + Vite web app (what students see)
├── backend/         → Express server, Firebase, Gemini AI
├── modules/         → Curriculum data (CSV spreadsheets, standards)
├── sandbox/         → Standalone HTML mockups for testing
└── .gitignore       → Files git should never track
```

## Quick Reference

| Folder | What lives here | Tech |
|--------|----------------|------|
| `frontend/src/components/` | UI screens (Dashboard, Chat, ModuleGrid…) | React, TypeScript, Tailwind |
| `frontend/src/curriculum.ts` | Module definitions (NGSS codes, units) | TypeScript |
| `backend/server.ts` | API routes, auth, payments | Express, Firebase Admin |
| `backend/services/gemini.ts` | Valerie AI tutor logic | Google Gemini |
| `modules/modules_testing.csv` | Testing spreadsheet (3 modules) | CSV |
| `sandbox/` | Full interactive HTML prototypes | Vanilla HTML5/JS/CSS |
