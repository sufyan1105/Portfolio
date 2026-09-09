# Medical Insurance Cost Estimator — in-browser demo

The notebook's Random Forest exported to JavaScript with `m2cgen`, running
client-side. No backend.

| File | What it is |
|---|---|
| `model.js` | `m2cgen` export — `scoreInsurance(vector)` returns **dollars directly** |
| `predict.js` | Preprocessing port: sex/smoker mapping, `drop_first` one-hot, engineered features |
| `app.js` | Form wiring, formatting, language handling |
| `train_export.py` | Retrains and regenerates `model.js` |

## Two differences from the used-car demo

**No inverse transform.** This notebook trained on **raw `charges`**, not
`log1p(charges)`. The model output is already in dollars — applying `expm1()`
here would be badly wrong.

**Random Forest, not Gradient Boosting.** The notebook's best model is
`GradientBoostingRegressor`, but m2cgen 0.10 cannot export it
(`NotImplementedError`). The forest is a fraction behind and is the model the
README's "84 %" figure refers to:

| | Gradient Boosting | Random Forest (shipped) |
|---|---|---|
| Test R² | 0.8816 | 0.8757 |
| CV R² | 0.8574 | 0.8538 |
| MAE | $2,417 | $2,519 |
| `bmi_smoker` importance | 0.754 | **0.840** |

Export is 722 KB (79 KB gzipped), so no size compromise was needed.

## Encoding

```
sex     male -> 1, female -> 0
smoker  yes  -> 1, no     -> 0
region  get_dummies(drop_first=True) -> northeast is the all-zeros baseline
bmi_smoker  = bmi * smoker
age_smoker  = age * smoker
age_squared = age ** 2
```

`FEATURE_ORDER` in `predict.js` must match the training column order exactly.
Verified against the Python model on 10 cases (5 sampled rows + 5 edge cases
covering the baseline region and the smoker toggle): **exact match**.

## Regenerating

```bash
python3 train_export.py     # needs scikit-learn, pandas, m2cgen
```
