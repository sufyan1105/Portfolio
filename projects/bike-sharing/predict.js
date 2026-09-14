/* ============================================================
   Bike Sharing Demand — static port of the notebook's model
   ------------------------------------------------------------
   The notebook trains a Random Forest on 20 features and predicts rentals for
   one hour. This runs the same model in the browser and predicts all 24 hours
   of a day at once, because the shape of that curve is the finding: demand is
   bimodal on working days and a single midday hump at the weekend, which is
   exactly what a linear model could not express.

   Preprocessing mirrors the notebook cell for cell:
     drop casual/registered/instant/dteday
     hr, mnth, weekday -> (sin, cos) pairs, raw integers kept alongside
     rush_hour     = hr in {7,8,9,16,17,18}
     comfort_index = temp * (1 - hum)

   CAREFUL: the feature vector order is the DataFrame's column order, which is
   not the order a person would list them in. META.features is authoritative.
   ============================================================ */

const BS = (function () {
  "use strict";

  let META = null, FOREST = null;

  const RUSH = [7, 8, 9, 16, 17, 18];

  async function load(base) {
    base = base || "";
    const [meta, forest] = await Promise.all([
      fetch(base + "meta.json").then((r) => r.json()),
      fetch(base + "forest.json").then((r) => r.json()),
    ]);
    META = meta; FOREST = forest;
    return meta;
  }

  /* UCI ships temp/hum/windspeed pre-normalised to [0,1]. The UI works in real
     units and converts at the edge, so nobody has to reason about 0.44. */
  const toReal = (col, v) => v * META.decode[col][0] + META.decode[col][1];
  const toModel = (col, v) => (v - META.decode[col][1]) / META.decode[col][0];

  /**
   * A working day is not a free choice — the dataset defines it as
   * "not a weekend and not a holiday", and that holds for all 17,379 rows.
   * Deriving it keeps the UI from producing a combination the model never saw.
   */
  const isWorkingDay = (weekday, holiday) =>
    (weekday !== 0 && weekday !== 6 && !holiday) ? 1 : 0;

  /** One row of the 20-feature vector, in META.features order. */
  function buildRow(inp, hr) {
    const [a, b] = META.atemp_from_temp;   // atemp is 0.988 correlated with temp
    const v = {
      season: inp.season, yr: inp.yr, mnth: inp.mnth, hr: hr,
      holiday: inp.holiday, weekday: inp.weekday,
      workingday: isWorkingDay(inp.weekday, inp.holiday),
      weathersit: inp.weathersit,
      temp: inp.temp, atemp: a * inp.temp + b, hum: inp.hum, windspeed: inp.windspeed,
      hr_sin: Math.sin(2 * Math.PI * hr / 24), hr_cos: Math.cos(2 * Math.PI * hr / 24),
      mnth_sin: Math.sin(2 * Math.PI * inp.mnth / 12),
      mnth_cos: Math.cos(2 * Math.PI * inp.mnth / 12),
      weekday_sin: Math.sin(2 * Math.PI * inp.weekday / 7),
      weekday_cos: Math.cos(2 * Math.PI * inp.weekday / 7),
      rush_hour: RUSH.indexOf(hr) >= 0 ? 1 : 0,
      comfort_index: inp.temp * (1 - inp.hum),
    };
    return META.features.map((f) => v[f]);
  }

  function runTree(tree, x) {
    let n = 0;
    while (tree.f[n] !== -2) {                 // -2 marks a leaf
      n = x[tree.f[n]] <= tree.t[n] ? tree.l[n] : tree.r[n];
    }
    return tree.v[n];
  }

  /** Forest mean for one prepared row. */
  function score(x) {
    let s = 0;
    for (const tree of FOREST.trees) s += runTree(tree, x);
    return s / FOREST.trees.length;
  }

  const predictHour = (inp, hr) => score(buildRow(inp, hr));

  /** All 24 hours — 40 trees x 24 rows, fast enough to run on every input. */
  function dayCurve(inp) {
    const out = new Array(24);
    for (let hr = 0; hr < 24; hr++) out[hr] = score(buildRow(inp, hr));
    return out;
  }

  /**
   * What the data actually recorded for this year / working-day / season,
   * averaged over every matching hour. The comparison line, not a prediction.
   */
  function actualCurve(inp) {
    const key = `${inp.yr}|${isWorkingDay(inp.weekday, inp.holiday)}|${inp.season}`;
    return META.actual[key] || null;
  }

  /** Peak hour, daily total and the split between the two commuter humps. */
  function summarise(curve) {
    let peak = 0;
    for (let h = 1; h < 24; h++) if (curve[h] > curve[peak]) peak = h;
    return {
      peakHour: peak,
      peakValue: curve[peak],
      total: curve.reduce((a, b) => a + b, 0),
      quietHour: curve.indexOf(Math.min.apply(null, curve)),
    };
  }

  return { load, buildRow, predictHour, dayCurve, actualCurve, summarise,
           isWorkingDay, toReal, toModel,
           get meta() { return META; } };
})();

if (typeof module !== "undefined" && module.exports) module.exports = BS;
