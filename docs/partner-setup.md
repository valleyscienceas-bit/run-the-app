# Valley Science — Partner local setup (beginner guide)

Hi — please work **locally** in Cursor on your computer from now on (not Cloud / Background agents). This note assumes you might be brand new to Git. If you already did a step, skip it.

Also read [branch-workflow.md](./branch-workflow.md) for the team branch map (AI / UI / CI / Modules + hub).

## 0) Quick words

- **Repo** = the project on GitHub (`run-the-app`).
- **Clone** = download that project onto your computer as a folder.
- **Branch** = a named line of work. We share one main draft branch called the **hub**.
- **Hub** = `feature/ai-functions-frontend-backend` → full work-in-progress app. Default home.
- **Tracks** = long-lived side branches for one job each:
  - **UI:** `feature/ui`
  - **CI:** `feature/app-ci-and-tests` — **CI = Continuous Integration**, the automatic GitHub checks (install, lint, test, build). It is **not** “backend product code”; it covers frontend and backend tooling/pipeline.
  - **Modules:** `feature/modules`
- **Commit** = save a snapshot with a short message.
- **Push** = upload commits to GitHub.
- **Pull** = download latest from GitHub.
- **PR (pull request)** = ask to merge your branch into another (usually into the hub).

**Team rule:** one job per branch. Whole-app / AI on the hub. UI, CI, or Modules on their track (or a short `ui/...` branch), then PR into the hub.

## 1) Install what you need

1. Install **Cursor** (Desktop): https://cursor.com
2. Check Git:

```bash
git --version
```

If that fails: https://git-scm.com/downloads

3. Confirm GitHub access to:

`https://github.com/valleyscienceas-bit/run-the-app`

If 404, ask to be added as a collaborator.

## 2) Do you already have the repo on your computer?

**Check first.** Look for a folder like `run-the-app` or `valley-science` (often Desktop or Documents).

### Option A — You already have the folder

1. Cursor → **File → Open Folder…** → select it.
2. In the terminal:

```bash
git remote -v
git status
git fetch origin
git checkout feature/ai-functions-frontend-backend
git pull origin feature/ai-functions-frontend-backend
```

Remote URL should include `valleyscienceas-bit/run-the-app`.

### Option B — You do NOT have the folder yet

(Likely if you’ve only used cloud.)

```bash
cd ~/Desktop
git clone https://github.com/valleyscienceas-bit/run-the-app.git
cd run-the-app
git checkout feature/ai-functions-frontend-backend
git pull origin feature/ai-functions-frontend-backend
```

Then **File → Open Folder…** → `Desktop/run-the-app`. If login fails, screenshare before continuing.

## 3) Confirm you’re on the hub

```bash
git branch --show-current
```

Should print `feature/ai-functions-frontend-backend`. Also check Cursor’s status bar.

Every time you start on the hub:

```bash
git pull origin feature/ai-functions-frontend-backend
```

## 4) Run the app locally

Copy env examples once (do **not** commit real secrets):

```bash
cp backend/.env.example backend/.env
```

Fill in Firebase credentials and SMTP. For Gmail you **must** use an App Password — see [email-setup.md](./email-setup.md). Without SMTP, signup still works: the verification code is printed in the backend terminal.

If these fail, ask for the current commands:

```bash
cd backend
npm install
npm run dev
```

New terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL (often `http://localhost:5173`).

**Both partners:** use Node **22** (matches GitHub Actions). `npm ci` on Node 24 can hide lockfile problems that break CI.
## 5) How we work (one folder, switch branches)

Keep **one** Cursor window on this folder. Change branches when the job changes.

| What you’re doing | Branch to use |
|--|--|
| AI / whole app / merges | hub: `feature/ai-functions-frontend-backend` |
| UI / colors / layout | `feature/ui` or `ui/short-name` |
| CI / pipeline & tests only | `feature/app-ci-and-tests` |
| Modules / curriculum sandbox | `feature/modules` |

### New short UI branch from hub

```bash
git checkout feature/ai-functions-frontend-backend
git pull
git checkout -b ui/short-description-of-change
```

When done:

```bash
git add .
git status
git commit -m "Describe the UI change in one sentence."
git push -u origin HEAD
```

GitHub PR: **base** = `feature/ai-functions-frontend-backend`, **compare** = your branch. Do **not** PR into `main` unless you both agreed to ship.

### Modules work

```bash
git checkout feature/modules
git pull origin feature/modules
```

When ready, open a PR **into the hub** (same as UI/CI).

## 6) Stop using Cloud / Background agents as default

They create random `cursor/...` branches and your partner won’t have those changes locally. Use local chat with the project folder open.

If you already started a cloud run by mistake: stop, tell your partner the branch name, and don’t merge it alone.

(Our old cloud modules branch was renamed to `feature/modules` — use that, not a new `cursor/...` branch.)

## 7) Mini practice (once on a call)

1. Confirm you’re on the hub (`git branch --show-current`).
2. Create `ui/practice-hello` from the hub.
3. Make a tiny harmless change (or a real tiny UI tweak your partner suggests).
4. Commit, push, open PR **into the hub**.
5. Partner reviews and merges.
6. Switch back to hub and `git pull`.

After that, you’re on the team workflow.

## 8) If something goes wrong

- **“Your branch is behind”** → `git pull` (ask before force-pushing anything).
- **Merge conflicts** → stop and screenshare; don’t guess through conflicts alone the first times.
- **Can’t find your changes** → check `git branch --show-current` and `git status`.
- **Accidental cloud branch** → tell your partner; don’t keep building there.
- **Don’t know which branch** → default back to the hub and ask.

## 9) Cheat sheet

```bash
# where am I?
git branch --show-current
git status

# go to hub + update
git checkout feature/ai-functions-frontend-backend
git pull origin feature/ai-functions-frontend-backend

# tracks
git checkout feature/ui
git checkout feature/app-ci-and-tests
git checkout feature/modules

# new UI branch from hub
git checkout -b ui/my-change

# save + upload
git add .
git commit -m "Clear message about what changed."
git push -u origin HEAD
```

Then open a PR into `feature/ai-functions-frontend-backend`.

Questions? Screenshare before inventing a new long-lived whole-app branch. We only need one shared draft: the hub.
