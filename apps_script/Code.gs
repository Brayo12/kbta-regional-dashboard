/**
 * KBTA Regional Programme Dashboard — Google Apps Script
 * ---------------------------------------------------------------
 * This script is the free "glue" between KoboToolbox and the dashboard.
 * It does two jobs, both running inside your Google Sheet:
 *
 *  1. SYNC (time-driven trigger, e.g. every 30-60 min):
 *     Calls the KoboToolbox REST API for each of the three forms,
 *     pulls any submissions this Sheet hasn't seen yet, and appends
 *     them as new rows to the Institutions / Employability / Donations
 *     tabs. It also recomputes the Country_Summary tab.
 *
 *  2. WEB APP (doGet):
 *     When deployed as a Web App, returns the whole dataset as JSON
 *     in exactly the shape dashboard/index.html expects. The
 *     dashboard's API_URL constant should point at this Web App's
 *     /exec URL.
 *
 * SETUP (see 03_Data_Flow_and_Deployment_Guide.md for full walkthrough):
 *   1. Create a Google Sheet with tabs: Institutions, Employability,
 *      Donations, Country_Summary (headers matching the CSVs in
 *      /seed_data, plus a "_kobo_uuid" column in each data tab used
 *      for de-duplication).
 *   2. Extensions > Apps Script, paste this file in as Code.gs.
 *   3. Fill in the CONFIG block below with your Kobo API token and
 *      form UIDs (found in Kobo under each form's "..." > "Settings").
 *   4. Run `setup()` once from the Apps Script editor to create a
 *      time trigger.
 *   5. Deploy > New deployment > Web app. Execute as "Me", access
 *      "Anyone" (read-only JSON, no write access is exposed).
 *   6. Copy the deployment URL into API_URL in dashboard/index.html.
 */

// ============================================================
// CONFIG — fill these in
// ============================================================
const CONFIG = {
  KOBO_BASE_URL: 'https://kf.kobotoolbox.org',   // or your self-hosted / EU server
  KOBO_API_TOKEN: 'PASTE_YOUR_KOBO_API_TOKEN_HERE', // Kobo account > Settings > API Token
  FORMS: {
    institutions: 'PASTE_INSTITUTION_FORM_UID_HERE',
    employability: 'PASTE_EMPLOYABILITY_FORM_UID_HERE',
    donations: 'PASTE_DONATIONS_FORM_UID_HERE',
  },
  CONTACTS_PIN: '2026', // shown on the Contacts Directory gate in the dashboard
  SHEET_NAMES: {
    institutions: 'Institutions',
    employability: 'Employability',
    donations: 'Donations',
    country_summary: 'Country_Summary',
  },
};

const COUNTRY_META = {
  Kenya:    { lat: -1.286,  lng: 36.82,  color: '#F5C018' },
  Rwanda:   { lat: -1.954,  lng: 30.06,  color: '#CC2200' },
  Malawi:   { lat: -13.962, lng: 33.774, color: '#888888' },
  Tanzania: { lat: -6.369,  lng: 34.889, color: '#00b0cc' },
  Uganda:   { lat: 0.348,   lng: 32.583, color: '#6c3483' },
};

// ============================================================
// ONE-TIME SETUP
// ============================================================
function setup() {
  // Remove any existing triggers for syncAll to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'syncAll') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncAll').timeBased().everyMinutes(30).create();
  syncAll(); // run once immediately
}

// ============================================================
// SYNC: Kobo -> Sheets
// ============================================================
function syncAll() {
  syncForm_('institutions', mapInstitutionSubmission_);
  syncForm_('employability', mapEmployabilitySubmission_);
  syncForm_('donations', mapDonationSubmission_);
  recomputeCountrySummary_();
}

function syncForm_(key, mapFn) {
  const formUid = CONFIG.FORMS[key];
  if (!formUid || formUid.indexOf('PASTE_') === 0) return; // not configured yet

  const sheet = getOrCreateSheet_(CONFIG.SHEET_NAMES[key]);
  const existingUuids = getExistingUuids_(sheet);

  let url = `${CONFIG.KOBO_BASE_URL}/api/v2/assets/${formUid}/data.json?format=json`;
  const headers = { Authorization: `Token ${CONFIG.KOBO_API_TOKEN}` };
  const allResults = [];
  while (url) {
    const res = UrlFetchApp.fetch(url, { headers, muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      Logger.log(`Kobo fetch failed for ${key}: ${res.getResponseCode()} ${res.getContentText()}`);
      break;
    }
    const json = JSON.parse(res.getContentText());
    allResults.push(...(json.results || []));
    url = json.next || null;
  }

  const newRows = allResults
    .filter(sub => !existingUuids.has(sub._uuid))
    .map(mapFn);

  if (newRows.length) appendRows_(sheet, newRows);
  Logger.log(`${key}: ${newRows.length} new submissions synced (of ${allResults.length} total).`);
}

// ---- field mappers: Kobo submission JSON -> flat row matching CSV headers ----
function mapInstitutionSubmission_(s) {
  const countryLabel = { kenya: 'Kenya', rwanda: 'Rwanda', malawi: 'Malawi', tanzania: 'Tanzania', uganda: 'Uganda' }[s.country] || s.country;
  return [
    s._uuid, s['end'] || s['_submission_time'], countryLabel, s.region || '', s.subregion || '',
    s.category === 'other' ? (s.category_other || 'Other') : labelize_(s.category),
    num_(s.enrolment),
    num_(s.device_or20), num_(s.device_calculator), num_(s.device_laptop), num_(s.device_desktop),
    num_(s.device_tablet), num_(s.device_scanner), num_(s.device_lego_braille), num_(s.device_hable_one),
    num_(s.device_robotics_kit),
    s.head_teacher_name || '', s.head_teacher_phone || '',
    s.ict_braille_teacher_name || '', s.ict_braille_teacher_phone || '',
    s.technician_name || '', s.technician_phone || '',
  ];
}
function mapEmployabilitySubmission_(s) {
  const countryLabel = { kenya: 'Kenya', rwanda: 'Rwanda', malawi: 'Malawi', tanzania: 'Tanzania', uganda: 'Uganda' }[s.country_of_training] || s.country_of_training;
  return [
    s._uuid, s['_submission_time'], s.graduate_name || '', labelize_(s.gender), labelize_(s.cohort),
    s.year_of_completion || '', s.qualification || '', s.internship_placement || '',
    s.employment_organization || '', labelize_(s.sector), labelize_(s.status), countryLabel,
  ];
}
function mapDonationSubmission_(s) {
  return [
    s._uuid, s['_submission_time'], s.donor_name || '', s.donation_year || '',
    num_(s.devices_or20), num_(s.devices_orion), num_(s.devices_computer),
    num_(s.devices_laptop), num_(s.devices_tablet), num_(s.devices_scanner),
  ];
}
function num_(v) { const n = Number(v); return isNaN(n) ? 0 : n; }
function labelize_(v) {
  if (!v) return '';
  return String(v).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================
// Country_Summary aggregation (drives Overview KPIs + Map)
// ============================================================
function recomputeCountrySummary_() {
  const instSheet = getOrCreateSheet_(CONFIG.SHEET_NAMES.institutions);
  const rows = sheetToObjects_(instSheet);

  const totals = {};
  Object.keys(COUNTRY_META).forEach(c => totals[c] = {
    institutions: 0, learners: 0, or20: 0, calcs: 0, laptops: 0, desktops: 0,
    tablets: 0, scanners: 0, lego: 0, hable: 0, robotic: 0, cb: 0, maint: 0,
  });
  rows.forEach(r => {
    const c = r.country;
    if (!totals[c]) return;
    totals[c].institutions++;
    totals[c].learners += Number(r.enrolment) || 0;
    totals[c].or20 += Number(r.device_or20) || 0;
    totals[c].calcs += Number(r.device_calculator) || 0;
    totals[c].laptops += Number(r.device_laptop) || 0;
    totals[c].desktops += Number(r.device_desktop) || 0;
    totals[c].tablets += Number(r.device_tablet) || 0;
    totals[c].scanners += Number(r.device_scanner) || 0;
    totals[c].lego += Number(r.device_lego_braille) || 0;
    totals[c].hable += Number(r.device_hable_one) || 0;
    totals[c].robotic += Number(r.device_robotics_kit) || 0;
  });

  const sheet = getOrCreateSheet_(CONFIG.SHEET_NAMES.country_summary);
  sheet.clear();
  const header = ['country','institutions','learners','or20','calcs','laptops','desktops','tablets','scanners','lego','hable','robotic','cb','maint','lat','lng','color'];
  const out = [header];
  Object.keys(COUNTRY_META).forEach(c => {
    const t = totals[c], meta = COUNTRY_META[c];
    out.push([c, t.institutions, t.learners, t.or20, t.calcs, t.laptops, t.desktops, t.tablets, t.scanners, t.lego, t.hable, t.robotic, t.cb, t.maint, meta.lat, meta.lng, meta.color]);
  });
  sheet.getRange(1, 1, out.length, header.length).setValues(out);
}

// ============================================================
// WEB APP: JSON API consumed by dashboard/index.html
// ============================================================
function doGet(e) {
  const payload = {
    institutions: sheetToObjects_(getOrCreateSheet_(CONFIG.SHEET_NAMES.institutions)),
    employability: sheetToObjects_(getOrCreateSheet_(CONFIG.SHEET_NAMES.employability)),
    donations: sheetToObjects_(getOrCreateSheet_(CONFIG.SHEET_NAMES.donations)),
    country_summary: sheetToObjects_(getOrCreateSheet_(CONFIG.SHEET_NAMES.country_summary)),
    contacts_pin: CONFIG.CONTACTS_PIN,
    updated_at: new Date().toISOString(),
  };
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// Sheet helpers
// ============================================================
function getOrCreateSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}
function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
      return obj;
    });
}
function getExistingUuids_(sheet) {
  const values = sheet.getDataRange().getValues();
  const set = new Set();
  // column A is always _kobo_uuid by convention in this template
  for (let i = 1; i < values.length; i++) set.add(values[i][0]);
  return set;
}
function appendRows_(sheet, rows) {
  if (sheet.getLastRow() === 0) {
    // sheet is empty; caller is responsible for seeding headers via the
    // CSV import step in the deployment guide before syncAll() runs.
    return;
  }
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}
