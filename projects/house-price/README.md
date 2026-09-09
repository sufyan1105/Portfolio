# California House Price Estimator — static port of the Flask app

The original project shipped a Flask server (`app.py` + `templates/index.html`).
This is the same UI with the backend removed — map, uncertainty band,
contribution bars and neighbourhood auto-fill all run client-side.

| File | What it is |
|---|---|
| `forest.json` | 50 trees as flat per-node arrays (`f`/`t`/`l`/`r`/`v`) |
| `meta.json` | Pipeline params, stats, map scatter, value deciles |
| `blocks.json` | All 20,640 census blocks, for the nearest-30 auto-fill |
| `predict.js` | Preprocessing + traversal + band + contributions + auto-fill |
| `index.html` | The Flask template, ported |
| `export.py` | Retrains and regenerates the JSON |
| `port_ui.py` | Regenerates `index.html` from the Flask template |

## Why not m2cgen

The other two demos use `m2cgen.export_to_javascript`. It can't be used here:
it emits the **averaged** ensemble as a single function, but this UI's
uncertainty band is built from **each tree's individual vote**. Shipping the
trees as arrays gives per-tree predictions and is smaller than the generated
code would be.

## What replaced the three endpoints

| Endpoint | Replacement |
|---|---|
| `GET /api/meta` | static `meta.json` |
| `POST /api/predict` | `HP.predict()` — mean, per-tree 10th/90th band, contributions, percentile |
| `GET /api/autofill` | `HP.autofill()` — median of the 30 nearest blocks |

## Model size

The Flask app trains an unpruned `RandomForestRegressor()` — 2,003,712 nodes,
a 137 MB pickle. The shipped forest is `n_estimators=50, min_samples_leaf=10`:

| | Flask app | Shipped |
|---|---|---|
| Test RMSE | $47,198 | **$49,029** |
| Nodes | 2,003,712 | 81,202 |
| Size | 137 MB (pickle) | 3.1 MB (1.2 MB gzipped) |

$49,029 is effectively the $49,432 cross-validated RMSE the project README
already quotes.

## Two behavioural notes

**Thresholds are exported at full float precision.** Rounding them to 6 decimals
mis-branched any row sitting exactly on a split boundary — dataset medians do
this constantly. The parity test caught it; 11/11 cases now match exactly
(price, band low/high, and std).

**Auto-fill breaks ties differently.** `app.py` uses `np.argpartition`, which
picks an arbitrary set when many blocks sit at identical distances. The JS takes
the 30 nearest breaking ties by lowest index — deterministic, and verified exact
against Python using that same rule. In dense areas the two rules can disagree:
at (-122.42, 37.77) the neighbourhood median differs by $43,750.

## Dark only

The original design is dark-only — gradients plus 20 `rgba(255,255,255,…)`
overlays. Rather than ship a broken light mode, this page pins
`data-theme="dark"` and omits the theme toggle. Every other page still follows
the user's preference.

## Regenerating

```bash
python3 export.py    # model + data
python3 port_ui.py   # index.html from the Flask template
```
