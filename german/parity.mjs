/* Replay the same review script through store.js and diff the outcome. */
import { readFileSync } from "node:fs";

const G = "/Users/sufyankadiwala/developer/Claude/Portfolio/german";
const golden = JSON.parse(readFileSync(process.argv[2], "utf8"));
const seed = JSON.parse(readFileSync(`${G}/vocab.json`, "utf8"));

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
};
globalThis.fetch = async () => ({ json: async () => seed });

const DV = eval(readFileSync(`${G}/store.js`, "utf8") + "; DV");
await DV.init("vocab.json");

for (const [id, rating] of golden.script) DV.request(`/api/review/${id}`, {
  method: "POST", body: JSON.stringify({ rating }),
});

const FIELDS = ["repetitions", "ease_factor", "interval_days", "due_date",
                "reviews", "lapses", "relearning", "mastery"];
let bad = 0;
for (const [id, want] of Object.entries(golden.words)) {
  const got = DV.request(`/api/words/${id}`);
  for (const f of FIELDS) {
    if (JSON.stringify(got[f]) !== JSON.stringify(want[f])) {
      console.log(`  MISMATCH word ${id}.${f}: js=${got[f]}  py=${want[f]}`);
      bad++;
    }
  }
}
console.log(`per-word state: ${Object.keys(golden.words).length * FIELDS.length - bad}/` +
            `${Object.keys(golden.words).length * FIELDS.length} fields match`);

const stats = DV.request("/api/stats");
let sbad = 0, stotal = 0;
const walk = (a, b, path) => {
  for (const k of Object.keys(b)) {
    if (b[k] && typeof b[k] === "object") { walk(a[k], b[k], `${path}.${k}`); continue; }
    stotal++;
    if (a[k] !== b[k]) { console.log(`  MISMATCH stats${path}.${k}: js=${a[k]} py=${b[k]}`); sbad++; }
  }
};
walk(stats, golden.stats, "");
console.log(`stats: ${stotal - sbad}/${stotal} fields match`);

// The due queue is randomised on purpose, so compare the SET of due ids.
const pyDue = golden.stats.due_today;
const jsDue = DV.request("/api/review/due?limit=5000").length;
console.log(`due queue: js returned ${jsDue}, python counts ${pyDue} due` +
            (jsDue === pyDue ? " — match" : " — MISMATCH"));

// Level filtering and the words list, which have their own SQL in db.py.
const a1 = DV.request("/api/words?level=A1&limit=5000").length;
const lv = DV.request("/api/levels");
console.log(`levels: ${lv.map((l) => `${l.level}=${l.total}`).join(" ")}  (A1 list: ${a1})`);
const sorted = DV.request("/api/words?limit=5000");
const ordered = sorted.every((w, i) => i === 0 ||
  sorted[i - 1].word.localeCompare(w.word, "de", { sensitivity: "base" }) <= 0);
console.log(`word list sorted: ${ordered}`);

process.exit(bad + sbad + (jsDue === pyDue ? 0 : 1) === 0 ? 0 : 1);
