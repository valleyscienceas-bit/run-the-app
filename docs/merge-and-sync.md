# Merge tracks into hub + sync prompt queue

Recipes for the four long-lived tracks. Hub = `feature/ai-functions-frontend-backend`.

Flow: **UI / CI / Modules → hub → main (only when shipping).**

---

## Step 1 — Option A: Merge a side track into the hub via PR

Use this after you commit and push work on `feature/ui`, `feature/modules`, or `feature/app-ci-and-tests`.

### Why

A pull request reviews the whole track’s commits before they land on the hub. Prefer this over a raw local merge.

### Commands (example: UI → hub)

```bash
# On the side branch, after your work is committed:
git push -u origin HEAD

# Open a PR into the hub (change --head for modules / CI)
gh pr create --base feature/ai-functions-frontend-backend --head feature/ui \
  --title "Merge UI into hub" \
  --body "$(cat <<'EOF'
## Summary
- …

## Test plan
- [ ] …
EOF
)"
```

Same pattern for the other tracks:

| Track | `--head` value |
|--|--|
| UI | `feature/ui` |
| Modules | `feature/modules` |
| CI | `feature/app-ci-and-tests` |

### After the PR is merged on GitHub

```bash
git switch feature/ai-functions-frontend-backend
git pull
```

That updates your local hub to include the merge.

### Plain English

| Command | Meaning |
|--|--|
| `gh pr create --base … --head …` | Ask GitHub to merge the side branch into the hub |
| `--base` | Destination branch (hub) |
| `--head` | Source branch (UI / Modules / CI) |
| `git switch` + `git pull` | Go to hub locally and download the merged result |

Do **one track at a time**. Do **not** merge into `main` until you are ready to release.

---

## Step 1b — Merge a short `ui/*` branch into `feature/ui` (not the hub)

Use this when a one-off UI branch (for example `ui/lab-polish`) is done and should land on the **long-lived UI track** first. Do **not** open the PR against the hub here — hub still receives UI via `feature/ui` → hub (Step 1).

### Why

Short `ui/…` branches are disposable polish/experiment branches. Folding them into `feature/ui` keeps the UI track as the single source of UI history, then you merge `feature/ui` into the hub when that track is ready.

### Commands (example: `ui/lab-polish` → `feature/ui`)

```bash
# On the short UI branch, after your work is committed:
git push -u origin HEAD

# Open a PR into the UI track — base is feature/ui, NOT the hub
gh pr create --base feature/ui --head ui/lab-polish \
  --title "Merge ui/lab-polish into feature/ui" \
  --body "$(cat <<'EOF'
## Summary
- …

## Test plan
- [ ] …
EOF
)"
```

### After the PR is merged on GitHub

```bash
git switch feature/ui
git pull

# Optional: delete the short branch locally and on origin
git branch -d ui/lab-polish
git push origin --delete ui/lab-polish
```

When you later want this UI work on the hub, use **Step 1** (`feature/ui` → hub).

### Plain English

| Command | Meaning |
|--|--|
| `gh pr create --base feature/ui --head ui/…` | Merge the short UI branch into the UI track only |
| `--base feature/ui` | Destination is the long-lived UI branch — **not** hub, **not** `main` |
| `--head ui/…` | Source short branch |
| Later Step 1 | Move accumulated UI track work into the hub |

Same idea works for other short prefixes if you add them later (for example a disposable `ci/…` into `feature/app-ci-and-tests`): always PR into the matching long-lived `feature/*` track, never straight into the hub unless you intentionally want that.

---

## Step 1c — Merge (approve + land) an open PR

Creating a PR (Step 1 / 1b) does **not** land the code. You still have to **merge** it on GitHub.

### Prefers: GitHub CLI (`gh`)

From any branch, with `gh` logged into the right account (`gh auth status`):

```bash
# List open PRs for this repo
gh pr list

# Optional: review the diff / checks
gh pr view 3
gh pr checks 3

# Merge it (squash keeps history tidy for short ui/* → feature/ui)
gh pr merge 3 --squash --delete-branch
```

Replace `3` with the PR number. Useful flags:

| Flag | Meaning |
|--|--|
| `--squash` | One commit on the base branch (good for short `ui/*` polish) |
| `--merge` | Classic merge commit (fine for long track → hub) |
| `--delete-branch` | Delete the head branch on GitHub after merge |
| `--admin` | Only if you must bypass branch protection (prefer not to) |

If `gh` is missing: `brew install gh` then `gh auth login` (use the account that owns this org/repo).

### Alternate: GitHub website

1. Open the PR URL (or **Pull requests** on the repo).
2. Confirm **base** is correct (`feature/ui` for a `ui/*` PR; hub for a track PR — never `main` until release).
3. Wait for required checks if any.
4. Click **Merge pull request** (or **Squash and merge**).
5. Confirm, then optionally **Delete branch**.

### After it lands — update your local clone

```bash
# Switch to the base branch you merged into, then pull
git switch feature/ui          # or: feature/ai-functions-frontend-backend for hub PRs
git pull

# If you still have the short branch locally and used --delete-branch on origin:
git branch -d ui/lab-polish    # only after it is merged / deleted on origin
```

### Plain English

| Action | Meaning |
|--|--|
| `gh pr list` / open PR in browser | Find the open pull request |
| `gh pr merge …` / **Merge** button | Actually apply the branch onto the base |
| `git switch` + `git pull` on the **base** | Download the merge so your laptop matches GitHub |

Do **not** merge into `main` here. Short UI work: merge into `feature/ui`. Track work: merge into the hub. Hub → `main` only when shipping.

---

## Step 2 — Option A: Sync only `docs/prompt-queue.md` via cherry-pick

Use this when you updated the prompt queue on the hub and want the **same commit** on UI / CI / Modules — **not** on `main`.

### Why

A full branch merge would drag unrelated code. Cherry-pick replays **one commit**. Keep the prompt-queue edit in its **own commit** (no other files) so the cherry-pick stays clean.

### On the hub first

```bash
git switch feature/ai-functions-frontend-backend
# edit docs/prompt-queue.md, then:
git add docs/prompt-queue.md
git commit -m "Update prompt queue"
git push

COMMIT=$(git rev-parse HEAD)
```

`COMMIT=$(git rev-parse HEAD)` saves that commit’s ID for the loop below.

### Copy to every track except `main`

Restore lockfiles before each switch so a post-checkout `npm install` hook cannot block the next branch:

```bash
for b in feature/ui feature/app-ci-and-tests feature/modules; do
  git restore backend/package-lock.json frontend/package-lock.json 2>/dev/null || true
  git switch "$b"
  git restore backend/package-lock.json frontend/package-lock.json 2>/dev/null || true
  git pull
  git cherry-pick "$COMMIT"
  git push
done

git restore backend/package-lock.json frontend/package-lock.json 2>/dev/null || true
git switch feature/ai-functions-frontend-backend
```

`main` is intentionally **not** in that list.

The same cherry-pick loop works for other **single-file doc** commits (for example `docs/merge-and-sync.md`) — keep that edit in its own commit too.

### Plain English

| Command | Meaning |
|--|--|
| `git add` + `git commit` | Snapshot only the prompt-queue file on the hub |
| `git push` | Upload that commit |
| `COMMIT=$(git rev-parse HEAD)` | Remember this commit’s ID |
| `git restore …package-lock.json` | Discard lockfile noise from the branch-switch npm hook |
| `for b in …; do …; done` | Repeat the same steps for each side branch |
| `git cherry-pick "$COMMIT"` | Replay that one commit onto the current branch |
| Final `git switch` hub | Return to the hub when finished |

If cherry-pick conflicts, fix the file, `git add docs/prompt-queue.md`, then `git cherry-pick --continue` (or `git cherry-pick --abort` to cancel).

### If a switch fails mid-loop (lockfiles)

You may see:

```text
error: Your local changes to the following files would be overwritten by checkout:
        backend/package-lock.json
        frontend/package-lock.json
```

or get stuck with `You are currently cherry-picking…` / `cannot switch branch while cherry-picking`.

Fix, then continue:

```bash
git restore backend/package-lock.json frontend/package-lock.json

# If Git says you are still cherry-picking and the commit is already on this branch:
git cherry-pick --skip
# Or if you need to cancel entirely:
# git cherry-pick --abort

# Then finish any remaining branches in the loop, e.g. modules:
git switch feature/modules
git pull
git cherry-pick "$COMMIT"
git push

git switch feature/ai-functions-frontend-backend
```
