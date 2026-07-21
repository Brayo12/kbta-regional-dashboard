# KBTA Regional Programme Dashboard — Architecture & Implementation Recommendation

## 1. Recommended stack

| Layer | Tool | Why |
|---|---|---|
| Data collection | **KoboToolbox** | Already the programme's field tool; free tier is generous (unlimited forms, submissions capped only by storage, which is ample for this volume); offline-capable Android/iOS app for field staff in areas with poor connectivity. |
| Data store / system of record | **Google Sheets** | Free, familiar to non-technical programme staff, human-readable and editable for QA/corrections, versioned, exportable. Acts as the "database" behind the dashboard. |
| Sync (Kobo → Sheets) | **Google Apps Script**, time-driven trigger | Free, no server to maintain, runs inside the Sheet itself, calls the Kobo REST API on a schedule and appends only new submissions (de-duplicated by Kobo's `_uuid`). |
| Data API (Sheets → Dashboard) | **Google Apps Script Web App** (`doGet`) | Free hosting, no backend needed. Publishes the Sheet contents as JSON. Deployed once, gives a stable HTTPS URL the dashboard fetches on load. |
| Dashboard | **Static HTML/CSS/JS** — your existing template, Chart.js + Leaflet | Pixel-identical to the design you supplied; runs entirely in the browser; zero hosting cost. |
| Hosting | **GitHub Pages** | Free, sustainable, deploys straight from your GitHub repo, custom domain supported if wanted later. |

**Total recurring cost: $0.** Every layer sits on a free tier that doesn't expire, and none requires a server you have to patch or pay for.

## 2. Why not Looker Studio (or similar BI tools)

Looker Studio, Power BI, and similar tools are excellent for ad-hoc analytics, but they cannot reproduce this dashboard's design: the custom sidebar with country flags, the specific KPI card layout and icon colours, the Material Symbols iconography, the PIN-gated Contacts page, the sortable/searchable tables, and the Leaflet map with custom markers are all bespoke UI you already built. A BI tool would force a visual downgrade to match its own component library. Since "closely replicate the template" was a hard requirement, a static site that keeps your exact HTML/CSS/JS and only swaps the data source is the only approach that satisfies it while staying free.

## 3. High-level data flow

```
Field staff (Kobo mobile/web app)
        │  submits forms (Institution & Device Inventory,
        │  Employability, Device Donations)
        ▼
KoboToolbox server (kf.kobotoolbox.org)
        │  REST API v2, pulled on a schedule
        ▼
Google Apps Script "sync" job (every 30 min, time trigger)
        │  appends new rows, de-duplicates by submission UUID
        ▼
Google Sheet (Institutions / Employability / Donations / Country_Summary)
        │  Apps Script "Web App" endpoint (doGet) serves this as JSON
        ▼
Dashboard (GitHub Pages, static HTML/JS)
        │  fetch() on page load + manual "Refresh" button
        ▼
Browser renders KPIs, charts, tables, map — identical to your template
```

If the API is unreachable (offline, Apps Script quota, etc.), the dashboard falls back to the last successful sync cached in the browser's `localStorage`, and finally to a bundled seed snapshot — so it never shows a blank page.

## 4. Why this is scalable and low-maintenance

- **New indicators**: add a column to the relevant Kobo form and Sheet; the dashboard's registry/table views already render whatever fields exist. Chart-level additions are a few lines of JS (this file uses the same small set of chart helper functions — `hbar`, `vbar`, `donut`, `line` — for everything).
- **New regions/countries**: add an entry to the `COUNTRY_META` object in the dashboard (label, colour, map coordinates) and start submitting Kobo data with that country value — no redesign needed.
- **New reporting periods**: Kobo submissions are timestamped automatically; the model supports adding a "reporting period" field later without breaking existing data (see `02_Data_Dictionary_and_Data_Model.md`, Section 5 — Scalability notes).
- **New device types**: the Institution form's "Other / new device types" repeat group (see the XLSForm) lets field staff log anything not yet in the fixed device list, so new device categories don't require a form redesign.
- **Minimal technical support**: nothing here needs a developer to keep running. Programme staff can review/correct data directly in Google Sheets; the only "code" that ever needs touching is the Apps Script CONFIG block (API token, form IDs) when a new form is added.

## 5. What you still need to do (one-time setup, ~1–2 hours)

1. Create the KoboToolbox account/project and import the three XLSForms in `/xlsforms`.
2. Create a Google Sheet, import the CSVs in `/seed_data` as the starting tabs.
3. Paste `apps_script/Code.gs` into that Sheet's Apps Script editor, fill in the `CONFIG` block, run `setup()` once, deploy as a Web App.
4. Paste the Web App URL into `API_URL` at the top of `dashboard/index.html`.
5. Push the repo to GitHub, enable GitHub Pages.

Full step-by-step instructions are in `03_Data_Flow_and_Deployment_Guide.md`.
