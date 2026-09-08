# Used Car Price Estimator — in-browser demo

The notebook's Random Forest, exported to JavaScript with `m2cgen` and run
client-side. No backend.

| File | What it is |
|---|---|
| `model.js` | `m2cgen` export of the trained forest — `scoreUsedCar(vector)` returns a value in **log space** |
| `predict.js` | Preprocessing port: `log1p`, one-hot encoding matching `drop_first=True`, and `expm1` on the output |
| `app.js` | Form wiring and formatting |
| `train_export.py` | Retrains and regenerates `model.js` |

## Why the model differs from the notebook

The notebook trains `RandomForestRegressor(n_estimators=100, max_depth=None)`.
That forest is ~1.43 million nodes and `m2cgen` exports it to a **237 MB**
JavaScript file — unusable on a web page.

The shipped model is `n_estimators=40, min_samples_leaf=10`:

| | Notebook | Shipped |
|---|---|---|
| R² (INR) | 0.9333 | 0.9091 |
| MAE (INR) | 101,298 | 112,722 |
| Export size | 237 MB | 5.9 MB (512 KB gzipped) |

Preprocessing is byte-for-byte the same; only the forest's size changed.

## Encoding gotcha

`pd.get_dummies(..., drop_first=True)` sorts each category list and drops the
first entry, which becomes the implicit all-zeros baseline:

    brand -> Audi,  fuel_type -> CNG,
    seller_type -> Dealer,  transmission_type -> Automatic

Selecting any of those produces zeros across that column group. `FEATURE_ORDER`
in `predict.js` must match the training column order exactly — the model indexes
a flat array, so a misplaced entry yields plausible but wrong prices.

Verified against the Python model on 12 cases (5 sampled rows + 7 edge cases
covering every baseline): **exact match to 0.00000000%**.

## Regenerating

```bash
python3 train_export.py     # needs scikit-learn, pandas, m2cgen
```
