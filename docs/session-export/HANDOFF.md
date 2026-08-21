# Handoff — Campus Updates + Workshop (save this before Windows reinstall)

Exported: 2026-08-21  
Grok session id: `01a000df-e180-7e20-9368-48422ea1e6f9`  
Session title: Moodle Placeholder Plugin Three Demo Sections  
Workspace: `D:\Work\moodle-work`

Use this folder if the Grok chat is gone after reinstall. The plugin source of truth is `local/campusupdates/` in this repo. The full earlier chat is in `raw/`.

---

## What this project is

A **demo / placeholder Moodle local plugin** named `local_campusupdates` for a client showcase. It is **not** a Moodle activity module or a block. It adds a site-wide **Campus Updates** item to the primary nav with three sections:

1. **Tech** — 14 real public tech/AI stories from `data/tech.json`. Read more expands the card.
2. **Course** — two demo courses:
   - **AI for Business Management** — YouTube + step placeholders + Related enquiry + Workshop *interest modal*
   - **Business Mathematics** — YouTube + Related enquiry + **the four-screen Workshop module** from the Tella Learning PDF
3. **Industry** — 6 placement/internship cards from `data/industry.json`

JSON under `local/campusupdates/data/` is the stand-in backend (`classes/local/feed.php`). Demo feeds do **not** write to the Moodle database.

---

## Critical: GitHub is behind the workshop

Private repo: https://github.com/ItsTatsuya/moodle-local_campusupdates  
Last push was **before** the workshop was built (`8b0729f Add Campus Updates Moodle plugin for client demo.`).

Uncommitted / untracked work that **must** survive reinstall (already in this workspace, also zipped as `local_campusupdates-plugin.zip`):

- `local/campusupdates/js/workshop.js` (new)
- `local/campusupdates/templates/workshop.mustache` (new)
- `local/campusupdates/data/workshop-sample.json` (new)
- edits to `index.php`, `styles.css`, `version.php`, `classes/output/index_page.php`, `classes/local/feed.php`, `data/courses.json`, course templates, lang strings
- `workshop-proposal.pdf` and `Workshop Module — Build Proposal (Developers)-1.pdf`

**Push the plugin to GitHub before wiping the disk**, or copy this whole `D:\Work\moodle-work` folder (especially `local/campusupdates` and `docs/session-export`).

`moodle/`, `tools/`, and `moodledata/` are gitignored. They will not be on GitHub.

---

## How to open the workshop (demo)

1. Start Moodle: `.\start-moodle.ps1` from `D:\Work\moodle-work`
2. Site: http://127.0.0.1:8080  
   Login: **admin** / **CampusDemo1!**
3. Top nav → **Campus Updates** → **Course** → **Business Mathematics for Management Students** → **Workshop**

Direct URL:

`http://127.0.0.1:8080/local/campusupdates/index.php?section=course&course=business-math&view=workshop`

Tap **Load sample** (bakery, March actuals). Then **Next** through the four screens.

---

## Workshop spec (the PDF)

File in the repo root:

- `Workshop Module — Build Proposal (Developers)-1.pdf` (original name)
- `workshop-proposal.pdf` (copy used while building)

Four learner screens. **No calculus words in the UI.** Speak of profit as a landscape, slope as a rupees sentence, and the best combination as the top of the hill.

| Screen | Title | Job |
| --- | --- | --- |
| A | Enter the business | Table of shop numbers → 3D hill, pin at today’s sales |
| B | Hold one still | Freeze one product, slice the hill, slope in rupees (highest priority) |
| C | Walk uphill | Top-down map, two sliders, lime uphill arrow, Solve |
| D | Take the answer | One-page report + print/export |

Bakery numbers the UI **must** reproduce (exact):

| Check | Value |
| --- | --- |
| A, B, C, D coefficients | A=17.5 B=0.05 C=11.5 D=0.02 E=0.01 F=1000 |
| profit(200, 150) | ₹1,475 |
| slopeX(200, 150) | each extra puff **loses you ₹4.00** (amber, never red) |
| slopeY(200, 150) | each extra tea **makes you ₹3.50 more** (green) |
| den | 0.0039 |
| best combination | 150 puffs · 250 teas |
| profit(150, 250) | ₹1,750 |
| Solve pair | ₹1,475 → ₹1,750 |
| monthlyGain | ₹8,250 |
| cost of being off | 10 units ≈ ₹5/day · 50 off ≈ ₹125/day |

Math (six expressions only, no solver library):

```
A = price1 - cost1
B = priceDrop1
C = price2 - cost2
D = priceDrop2
E = congestion
F = fixedCost

profit(x,y) = A*x - B*x*x + C*y - D*y*y - E*x*y - F
slopeX(x,y) = A - 2*B*x - E*y
slopeY(x,y) = C - 2*D*y - E*x
den = 4*B*D - E*E
bestX = (2*D*A - E*C) / den
bestY = (2*B*C - E*A) / den
monthlyGain = (bestProfit - currentProfit) * 30   # round to nearest 50
costOfBeingOff(n) = B * n * n
```

If `den <= 0`, block Plot: *These numbers don't describe a business with a best combination — try a smaller congestion value.*

---

## Local stack (this machine, pre-reinstall)

| Piece | Where |
| --- | --- |
| Moodle 4.5.13 LTS | `D:\Work\moodle-work\moodle` (gitignored clone of `MOODLE_405_STABLE`) |
| Plugin (source of truth) | `D:\Work\moodle-work\local\campusupdates` |
| Plugin as Moodle sees it | **copied** into `moodle/local/campusupdates` (do **not** junction; a junction broke `config.php`) |
| Moodle dataroot | `D:\Work\moodledata` |
| PHP | `D:\Work\moodle-work\tools\php83\php.exe` (portable 8.3.33) |
| DB | MariaDB 12.3, `mariadb` dbtype, database `moodle`, user `moodle` / `moodle` |
| Moodle config | `moodle/config.php` — wwwroot `http://127.0.0.1:8080` |
| PHP `max_input_vars` | must be ≥ 5000 for Moodle |

After reinstall, if you keep `D:\Work`:

1. Reinstall MariaDB 12.3 **or** restore a dump.
2. Recreate DB `moodle` and user `moodle`.
3. Keep or re-copy `tools/php83`.
4. `Copy-Item -Recurse -Force .\local\campusupdates .\moodle\local\campusupdates`
5. `.\start-moodle.ps1`
6. If Moodle asks to upgrade the plugin, that’s the version bump (`2026081902` in `version.php`; JS cache-bust `rev=2026081904`).

A dump from this machine is already saved as `moodle-db.sql` in this folder (MariaDB, database `moodle`). Restore with:

```powershell
& "C:\Program Files\MariaDB 12.3\bin\mariadb.exe" -u moodle -pmoodle moodle < D:\Work\moodle-work\docs\session-export\moodle-db.sql
```

---

## File map (plugin)

| Path | Role |
| --- | --- |
| `version.php` | Frankenstyle `local_campusupdates`, requires Moodle 4.5 |
| `index.php` | Landing page; loads `ui.js`; loads `workshop.js` only on business-math workshop |
| `classes/local/feed.php` | JSON loader; `workshop_sample()` |
| `classes/local/hooks.php` | Primary nav hook |
| `classes/output/index_page.php` | Tabs, feeds, course pages, workshop template data + sample JSON |
| `data/tech.json` | Tech stories |
| `data/industry.json` | Placement cards |
| `data/courses.json` | Two courses |
| `data/workshop-sample.json` | Bakery March actuals |
| `js/workshop.js` | All workshop math + canvas |
| `js/ui.js` | Enquiry / AI workshop modal |
| `js/playground.js` | Old flowchart; **not** loaded on workshop view |
| `templates/workshop.mustache` | Four screens |
| `styles.css` | Cards + `.cu-ws` workshop layout |

Install on **another Moodle 4.5+ instance**: copy `local/campusupdates` into that site’s `local/campusupdates`, visit Site administration so Moodle upgrades the plugin, then open `/local/campusupdates/index.php`. Capability: `local/campusupdates:view`.

---

## Chat history in this folder

| File | What it is |
| --- | --- |
| `HANDOFF.md` | This file |
| `CHAT-RECENT.md` | User questions + assistant replies after compaction |
| `raw/chat_history.jsonl` | Full machine transcript of the live session (8 MB) |
| `raw/compaction/segment_000.md` | Earlier 544 turns (plugin build, flowchart, GitHub push, first workshop pass) |
| `raw/summary.json` | Session metadata |
| `local_campusupdates-plugin.zip` | Snapshot of `local/campusupdates` at export time |

### User requests, in order

1. Placeholder Moodle plugin, three sections: tech, course, industry. Placeholder data. Clone Moodle.
2. Navbar selects Home instead of staying on Campus Updates when changing sections.
3. How the plugin works; how to install on another Moodle.
4. Real tech news in JSON (10–15), Read more expands; two courses (AI + Business Math) with YouTube, Related enquiry, Workshop; demo until curated data.
5. Run and verify UI, especially the flowchart.
6. Push to a **private** GitHub repo (possible showcase the next day).
7. Read `Workshop Module — Build Proposal (Developers)-1.pdf` and implement it (this replaced the flowchart as the Business Math workshop).
8. Check the workshop against the PDF sketches; make it easy to understand, not ambiguous.
9. Export this chat into the project before Windows reinstall.

---

## UX notes after the sketch pass (2026-08-21)

Fixes that landed so the four screens match the PDF wireframes and read in plain language:

- Screen hints + **Next** buttons (A→B→C→D)
- Pins labelled **you** / **top** on the hill and the map
- Lime **uphill arrow** (white halo) from you toward top — teal-on-teal was invisible
- Screen B: “Teas — held still” / “Puffs — can move”; slope as *Slope here — each extra puff loses you ₹4.00.*
- Profit chip top-right on every screen
- Workshop hides Tech/Course/Industry tabs (`is-workshop` class; Moodle CSS strips `:has()`)
- Export PDF = `window.print()` of Screen D (not a generated PDF file)

AI course Workshop is still the **interest modal**, not the four-screen module.

---

## Known gotchas

- Do not junction `moodle/local/campusupdates` at `__DIR__` — copy the folder.
- After CSS/JS edits: copy plugin into `moodle/local/campusupdates` **and** `php admin/cli/purge_caches.php`.
- Browser autofill used to trash bakery numbers; form has `autocomplete="off"`.
- PHP built-in server dies often; restart with `.\start-moodle.ps1`.
- Moodle primary nav needed `$PAGE->set_primary_active_tab('local_campusupdates')`.
- Learner UI must never say derivative, gradient, stationary point, multivariable, etc.

---

## After reinstall — restore checklist

1. Copy `D:\Work\moodle-work` back (or clone GitHub **after** pushing workshop).
2. Restore `D:\Work\moodledata` if you saved it.
3. Install MariaDB + restore dump **or** run Moodle web installer against a new DB and then drop the plugin in.
4. Portable PHP 8.3 in `tools/php83` (or any PHP 8.1–8.3 with `max_input_vars=5000`).
5. `Copy-Item -Recurse -Force .\local\campusupdates .\moodle\local\campusupdates`
6. `.\start-moodle.ps1`
7. Confirm workshop bakery numbers (table above).
8. Optional: `git add` workshop files and push to the private repo.

To continue with Grok in a new session, attach this `HANDOFF.md` plus the PDF and say: *continue the Campus Updates workshop from the handoff.*
