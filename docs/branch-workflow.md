# Branch workflow (team org)

## Goal

Work in **one local Cursor folder**, switch branches by task, keep one shared draft branch (the **hub**), and keep AI / UI / CI / Modules as parallel long-lived tracks that feed the hub. Partner works **locally** (no Cloud agents as default).

You do **not** need to wait for your partner to clone before building on the hub. They pull later and get what you pushed.

## The four tracks + hub

| Track | Branch | What belongs here |
|--|--|--|
| **Hub / AI** | `feature/ai-functions-frontend-backend` | Full draft app; AI features; merging other tracks; conflict resolution |
| **UI** | `feature/ui` (short `ui/...` for one-off UI) | Colors, themes, layout, visual experiments |
| **CI** | `feature/app-ci-and-tests` | GitHub Actions workflows, lint/test scripts, lockfile / Node fixes |
| **Modules** | `feature/modules` | Curriculum modules, module sandbox / CSV work, module-specific fixes |

```text
UI / CI / Modules  →  hub (AI)  →  main (when shipping)
```

- Side tracks do **one job**.
- Done work merges **into the hub** (PR preferred).
- Hub merges to **`main`** only when you are ready to release.
- Do not copy the same CI fix onto every branch; land it on CI, then merge CI → hub.

### What CI means (plain English)

**CI = Continuous Integration.** It is **not** “the backend app.”

It is the **automatic checklist** that runs on GitHub when you push or open a PR — usually things like:

- install dependencies (`npm ci`)
- typecheck / lint
- run tests
- sometimes build the frontend/backend

Those checks cover **both** frontend and backend. The `feature/app-ci-and-tests` branch is where you fix the **pipeline and test tooling** (workflow YAML, scripts in `package.json`, lockfiles so `npm ci` works). Product features (AI chat, UI colors, modules) belong on the other tracks, then get merged into the hub so CI can verify the full draft.

### Optional short UI branches

`ui/something` is only a naming habit: create from the hub (or from `feature/ui`), do one UI change, PR into the hub, then delete the short branch. The long-lived UI home is `feature/ui` (renamed from `experiment/new-color-palette`).

## Daily loop (you)

1. Open **one** local clone in Cursor.
2. **AI / merges** → checkout hub → `git pull` → work → commit/push.
3. **UI** → checkout `feature/ui` or `ui/...` → UI chat → PR into hub.
4. **CI** → checkout `feature/app-ci-and-tests` → fix pipeline/tests → PR into hub.
5. **Modules** → checkout `feature/modules` → module work → PR into hub.
6. After a merge into the hub → checkout hub → `git pull`.

## Daily loop (partner)

Follow [partner-setup.md](./partner-setup.md): clone or open existing folder → hub → local chats only → PR side work into hub.

## Cloud agents

Not the default. Cloud/Background agents create hard-to-track `cursor/...` branches. Prefer a **local** chat with the project folder open.

The old cloud branch `cursor/modules-testing-csv-e736` was renamed to `feature/modules` (same commits). The old `cursor/...` remote name has been removed.

## Other remote branches (not part of the four tracks)

| Branch | What it is | What to do |
|--|--|--|
| `chore/dev-setup-agents-md` | Housekeeping (`chore/` = maintenance, not a product feature). Adds `AGENTS.md` (how agents should run the app) and a small `backend/.env` tweak for non-mac Cloud VMs. | **Not a daily track.** Leave it for now. Later options: (1) cherry-pick / merge `AGENTS.md` into the hub if you want that guidance in the draft, then delete `chore/...`; (2) delete the branch if you don’t need it. Do **not** rename it to `feature/...`. |
| `feature/module-3001-sandbox` | Older Module 3001 sandbox. Hub already contains its useful history (0 unique commits vs hub). | Prefer `feature/modules` for new module work. Delete this remote later for less clutter. |

## How to commit and push (this repo)

From the hub (or whichever track you edited):

```bash
git status
git add docs/branch-workflow.md docs/partner-setup.md   # or: git add docs/
git commit -m "Add branch workflow and partner setup docs."
git push -u origin HEAD
```

- **`git add`** = stage files for the snapshot  
- **`git commit`** = save the snapshot locally with a message  
- **`git push`** = upload your commits to GitHub  

If `git push` says your branch has no upstream yet, `-u origin HEAD` sets it. If you’re already tracking origin, `git push` is enough.

## Branch cheat sheet

```bash
# Hub / AI
git checkout feature/ai-functions-frontend-backend
git pull origin feature/ai-functions-frontend-backend

# UI
git checkout feature/ui

# CI
git checkout feature/app-ci-and-tests

# Modules
git checkout feature/modules

# Short one-off UI from hub
git checkout feature/ai-functions-frontend-backend
git pull
git checkout -b ui/short-description
```
