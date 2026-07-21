# Creating the GitHub repo and pushing this package

Your account `Brayo12` has no public repos yet, so start from scratch. Pick whichever path matches your setup — all three end in the same place: a repo containing this package, with GitHub Pages serving `dashboard/index.html`.

First, save/download the `KBTA_Dashboard_Package` folder from this chat to your computer if you haven't already (e.g. into `~/Downloads/KBTA_Dashboard_Package` or `Documents`).

## Option A — Git command line (recommended if you have `git` installed)

```bash
cd path/to/KBTA_Dashboard_Package

git init
git add .
git commit -m "Initial commit: KBTA dashboard architecture, XLSForms, seed data, Apps Script, dashboard"
git branch -M main

# Create the empty repo on GitHub first at https://github.com/new
# name it e.g. "kbta-regional-dashboard", do NOT initialize it with a README

git remote add origin https://github.com/Brayo12/kbta-regional-dashboard.git
git push -u origin main
```

You'll be prompted to authenticate — use a Personal Access Token as your password (GitHub no longer accepts account passwords for git operations). Create one at **GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens**, scoped to this repo, "Contents: Read and write".

## Option B — GitHub CLI (`gh`), if installed

```bash
cd path/to/KBTA_Dashboard_Package
gh auth login          # one-time, opens a browser to authenticate
gh repo create kbta-regional-dashboard --public --source=. --remote=origin --push
```

This creates the repo under `Brayo12` and pushes in one step — no manual token handling needed.

## Option C — No git installed: GitHub web UI

1. Go to `https://github.com/new`, name the repo `kbta-regional-dashboard`, keep it Public, click **Create repository**.
2. On the new repo's page, click **uploading an existing file**.
3. Drag the entire contents of `KBTA_Dashboard_Package` (all files/folders) into the upload area. GitHub preserves the folder structure (`dashboard/`, `xlsforms/`, `seed_data/`, `apps_script/`) as long as you drag the folders themselves, not just files inside them — if your browser flattens folders on drag, use Option A or B instead, or upload each subfolder separately via **Add file > Upload files** while inside that path.
4. Commit directly to `main`.

## After the repo exists: enable GitHub Pages

1. In the repo: **Settings > Pages**.
2. **Source**: "Deploy from a branch". **Branch**: `main`, folder `/ (root)`.
3. Since `index.html` lives at `dashboard/index.html` (not the repo root), GitHub Pages by default will look for `index.html` at the root and show a 404. Do one of:
   - **Simplest**: after pushing, also copy `dashboard/index.html` to the repo root (`git mv` or just duplicate it), so `https://brayo12.github.io/kbta-regional-dashboard/` loads it directly, or
   - Rename the `dashboard/` folder to `docs/` before pushing, then set Pages source folder to `/docs` in the same Settings > Pages screen — GitHub Pages supports `/docs` as a source folder natively.
4. Save. After a minute, your dashboard is live at `https://brayo12.github.io/kbta-regional-dashboard/`.

## Reminder

The dashboard will run in "Demo mode" (bundled seed snapshot) until you complete the KoboToolbox + Apps Script setup in `03_Data_Flow_and_Deployment_Guide.md` and paste the resulting API URL into `dashboard/index.html`'s `API_URL` constant — do that before or after pushing to GitHub, either order works, just re-push after editing.
