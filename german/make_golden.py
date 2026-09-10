"""Run a scripted review session against the real FastAPI storage layer."""
import json, os, shutil, sys, tempfile
sys.path.insert(0, "/Users/sufyankadiwala/developer/Claude/Portfolio/German Language")
from app import db  # noqa: E402

SRC = "/Users/sufyankadiwala/developer/Claude/Portfolio/German Language/vocab.db"
tmp = os.path.join(tempfile.mkdtemp(), "vocab.db")
shutil.copy2(SRC, tmp)
conn = db.connect(tmp)

# A fixed script: ids chosen to cover fresh cards, cards that already have
# history in vocab.db, and long Good/Easy chains that exercise the interval
# growth and the ease clamp at both ends.
SCRIPT = []
for wid in (1, 2, 3, 700, 1200, 1600):
    for rating in (2, 2, 2, 2, 2, 2, 3, 3, 3):      # climb to a long interval
        SCRIPT.append((wid, rating))
for wid in (4, 5, 900):
    for rating in (0, 1, 1, 0, 0, 1, 2, 0, 3):      # ease floor + relearning
        SCRIPT.append((wid, rating))
for wid in (6, 1000):
    for rating in (3, 3, 3, 3, 3, 3, 3, 3):         # ease ceiling
        SCRIPT.append((wid, rating))

for wid, rating in SCRIPT:
    db.review_word(conn, wid, rating)

touched = sorted({wid for wid, _ in SCRIPT})
FIELDS = ("repetitions", "ease_factor", "interval_days", "due_date",
          "reviews", "lapses", "relearning", "mastery")
out = {
    "script": SCRIPT,
    "words": {str(w): {f: db.get_word(conn, w)[f] for f in FIELDS} for w in touched},
    "stats": db.stats(conn),
}
json.dump(out, open(sys.argv[1], "w"), indent=1)
print(f"python: {len(SCRIPT)} reviews over {len(touched)} words")
