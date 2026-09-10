# Deutsch Vokabeln — static build

The FastAPI vocabulary trainer (`../German Language/`) rebuilt as static files,
served at **https://sufyankadiwala.de/german/**. Not linked from anywhere on the
site and marked `noindex` — but the URL is the only lock, so treat it as
unlisted, not private.

## What replaced the server

| Was | Now |
|---|---|
| `GET /api/words`, `POST`, `DELETE` | `store.js` over the list in `vocab.json` |
| `GET /api/review/due` · `POST /api/review/{id}` | `store.js` — the SM-2 maths from `app/srs.py`, ported |
| `GET /api/quiz/gender` · `/api/stats` · `/api/levels` | `store.js` |
| `vocab.db` (SQLite) | `localStorage["dv.v1"]` |

`app.js` is `static/app.js` with two changes: `api()` calls `DV.request()`
instead of `fetch()`, and boot waits for `vocab.json`. Everything else — the
views, the swipe gestures, the gender trainer — is the original file.

## Progress

Review history is per-browser. The phone and the Mac keep separate histories;
**Stats → Export / Import** moves one to the other and is the backup if a
browser clears its site data. The 15 reviews already in `vocab.db` are baked
into `vocab.json` and load on a first visit, so this does not start from zero.

## Rebuild

```bash
python3 german/build.py          # needs ../German Language/ (gitignored)
```

Tailwind is built from build.py's *output*, so changing the markup means running
it, then Tailwind, then it again to pick up the new stylesheet's hash:

```bash
npx tailwindcss@3.4.17 -i in.css -o german/tailwind.css --minify \
    --content "german/index.html,german/app.js" && python3 german/build.py
```

## Check it still matches the server

`make_golden.py` runs a 97-review script through the real `app/db.py`;
`parity.mjs` replays the same script through `store.js` and diffs every field.

```bash
cd "../German Language" && .venv/bin/python ../Portfolio/german/make_golden.py /tmp/golden.json
node german/parity.mjs /tmp/golden.json
```

Expect `88/88` per-word fields and `25/25` stats fields. This is what caught
the rounding bug: Python's `round()` sends an exact `.5` to the nearest even
number and `Math.round()` sends it up, so a card at interval 125 with the
default ease of 2.5 hits exactly 312.5 and the two diverge — 15,006 days
against 15,049 by the end of the chain. `pyRound()` in `store.js` fixes it.
