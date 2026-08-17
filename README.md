# Moodle demo workspace

This folder has three parts:

- `local/campusupdates` — a placeholder Moodle **local plugin** with three demo feeds: **Tech**, **Course**, and **Industry**
- `moodle/` — Moodle 4.5.13 (LTS), with the plugin linked at `moodle/local/campusupdates`
- `preview/index.html` — open this in a browser to see the same three sections without installing PHP yet

This workspace already has Moodle 4.5 installed. Start it with:

```powershell
.\start-moodle.ps1
```

Then log in at http://127.0.0.1:8080 as **admin** / **CampusDemo1!** and open **Campus Updates** in the top nav.

See [local/campusupdates/README.md](local/campusupdates/README.md) for plugin details.
