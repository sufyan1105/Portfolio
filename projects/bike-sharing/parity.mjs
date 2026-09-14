/* Diff the JS port against the Python model on export.py's golden cases.

   The cases are not just sampled rows: they include hour 0 and 23 (where the
   cyclical encoding wraps), all four weathersit values including the one with
   three rows in the entire dataset, and the exact min/max of every continuous
   feature. Sampled rows alone would miss a threshold-rounding bug, because the
   rows that sit exactly on a split boundary are the integer ones. */
import { readFileSync } from "node:fs";

const DIR = new URL(".", import.meta.url).pathname;
const meta = JSON.parse(readFileSync(DIR + "meta.json", "utf8"));
const forest = JSON.parse(readFileSync(DIR + "forest.json", "utf8"));
const golden = JSON.parse(readFileSync(DIR + "golden.json", "utf8"));

globalThis.fetch = async (u) => ({
  json: async () => (u.endsWith("meta.json") ? meta : forest),
});
const BS = eval(readFileSync(DIR + "predict.js", "utf8") + "; BS");
await BS.load("");

// The golden inputs are full 20-feature rows, so score them directly rather
// than through buildRow — this isolates the tree walk from the encoding.
const raw = readFileSync(DIR + "predict.js", "utf8");
const runTree = eval("(" + raw.match(/function runTree[\s\S]*?\n  }/)[0].replace("function runTree", "function") + ")");
const scoreRow = (x) => forest.trees.reduce((s, t) => s + runTree(t, x), 0) / forest.trees.length;

let worst = 0, bad = 0;
for (const c of golden) {
  const x = meta.features.map((f) => c.input[f]);
  const got = scoreRow(x);
  const diff = Math.abs(got - c.expected);
  worst = Math.max(worst, diff);
  if (diff > 1e-9) {
    bad++;
    console.log(`  MISMATCH hr=${c.input.hr} ws=${c.input.weathersit}: js=${got.toFixed(6)} py=${c.expected.toFixed(6)}`);
  }
}
console.log(`tree walk:   ${golden.length - bad}/${golden.length} exact   (worst |diff| ${worst.toExponential(2)})`);

// buildRow has to reproduce the notebook's feature engineering. Check it
// against the golden inputs, which were built by pandas.
let ebad = 0, echecked = 0;
for (const c of golden) {
  const inp = {
    season: c.input.season, yr: c.input.yr, mnth: c.input.mnth,
    holiday: c.input.holiday, weekday: c.input.weekday,
    weathersit: c.input.weathersit, temp: c.input.temp,
    hum: c.input.hum, windspeed: c.input.windspeed,
  };
  const built = BS.buildRow(inp, c.input.hr);
  meta.features.forEach((f, i) => {
    if (f === "atemp") return;          // derived from temp on purpose, see predict.js
    echecked++;
    if (Math.abs(built[i] - c.input[f]) > 1e-9) {
      ebad++;
      console.log(`  ENCODING ${f}: js=${built[i]} py=${c.input[f]}`);
    }
  });
}
console.log(`encoding:    ${echecked - ebad}/${echecked} feature values match (atemp excluded — derived)`);

// workingday is derived, not asked for. It must agree with the dataset.
const wdBad = golden.filter((c) =>
  BS.isWorkingDay(c.input.weekday, c.input.holiday) !== c.input.workingday).length;
console.log(`workingday:  ${golden.length - wdBad}/${golden.length} agree with the dataset`);

// A sanity check on the thing the demo actually draws.
const day = BS.dayCurve({ season: 3, yr: 1, mnth: 7, holiday: 0, weekday: 3,
                          weathersit: 1, temp: 0.7, hum: 0.5, windspeed: 0.2 });
const s = BS.summarise(day);
console.log(`day curve:   peak ${s.peakValue.toFixed(0)} rides at ${s.peakHour}:00, ` +
            `quietest ${s.quietHour}:00, ${s.total.toFixed(0)} rides total`);

process.exit(bad + ebad + wdBad === 0 ? 0 : 1);
