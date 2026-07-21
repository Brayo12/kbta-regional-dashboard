# KBTA Dashboard — Data Flow & Deployment Guide

## Part A — How data flows (for reference)

1. Field staff complete one of three Kobo forms (on the Kobo mobile app or web form) per institution/graduate/donation event.
2. KoboToolbox stores the submission and exposes it via its REST API (`/api/v2/assets/{form_uid}/data.json`).
3. A Google Apps Script trigger (`syncAll`, every 30 minutes by default) calls that API for each form, skips submissions it has already synced (matched on Kobo's `_uuid`), and appends new rows to the corresponding Google Sheet tab.
4. The same script recomputes `Country_Summary` from the `Institutions` tab.
5. The Apps Script is also deployed as a **Web App**; its `doGet()` function reads all four tabs and returns them as one JSON object.
6. `dashboard/index.html`, hosted as a static page, calls that Web App URL on load (and on manual "Refresh"), normalises the JSON, and renders the same charts/tables/map as your original template. If the fetch fails, it falls back to the last successful sync cached in the browser, then to the bundled seed snapshot.

No step above requires a server you manage — Kobo, Apps Script, and GitHub Pages are all hosted and free.

## Part B — Step-by-step deployment

### 1. KoboToolbox

1. Sign up / log in at `https://www.kobotoolbox.org` (free hosted tier is sufficient).
2. For each file in `/xlsforms`, go to **New > Import an XLSForm** and upload it:
   - `KBTA_Institution_Device_Inventory.xlsx`
   - `KBTA_Employability_Graduate_Tracking.xlsx`
   - `KBTA_Device_Donations_Log.xlsx`
3. Deploy each form (top-right **Deploy** button).
4. For each deployed form, open **Settings** and copy its **Form UID** (the short code in the URL, e.g. `aXyZ123abc...`) — you'll need these three UIDs in step 3 below.
5. Under your account **Settings > API Token**, generate/copy your API token.
6. Share the form links with field teams, or install the Kobo Collect Android app and add the forms there for offline data entry.

### 2. Google Sheet (the "database")

1. Create a new Google Sheet, e.g. "KBTA Regional Programme Data".
2. Create four tabs named exactly: `Institutions`, `Employability`, `Donations`, `Country_Summary`.
3. Import the seed data to give the dashboard real current data from day one:
   - In `Institutions`: **File > Import > Upload** `seed_data/Institutions.csv`, "Replace current sheet". Then insert a new column A and header it `_kobo_uuid` (leave it blank for these historical rows — they predate Kobo and won't be touched by the sync/de-dup logic), and add a `submission_time` column.
   - Repeat for `Employability.csv` and `Donations.csv` into their respective tabs.
   - Leave `Country_Summary` empty — Apps Script populates it automatically.
4. Make sure column headers in each tab match the field names in `02_Data_Dictionary_and_Data_Model.md` exactly (case-sensitive) — the sync script and the dashboard both key off these header names.

### 3. Apps Script (sync engine + JSON API)

1. In the Google Sheet: **Extensions > Apps Script**.
2. Delete the placeholder `Code.gs` content and paste in the contents of `apps_script/Code.gs` from this package.
3. Edit the `CONFIG` block at the top:
   - `KOBO_API_TOKEN`: the token from KoboToolbox step 5 above.
   - `FORMS.institutions`, `FORMS.employability`, `FORMS.donations`: the three Form UIDs from step 4 above.
   - `CONTACTS_PIN`: change from `2026` if you want a different PIN for the Contacts Directory page.
4. Save the project (name it e.g. "KBTA Sync").
5. In the function dropdown, select `setup` and click **Run**. Grant the requested permissions (this script only talks to the Kobo API and your own Sheet). This creates the 30-minute sync trigger and runs one sync immediately.
6. **Deploy > New deployment > Select type: Web app.**
   - Description: "KBTA Dashboard API"
   - Execute as: **Me**
   - Who has access: **Anyone** (this only exposes read-only aggregated programme data, no write access or credentials)
7. Click **Deploy**, authorize again if prompted, and copy the **Web app URL** (ends in `/exec`).

### 4. Wire the dashboard to the live data

1. Open `dashboard/index.html` in a text editor.
2. Find the line near the top of the script:
   ```js
   const API_URL = "";
   ```
3. Paste your Web App URL between the quotes:
   ```js
   const API_URL = "https://script.google.com/macros/s/XXXXXXXX/exec";
   ```
4. Save. The status chip in the top bar will read "Live · synced from KoboToolbox" once this is working; until then it runs on the bundled seed snapshot and shows "Demo mode".

### 5. Host on GitHub Pages

1. Push this whole package (or at minimum the `dashboard/` folder) to a GitHub repository.
2. In the repo: **Settings > Pages**.
3. Under **Build and deployment**, set **Source: Deploy from a branch**, branch `main`, folder `/ (root)` if `index.html` sits at the repo root, or `/dashboard` if you keep this folder structure (GitHub Pages also supports a `/docs` folder as a source if you prefer — rename `dashboard/` to `docs/` in that case, or copy `dashboard/index.html` to the repo root).
4. Save. GitHub gives you a URL like `https://<your-username>.github.io/<repo-name>/`. That's your live, shareable dashboard.
5. (Optional) Add a custom domain under the same Pages settings.

Since you mentioned wanting to use your own GitHub repo but a connector isn't authorized in this session, share the repo URL if you'd like these instructions tailored to its exact folder layout, or push the package yourself following the generic steps above.

### 6. Ongoing operation

- New Kobo submissions sync automatically every 30 minutes — no action needed.
- To review or correct data, edit it directly in the Google Sheet; the next `doGet()` call picks up the change immediately (no separate "publish" step).
- To force an immediate sync outside the 30-minute schedule, open the Apps Script editor and run `syncAll` manually, or add a menu item (see `Code.gs` comments for extension points).
- To change the sync frequency, edit `everyMinutes(30)` in the `setup()` function and re-run `setup()`.
- Google Apps Script's free quota (script runtime, URL fetches) is far larger than this workload requires; monitor via **Apps Script > Executions** if submission volume grows substantially.

## Part C — Verification checklist

- [ ] All three XLSForms import into KoboToolbox without errors (already validated with `pyxform` during creation of this package).
- [ ] Seed CSVs imported into the correct Sheet tabs with headers matching the data dictionary.
- [ ] `setup()` ran successfully and `Country_Summary` populated with 5 rows.
- [ ] Web app URL returns JSON when opened directly in a browser (`{"institutions":[...],...}`).
- [ ] `dashboard/index.html` with `API_URL` set shows "Live" status chip and real data.
- [ ] Submitting a test Kobo entry appears in the Sheet within one sync cycle, and in the dashboard after a "Refresh" click.
