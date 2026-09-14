# Bike Sharing Demand — static build

The notebook's Random Forest, running in the browser at
**https://sufyankadiwala.de/projects/bike-sharing/**. No server, no API.

Unlike the other three demos this one predicts **24 rows per change**, not one:
the shape of the daily curve is the finding. 40 trees x 24 hours is about a
thousand tree walks, fast enough to redraw on every slider move.

## What ships, and what it costs

| | Notebook | Shipped |
|---|---|---|
| Trees | 100, unlimited depth | 40, `min_samples_leaf=10` |
| Nodes | 1,655,298 | 54,248 |
| Export | 50 MB | 1.9 MB (0.6 MB gzip) |
| RMSE | 72.26 | 78.09 |
| R² | 0.893 | 0.875 |

1.8 R² points for 26x less weight. Both numbers sit above the README's
`TimeSeriesSplit` CV figure of 0.773 ± 0.138, which is the more defensible one.

m2cgen is not used: it emits one if/else function per model, and flat per-node
arrays are smaller and run 24 rows as easily as one.

## Two things the UI says out loud

**`workingday` is derived, not asked for.** The dataset defines it as "not a
weekend and not a holiday", and that holds for all 17,379 rows — so picking
Wednesday + holiday correctly produces the weekend curve.

**Light rain and heavy rain give identical answers.** Every one of the 931
`weathersit` splits across the 40 trees sits at 1.5 or 2.5; none at 3.5,
because `weathersit=4` has 3 rows in the whole dataset and `min_samples_leaf`
is 10. `meta.json` carries the thresholds and the page reads them, so the
warning stays true if the model is retrained rather than being hardcoded.

`atemp` is a model input but is 0.988 correlated with `temp` by construction,
so one slider drives both through a fit (`atemp ≈ 0.8815·temp + 0.0377`,
residual sd 0.027) instead of asking for two temperatures.

## Rebuild and check

```bash
python3 projects/bike-sharing/export.py     # needs ../Bike Sharing Demand Prediction/
node projects/bike-sharing/parity.mjs
```

Expect `22/22` exact on the tree walk and `418/418` on the feature encoding.
The golden cases are not just sampled rows: they include hour 0 and 23 where
the cyclical encoding wraps, all four `weathersit` values, and the exact
min/max of every continuous feature.

That mattered. The first run failed 20/22 — `row_dict()` in `export.py` cast
every non-weather column with `int()`, which floored the six sin/cos features
to 0, so the golden file described a row the model had never been given. The
predictions it was compared against were computed from the real row. Sampling
alone would have shown the same failure with no clue where it came from.
