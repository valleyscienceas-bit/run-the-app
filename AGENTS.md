# Valley Science

Educational web app for 3rd–8th grade NGSS science. Two services:

- `frontend/` — React 19 + Vite + Tailwind SPA. Talks directly to a real Firebase project (`valley-science-asss`) via the client SDK for Auth + Firestore. Dev server on port `3000`, proxies `/api` → `http://localhost:3001`.
- `backend/` — Express + Firebase Admin SDK + Gemini AI (`@google/genai`) + Nodemailer. Dev server on port `3001`. Exposes `/api/chat` (Socratic AI), profile/results/parent-provisioning routes (Admin SDK), and email routes.

Standard commands live in each `package.json` (`dev`, `build`, `lint`). `lint` is `tsc --noEmit`.

## Cursor Cloud specific instructions

- Run the two dev servers separately (each in its own directory): `npm run dev` in `backend/` (port 3001) and `npm run dev` in `frontend/` (port 3000). Backend uses `tsx` and frontend uses Vite; neither type-checks at runtime, so the app runs even though `npm run lint` currently reports pre-existing TypeScript errors in `frontend/src/App.tsx`, `frontend/src/components/LandingPage.tsx`, and `backend/services/gemini.ts`. Do not "fix" these unless that is the task.
- `backend/.env` ships with a macOS-only `GOOGLE_APPLICATION_CREDENTIALS` path. It must be blank on this VM, otherwise the backend crashes on startup (`fs.readFileSync` on a missing file). With it blank, the backend falls back to Application Default Credentials and still boots; Admin-SDK routes (profile creation, save-results, parent provisioning, username lookup, track-time) will fail at call time because no service-account credentials are present.
- No Firebase service-account key is available here, so flows that persist via the Admin SDK cannot complete (full student/parent signup writes a profile through `/api/create-profile`). The fully client-side flows DO work end to end: District → "Enter as Guest" login, browsing the grade curriculum/units, and taking the placement / grade-level / unit tests (questions and scoring are local in `PlacementTest.tsx`).
- The Socratic AI (`/api/chat`) reaches Gemini correctly, but the committed free-tier `GEMINI_API_KEY` is quota-exhausted (HTTP 429). Supply a working `GEMINI_API_KEY` (or `OPENROUTER_API_KEY`) in `backend/.env` to exercise live chat.
- `node_modules` is committed but was built for macOS (darwin-arm64). The update script reinstalls for Linux; if you ever see esbuild/Vite native-binary errors, re-run `npm ci` in the affected package.
