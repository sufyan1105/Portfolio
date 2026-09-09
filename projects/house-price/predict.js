/* ============================================================
   House Price Prediction — static port of the Flask backend
   ------------------------------------------------------------
   Replaces three server endpoints with local computation:

     /api/predict   ensemble mean, per-tree band, contributions, percentile
     /api/autofill  median of the 30 nearest census blocks
     /api/meta      served as a static meta.json

   The forest is shipped as flat per-node arrays rather than an m2cgen
   function, because the UI's uncertainty band needs EACH tree's vote and
   m2cgen only emits the averaged ensemble.

   Preprocessing mirrors the sklearn pipeline exactly:
     SimpleImputer(strategy="median")  ->  StandardScaler  ->  OneHotEncoder

   CAREFUL: the one-hot column order is the encoder's ALPHABETICAL order
   (`<1H OCEAN, INLAND, ISLAND, NEAR BAY, NEAR OCEAN`), which is NOT the order
   the UI lists the categories in. META.ohe_categories is the authoritative one.
   ============================================================ */

const HP = (function () {
  let META = null, FOREST = null, BLOCKS = null;

  async function load(base) {
    base = base || "";
    const [meta, forest, blocks] = await Promise.all([
      fetch(base + "meta.json").then((r) => r.json()),
      fetch(base + "forest.json").then((r) => r.json()),
      fetch(base + "blocks.json").then((r) => r.json()),
    ]);
    META = meta; FOREST = forest; BLOCKS = blocks;
    return meta;
  }

  /** SimpleImputer(median) -> StandardScaler -> OneHotEncoder */
  function prepare(row) {
    const num = META.num_attribs.map((col, i) => {
      let v = row[col];
      v = (v === null || v === undefined || !Number.isFinite(Number(v)))
        ? META.imputer_medians[i]          // imputer
        : Number(v);
      return (v - META.scaler_mean[i]) / META.scaler_scale[i];   // scaler
    });
    // handle_unknown="ignore": an unseen category yields all zeros
    const oh = META.ohe_categories.map((c) => (row.ocean_proximity === c ? 1 : 0));
    return num.concat(oh);
  }

  function runTree(tree, x) {
    let n = 0;
    while (tree.f[n] !== -2) {                 // -2 marks a leaf
      n = x[tree.f[n]] <= tree.t[n] ? tree.l[n] : tree.r[n];
    }
    return tree.v[n];
  }

  /** Every tree's vote for one prepared row. */
  function perTree(x) {
    const out = new Float64Array(FOREST.trees.length);
    for (let i = 0; i < FOREST.trees.length; i++) out[i] = runTree(FOREST.trees[i], x);
    return out;
  }

  function mean(a) { let s = 0; for (const v of a) s += v; return s / a.length; }

  /** numpy.percentile with linear interpolation, matching np.percentile. */
  function percentile(sorted, p) {
    const idx = (sorted.length - 1) * (p / 100);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  function predictOne(row) {
    return mean(perTree(prepare(row)));
  }

  /**
   * Local sensitivity: how far does the estimate move when one feature is
   * reset to its dataset median (or the modal category)? Positive means this
   * input pushes the price above a typical California block.
   * Longitude and latitude move together — neither means anything alone.
   */
  function contributions(row, base) {
    const groups = [["location", ["longitude", "latitude"]]];
    for (const c of META.num_attribs) {
      if (c !== "longitude" && c !== "latitude") groups.push([c, [c]]);
    }
    const out = groups.map(([name, cols]) => {
      const alt = Object.assign({}, row);
      for (const c of cols) alt[c] = META.stats[c].median;
      return { feature: name, delta: base - predictOne(alt) };
    });
    const altCat = Object.assign({}, row, { ocean_proximity: META.mode_ocean });
    out.push({ feature: "ocean_proximity", delta: base - predictOne(altCat) });
    out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return out;
  }

  /** Share of California blocks worth less than `value`, via the value deciles. */
  function percentileOfValue(value) {
    const d = META.value_deciles;
    if (value <= d[0]) return 0;
    if (value >= d[d.length - 1]) return 100;
    for (let i = 1; i < d.length; i++) {
      if (value < d[i]) {
        const span = d[i] - d[i - 1];
        return (i - 1) + (span > 0 ? (value - d[i - 1]) / span : 0);
      }
    }
    return 100;
  }

  /** Drop-in replacement for POST /api/predict. */
  function predict(row) {
    const x = prepare(row);
    const votes = Array.from(perTree(x));
    const sorted = votes.slice().sort((a, b) => a - b);
    const m = mean(votes);
    const variance = mean(votes.map((v) => (v - m) * (v - m)));
    return {
      price: m,
      std: Math.sqrt(variance),
      low: percentile(sorted, 10),
      high: percentile(sorted, 90),
      capped: m >= 480000,
      contributions: contributions(row, m),
      percentile: percentileOfValue(m),
    };
  }

  /** Drop-in replacement for GET /api/autofill — median of the 30 nearest blocks. */
  function autofill(lon, lat) {
    const n = BLOCKS.lon.length;
    // partial selection: keep the 30 smallest squared distances
    const K = 30;
    const bestI = [], bestD = [];
    for (let i = 0; i < n; i++) {
      const dx = BLOCKS.lon[i] - lon, dy = BLOCKS.lat[i] - lat;
      const d2 = dx * dx + dy * dy;
      if (bestD.length < K) {
        bestD.push(d2); bestI.push(i);
        if (bestD.length === K) {
          const order = bestD.map((v, j) => j).sort((a, b) => bestD[a] - bestD[b]);
          const sd = order.map((j) => bestD[j]), si = order.map((j) => bestI[j]);
          for (let j = 0; j < K; j++) { bestD[j] = sd[j]; bestI[j] = si[j]; }
        }
      } else if (d2 < bestD[K - 1]) {
        let j = K - 1;
        while (j > 0 && bestD[j - 1] > d2) { bestD[j] = bestD[j - 1]; bestI[j] = bestI[j - 1]; j--; }
        bestD[j] = d2; bestI[j] = i;
      }
    }

    const out = {};
    BLOCKS.cols.forEach((col, ci) => {
      // nanmedian: skip nulls (total_bedrooms has them)
      const vals = bestI.map((i) => BLOCKS.data[ci][i]).filter((v) => v !== null);
      let med;
      if (!vals.length) {
        med = col === "median_house_value" ? 200000 : META.stats[col].median;
      } else {
        vals.sort((a, b) => a - b);
        const h = vals.length / 2;
        med = vals.length % 2 ? vals[Math.floor(h)] : (vals[h - 1] + vals[h]) / 2;
      }
      out[col] = med;
    });

    let nearest = bestI[0], nd = bestD[0];
    for (let j = 1; j < bestI.length; j++) if (bestD[j] < nd) { nd = bestD[j]; nearest = bestI[j]; }
    out.neighbourhood_median_value = out.median_house_value;
    delete out.median_house_value;
    out.ocean_proximity = BLOCKS.ocean[nearest];
    out.distance_deg = Math.sqrt(nd);
    return out;
  }

  return { load, predict, autofill, prepare, perTree, predictOne,
           get meta() { return META; } };
})();

if (typeof module !== "undefined" && module.exports) module.exports = HP;
