# Campus Updates

A placeholder Moodle **local plugin** for demos. It adds an **Updates** page with three sections:

1. **Tech** — current public tech/AI stories from `data/tech.json`. **Read more** expands the card.
2. **Course** — two demonstration courses (AI for Business Management, Business Mathematics). Each has a YouTube lecture, a **Related enquiry** form, and a **Workshop** signup. AI uses a step-by-step scaffold; maths has a drag-and-drop flowchart playground.
3. **Industry** — placements and internships from `data/industry.json`.

JSON files are the stand-in backend. Replace them, or later swap `classes/local/feed.php` to call a real API. Nothing is written to the Moodle database.

## Quick look (no Moodle install)

Open `preview/index.html` in a browser. It is the same three sections and placeholder cards as the plugin page.

## Show it in a local Moodle clone

This workspace is set up to hold a Moodle clone in `moodle/` and this plugin in `moodle/local/campusupdates`.

### 1. Moodle code

If `moodle/` is not already present:

```powershell
git clone --depth 1 --single-branch --branch MOODLE_405_STABLE https://github.com/moodle/moodle.git moodle
```

Then copy the plugin into Moodle (skip if it is already there):

```powershell
Copy-Item -Recurse -Force .\local\campusupdates .\moodle\local\campusupdates
```

### 2. Start the local site (already installed in this workspace)

From `D:\Work\moodle-work`:

```powershell
.\start-moodle.ps1
```

Then open:

- Site: http://127.0.0.1:8080
- Plugin: http://127.0.0.1:8080/local/campusupdates/index.php

Log in as **admin** / **CampusDemo1!**

The top navigation includes **Campus Updates**. Use the three tabs for Tech, Course, and Industry.

Admins can also find it under **Site administration → Plugins → Local plugins**.

## What you can toggle

**Site administration → Plugins → Local plugins → Campus Updates**

- Show or hide each of the three sections

## File map

| Path | Role |
| --- | --- |
| `version.php` | Plugin metadata |
| `index.php` | Page students and staff open |
| `classes/local/placeholder.php` | Demo items |
| `templates/` | Mustache markup |
| `styles.css` | Layout for the three-section page |
| `db/hooks.php` | Adds the item to primary navigation |

Compatible with Moodle **4.5–5.2**.
