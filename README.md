# KBTA Regional Programme Dashboard — Package

Everything needed to run your dashboard on free, sustainable infrastructure while keeping the exact design you supplied.

## Contents

| File / folder | What it is |
|---|---|
| `01_Architecture_and_Implementation.md` | Recommended free stack, why, and the end-to-end data flow. **Read this first.** |
| `02_Data_Dictionary_and_Data_Model.md` | Every field, its type, source form, and how filters/drill-downs map to the data. |
| `03_Data_Flow_and_Deployment_Guide.md` | Step-by-step setup: KoboToolbox → Google Sheets → Apps Script → GitHub Pages. |
| `xlsforms/` | Three ready-to-import KoboToolbox forms (Institution & Device Inventory, Employability & Graduate Tracking, Device Donations Log) — validated with `pyxform`. |
| `seed_data/` | Your existing 173 institutions, 97 graduates, and 44 donation records, converted into the new data model — import these to start with real data. |
| `apps_script/Code.gs` | Google Apps Script: syncs KoboToolbox submissions into Sheets and serves the data as JSON to the dashboard. |
| `dashboard/index.html` | The live dashboard — same layout, branding, charts, tables, map, and PIN-gated contacts page as your original template, now data-driven. Verified to render correctly (173/97/44 rows, all KPIs, all 5 country pages) against the seed data. |

## Quick start

1. Open `dashboard/index.html` in a browser right now — it already works, running on the bundled seed snapshot of your real data (status chip will say "Demo mode").
2. Follow `03_Data_Flow_and_Deployment_Guide.md` to connect it to live KoboToolbox submissions (roughly 1–2 hours, one-time).
3. Push to GitHub, enable Pages, and share the URL.

## What was replicated vs. what changed

Everything visual is unchanged: sidebar navigation, KPI cards, country cards, all charts (bar/donut/line), the Leaflet map, sortable/searchable tables, and the PIN-gated Contacts Directory. The only change is *where the data comes from* — the dashboard now fetches from a live JSON endpoint (with offline caching and a seed-data fallback) instead of having the data hard-coded into the file.
