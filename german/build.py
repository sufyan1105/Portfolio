"""Rebuild the static German trainer from the local FastAPI project.

Source: ../German Language/ (gitignored — it carries a .venv and your vocab.db)
Output: this folder, which Cloudflare Pages serves at /german/

Three things happen here:
  1. vocab.json — the 1,614 seed words out of vocab.db, plus whatever review
     history that database already holds, so a first visit is not a restart.
  2. app.js / index.html — copied from static/ with the server seam swapped for
     the local store and the Tailwind CDN replaced by the built stylesheet.
  3. content hashes stamped onto the script/style URLs, so an update can never
     be served from a stale cache.

Tailwind is built separately, from the OUTPUT of this script, because the
backup panel below only exists after the build. Changing the markup therefore
means: build.py -> tailwind -> build.py, so the new stylesheet gets its hash.

    npx tailwindcss@3.4.17 -i in.css -o german/tailwind.css --minify \
        --content "german/index.html,german/app.js"
"""
import hashlib
import json
import os
import re
import shutil
import sqlite3

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), "German Language")
STATIC = os.path.join(SRC, "static")

FIELDS = ("id", "word", "meaning", "part_of_speech", "gender", "plural",
          "example", "example_en", "level")

# ------------------------------------------------------------------ vocab
conn = sqlite3.connect(os.path.join(SRC, "vocab.db"))
conn.row_factory = sqlite3.Row
rows = conn.execute("SELECT * FROM words ORDER BY id").fetchall()

words = [{f: r[f] for f in FIELDS} for r in rows]

# Only words actually studied carry a record; the rest fall back to the
# defaults in store.js. Same compact array order store.js reads.
progress = {
    str(r["id"]): [r["repetitions"], r["ease_factor"], r["interval_days"],
                   r["due_date"], r["reviews"], r["lapses"], r["relearning"]]
    for r in rows if r["reviews"] or r["relearning"]
}
conn.close()

with open(os.path.join(HERE, "vocab.json"), "w", encoding="utf-8") as fh:
    json.dump({"words": words, "progress": progress}, fh,
              ensure_ascii=False, separators=(",", ":"))
print(f"vocab.json: {len(words)} words, {len(progress)} with history, "
      f"{os.path.getsize(os.path.join(HERE, 'vocab.json')) / 1024:.0f} KB")

# ------------------------------------------------------------------ assets
for name in ("styles.css", "icon-192.png", "icon-512.png", "apple-touch-icon.png"):
    shutil.copy2(os.path.join(STATIC, name), os.path.join(HERE, name))

with open(os.path.join(HERE, "manifest.json"), "w") as fh:
    json.dump({
        "name": "Deutsch Vokabeln", "short_name": "Vokabeln",
        "description": "German vocabulary trainer with spaced repetition",
        "start_url": "/german/", "scope": "/german/",
        "display": "standalone", "orientation": "portrait",
        "background_color": "#0f172a", "theme_color": "#0f172a",
        "icons": [
            {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        ],
    }, fh, indent=2)

# ------------------------------------------------------------------ app.js
app = open(os.path.join(STATIC, "app.js"), encoding="utf-8").read()

OLD_API = """  async function api(path, options = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (res.status === 204) return null;
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.detail || `Request failed (${res.status})`);
    return body;
  }"""
NEW_API = """  // The only line that differs from the FastAPI version of this file: the
  // same paths, answered by store.js instead of by a server over the network.
  async function api(path, options = {}) {
    return DV.request(path, options);
  }"""
assert OLD_API in app, "api() seam not found — did static/app.js change?"
app = app.replace(OLD_API, NEW_API)

# Nothing can run until vocab.json is in memory, so the boot block waits on it.
OLD_BOOT = """  bindAddForm();
  bindEvents();
  renderLevelBar();
  loadLevelBar();
  goto('revise');
})();"""
NEW_BOOT = """  // was: these ran straight away, because the server already had the words.
  // Now the word list is a file, so booting waits for it.
  DV.init('vocab.json?v=__V_VOCAB__').then(() => {
    bindAddForm();
    bindEvents();
    renderLevelBar();
    loadLevelBar();
    goto('revise');
  }).catch((err) => {
    document.body.insertAdjacentHTML('afterbegin',
      `<p class="p-4 text-center text-sm text-rose-400">Could not load the vocabulary: ${err.message}</p>`);
  });
})();"""
assert OLD_BOOT in app, "boot block not found"
app = app.replace(OLD_BOOT, NEW_BOOT)

app += """

/* ---- progress backup, added for the static build ----------------------
   localStorage is per-browser and a browser can clear it. These two buttons
   are the way progress moves between the phone and the Mac, and the way it
   survives a wipe. */
(() => {
  const save = document.getElementById('btnExport');
  const load = document.getElementById('btnImport');
  const file = document.getElementById('importFile');
  if (!save || !load || !file) return;

  save.addEventListener('click', () => {
    const blob = new Blob([DV.exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vokabeln-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  load.addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const chosen = file.files[0];
    if (!chosen) return;
    const msg = document.getElementById('backupMsg');
    try {
      const n = DV.importProgress(await chosen.text());
      msg.className = 'mt-2 text-center text-xs text-emerald-400';
      msg.textContent = `Restored ${n} studied words. Reloading\\u2026`;
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      msg.className = 'mt-2 text-center text-xs text-rose-400';
      msg.textContent = err.message;
    }
    file.value = '';
  });
})();
"""

# ------------------------------------------------------------------ index
html = open(os.path.join(STATIC, "index.html"), encoding="utf-8").read()

# Served from /german/, not /, so every absolute asset path has to come loose.
html = html.replace('href="/static/', 'href="').replace('src="/static/', 'src="')

# The Play CDN compiles Tailwind in the browser on every load and is a request
# to a third party from a German domain. tailwind.css is the same utilities,
# built once, 15 KB.
html = html.replace('<script src="https://cdn.tailwindcss.com"></script>',
                    '<link rel="stylesheet" href="tailwind.css?v=__V_TW__">')

html = html.replace("<title>Deutsch Vokabeln</title>",
                    '<meta name="robots" content="noindex, nofollow">\n'
                    "<title>Deutsch Vokabeln</title>")

BACKUP_UI = """
      <h3 class="mb-3 mt-6 text-sm font-semibold text-slate-300">Backup</h3>
      <div class="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <p class="text-xs leading-relaxed text-slate-400">
          Your review history lives in this browser only. Export it to move to another
          device, or to keep a copy in case the browser clears its data.
        </p>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button id="btnExport" class="rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-semibold active:scale-95">Export</button>
          <button id="btnImport" class="rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-semibold active:scale-95">Import</button>
        </div>
        <input id="importFile" type="file" accept="application/json,.json" class="hidden">
        <p id="backupMsg" class="mt-2 text-center text-xs"></p>
      </div>
"""
ANCHOR = """      <h3 class="mb-3 mt-6 text-sm font-semibold text-slate-300">Nouns by gender</h3>
      <div id="genderBars" class="flex gap-2"></div>"""
assert ANCHOR in html, "stats view anchor not found"
html = html.replace(ANCHOR, ANCHOR + "\n" + BACKUP_UI)

html = html.replace('href="styles.css"', 'href="styles.css?v=__V_STYLES__"')

html = html.replace('<script src="app.js"></script>',
                    '<script src="store.js?v=__V_STORE__"></script>\n'
                    '<script src="app.js?v=__V_APP__"></script>')

# ------------------------------------------------------------------ write
open(os.path.join(HERE, "app.js"), "w", encoding="utf-8").write(app)


def digest(name):
    with open(os.path.join(HERE, name), "rb") as fh:
        return hashlib.sha1(fh.read()).hexdigest()[:8]


versions = {"__V_VOCAB__": digest("vocab.json"), "__V_STORE__": digest("store.js"),
            "__V_TW__": digest("tailwind.css"), "__V_STYLES__": digest("styles.css")}
app = app.replace("__V_VOCAB__", versions["__V_VOCAB__"])
open(os.path.join(HERE, "app.js"), "w", encoding="utf-8").write(app)
versions["__V_APP__"] = digest("app.js")

for token, value in versions.items():
    html = html.replace(token, value)
assert "__V_" not in html and "__V_" not in app, "an unstamped placeholder is left"
open(os.path.join(HERE, "index.html"), "w", encoding="utf-8").write(html)

print("index.html, app.js, store.js, manifest.json, styles.css, icons written")
for name in sorted(os.listdir(HERE)):
    if not name.startswith("."):
        print(f"  {name:<20} {os.path.getsize(os.path.join(HERE, name)) / 1024:>7.1f} KB")
