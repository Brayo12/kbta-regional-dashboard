# KBTA Regional Programme — Data Dictionary & Data Model

## 1. Entity overview

Four tables (Google Sheet tabs) back the dashboard. Three are populated by KoboToolbox forms; the fourth (`Country_Summary`) is computed automatically by Apps Script from `Institutions`.

| Table | Source | Grain | Rows (seeded from existing data) |
|---|---|---|---|
| `Institutions` | Kobo form: *Institution & Device Inventory* | One row per institution, per reporting period submission | 173 |
| `Employability` | Kobo form: *Employability & Graduate Tracking* | One row per graduate | 97 |
| `Donations` | Kobo form: *Device Donations Log* | One row per donor contribution event | 44 |
| `Country_Summary` | Computed (Apps Script) | One row per country | 5 |

Every Kobo-sourced table carries `_kobo_uuid` (Kobo's submission UUID) as column A — this is the de-duplication key the sync script uses, and it functions as the primary key.

## 2. `Institutions`

| Field | Type | Source (Kobo question) | Notes |
|---|---|---|---|
| `_kobo_uuid` | text | system | Primary key |
| `submission_time` | datetime | system | When the record was submitted/updated |
| `country` | text (enum) | `country` | Kenya / Rwanda / Malawi / Tanzania / Uganda |
| `region` | text | `region` | County (Kenya) / District (others) |
| `subregion` | text | `subregion` | Sub-county; Kenya only |
| `category` | text (enum) | `category` | Integrated / Special / Resource centre / Other |
| `enrolment` | integer | `enrolment` | Learners currently enrolled at this institution |
| `device_or20` | integer | `device_or20` | OrbitReader 20 braille display units |
| `device_calculator` | integer | `device_calculator` | Talking calculators |
| `device_laptop` | integer | `device_laptop` | Laptops |
| `device_desktop` | integer | `device_desktop` | Desktop computers |
| `device_tablet` | integer | `device_tablet` | Tablets |
| `device_scanner` | integer | `device_scanner` | Scanners |
| `device_lego_braille` | integer | `device_lego_braille` | Lego Braille Bricks kits |
| `device_hable_one` | integer | `device_hable_one` | Hable One devices |
| `device_robotics_kit` | integer | `device_robotics_kit` | Robotics kits |
| `head_teacher_name` / `_phone` | text | `head_teacher_name/_phone` | |
| `ict_braille_teacher_name` / `_phone` | text | same | |
| `technician_name` / `_phone` | text | same | Only collected if `has_technician = yes` |
| *(repeat group)* `other_devices` | table | `device_type_other`, `device_qty_other`, `device_condition_other` | Captures device types not yet in the fixed list above — the scalability mechanism described in the architecture doc. Stored as a separate related table (`Institutions_OtherDevices`) keyed by `_kobo_uuid`. |

**Relationships**: `Institutions.country` is the join key to `Country_Summary.country`. `_kobo_uuid` is the join key to the `other_devices` repeat table.

## 3. `Employability`

| Field | Type | Notes |
|---|---|---|
| `_kobo_uuid` | text | Primary key |
| `submission_time` | datetime | |
| `graduate_name` | text | |
| `gender` | text (enum) | Male / Female |
| `cohort` | text (enum) | One–Ten |
| `year_of_completion` | integer | 2015–2035 range validated in the form |
| `qualification` | text | |
| `status` | text (enum) | Employed / Internship Placed / Further Study / Not Placed |
| `sector` | text (enum) | Only asked if `status` is Employed or Internship Placed |
| `employer_or_institution` | text | Only asked if `status != Not Placed` |
| `country_of_training` | text (enum) | Which country's programme trained this graduate |

## 4. `Donations`

| Field | Type | Notes |
|---|---|---|
| `_kobo_uuid` | text | Primary key |
| `submission_time` | datetime | |
| `donor_name` | text | |
| `donation_year` | integer | 2010–2035 |
| `device_or20`, `device_orion`, `device_computer`, `device_laptop`, `device_tablet`, `device_scanner` | integer | Devices contributed in this donation event |

## 5. `Country_Summary` (computed, not collected)

| Field | Formula |
|---|---|
| `institutions` | `COUNT(Institutions WHERE country = X)` |
| `learners` | `SUM(Institutions.enrolment WHERE country = X)` |
| `or20`, `calcs`, `laptops`, `desktops`, `tablets`, `scanners`, `lego`, `hable`, `robotic` | `SUM` of the matching `device_*` columns |
| `cb` (staff trained) | `SUM(Institutions.staff_trained WHERE country = X)` |
| `maint` (devices serviced) | `SUM(Institutions.devices_serviced WHERE country = X)` |
| `lat`, `lng`, `color` | Static cartography metadata (not survey data) — held in the `COUNTRY_META` constant in both `apps_script/Code.gs` and `dashboard/index.html` |

Recomputed every sync cycle by `recomputeCountrySummary_()` in `Code.gs`.

## 6. Mapping from the original hard-coded template

The template you supplied stored each country's institutions under a different, inconsistent key structure (`DATA.KE`, `DATA.RW`, `DATA.MW`, `DATA.TZ`, `DATA.UG`, each with slightly different field names — e.g. Kenya used `county`/`subcounty`, Rwanda had no region field, Malawi/Tanzania/Uganda used year-coded enrolment fields like `e24`/`e25`). This data model normalises all of that into one consistent `Institutions` schema with a `country` field, so the dashboard code, the Kobo form, and future data entry are all uniform — this is what makes "add a new country" a configuration change instead of a code change.

`/seed_data/*.csv` contains your original 173 institutions, 97 graduates, and 44 donation records already converted into this schema, ready to import as the starting content of the Google Sheet.

## 7. Filters & drill-downs supported by this model

| Dashboard control | Backed by |
|---|---|
| Country pages / country pills on Registry & Contacts | `Institutions.country` |
| Institution category badge | `Institutions.category` |
| Search across name/region/contacts | Client-side filter over all text fields in each row |
| Sortable table columns | Any field rendered in a table (numeric or text) |
| Top-10 rankings (OR20, enrolment) | `ORDER BY device_or20 / enrolment DESC LIMIT 10`, computed client-side per country |
| Cohort / gender / sector / status breakdowns (Employability) | `Employability.cohort`, `.gender`, `.sector`, `.status` |
| Donation year trends | `Donations.donation_year` |
| PIN gate on Contacts | Static `contacts_pin` value served by the API (change it in `Code.gs` CONFIG) |

## 8. Adding a new indicator later (example)

To add, say, "number of learners sitting national exams" per institution:
1. Add an `integer` question `learners_sitting_exams` to the Institution XLSForm, redeploy the form in Kobo.
2. Add a matching column to the `Institutions` Sheet tab (same header name).
3. Add one line to `mapInstitutionSubmission_()` in `Code.gs` to include the new field.
4. Add a KPI card or chart in `dashboard/index.html` referencing `r.learners_sitting_exams` — following the same pattern as the existing `kpi(...)` / chart calls.

No database migration, no redesign of the rest of the system.
