"""Export the notebook's Random Forest for a fully static, in-browser demo.

The notebook's headline model is RandomForestRegressor(n_estimators=100,
random_state=42) with no depth limit: R2 0.893, but 1.66 million nodes and a
50 MB JSON export. This ships 40 trees at min_samples_leaf=10 instead --
R2 0.875, 1.9 MB -- and prints the full trade-off table so the cost is on the
record rather than buried.

m2cgen is not used here. The demo predicts all 24 hours of a day at once to
draw the demand curve, and m2cgen emits one giant if/else function per model;
flat per-node arrays are far smaller and run 24 rows as easily as one.

Everything else mirrors the notebook exactly: the same four dropped columns,
the same cyclical encodings, the same two domain features, the same
chronological 80/20 split.
"""
import gzip
import json
import os

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

SRC = "/Users/sufyankadiwala/developer/Claude/Portfolio/Bike Sharing Demand Prediction/hour.csv"
OUT = os.path.dirname(os.path.abspath(__file__))

# UCI's normalisation, inverted so the UI can show real units instead of 0.44.
# temp: (t + 8) / 47      atemp: (t + 16) / 66      hum: /100   windspeed: /67
DECODE = {"temp": [47, -8], "atemp": [66, -16], "hum": [100, 0], "windspeed": [67, 0]}

N_TREES, MIN_LEAF = 40, 10

raw = pd.read_csv(SRC)
print("raw:", raw.shape)

# ---- notebook preprocessing, unchanged ----
d = raw.drop(columns=["casual", "registered", "instant", "dteday"])
for col, period in [("hr", 24), ("mnth", 12), ("weekday", 7)]:
    d[f"{col}_sin"] = np.sin(2 * np.pi * d[col] / period)
    d[f"{col}_cos"] = np.cos(2 * np.pi * d[col] / period)
d["rush_hour"] = d["hr"].isin([7, 8, 9, 16, 17, 18]).astype(int)
d["comfort_index"] = d["temp"] * (1 - d["hum"])

X, y = d.drop(columns=["cnt"]), d["cnt"]
split = int(len(X) * 0.8)
Xtr, Xte, ytr, yte = X.iloc[:split], X.iloc[split:], y.iloc[:split], y.iloc[split:]
print(f"train {Xtr.shape} mean {ytr.mean():.2f} | test {Xte.shape} mean {yte.mean():.2f}")


def metrics(model):
    p = model.predict(Xte)
    return {
        "rmse": float(np.sqrt(mean_squared_error(yte, p))),
        "mae": float(mean_absolute_error(yte, p)),
        "rmsle": float(np.sqrt(mean_squared_error(
            np.log1p(np.maximum(0, yte)), np.log1p(np.maximum(0, p))))),
        "r2": float(r2_score(yte, p)),
    }


# ---- what the pruning costs, printed rather than assumed ----
full = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1).fit(Xtr, ytr)
mf = metrics(full)
print(f"notebook model : R2 {mf['r2']:.3f}  RMSE {mf['rmse']:.2f}  "
      f"{sum(e.tree_.node_count for e in full.estimators_):,} nodes")

model = RandomForestRegressor(n_estimators=N_TREES, min_samples_leaf=MIN_LEAF,
                              random_state=42, n_jobs=-1).fit(Xtr, ytr)
m = metrics(model)
print(f"shipped model  : R2 {m['r2']:.3f}  RMSE {m['rmse']:.2f}  "
      f"{sum(e.tree_.node_count for e in model.estimators_):,} nodes")

# ---- forest as flat per-node arrays ----
# Thresholds keep full float precision on purpose: rounding them mis-branches
# any row that sits exactly on a split boundary, and integer features like hr
# and weathersit sit on them constantly.
trees = [{"f": [int(v) for v in e.tree_.feature],
          "t": [float(v) for v in e.tree_.threshold],
          "l": [int(v) for v in e.tree_.children_left],
          "r": [int(v) for v in e.tree_.children_right],
          "v": [float(e.tree_.value[i][0][0]) for i in range(e.tree_.node_count)]}
         for e in model.estimators_]
blob = json.dumps({"trees": trees}, separators=(",", ":"))
open(os.path.join(OUT, "forest.json"), "w").write(blob)
print(f"forest.json: {len(blob)/1e6:.1f} MB ({len(gzip.compress(blob.encode(), 9))/1e6:.2f} MB gzipped)")

# ---- reference curves: what actually happened, for the comparison line ----
# Keyed on the three things a visitor picks that the dataset can be sliced by.
actual = {}
for (yr, wd, season), g in raw.assign(
        workingday=raw.workingday).groupby(["yr", "workingday", "season"]):
    by_hr = g.groupby("hr")["cnt"].mean()
    actual[f"{yr}|{wd}|{season}"] = {
        "curve": [round(float(by_hr.get(h, 0)), 1) for h in range(24)],
        "n": int(len(g)),
    }

season_defaults = {
    str(s): {c: round(float(g[c].median()), 4) for c in ("temp", "hum", "windspeed")}
    for s, g in raw.groupby("season")
}

meta = {
    "features": list(X.columns),
    "decode": DECODE,
    "n_trees": N_TREES,
    "min_samples_leaf": MIN_LEAF,
    "n_rows": int(len(raw)),
    "n_train": int(len(Xtr)), "n_test": int(len(Xte)),
    "train_mean": round(float(ytr.mean()), 2), "test_mean": round(float(yte.mean()), 2),
    "metrics": {k: round(v, 4) for k, v in m.items()},
    "metrics_full": {k: round(v, 4) for k, v in mf.items()},
    # atemp is a separate model input but is 0.988 correlated with temp by
    # construction, so one slider drives both through this fit rather than
    # asking a visitor for two temperatures. Residual sd is 0.027.
    "atemp_from_temp": [round(float(v), 4) for v in np.polyfit(raw.temp, raw.atemp, 1)],
    "importances": sorted(
        [{"f": f, "v": round(float(v), 4)}
         for f, v in zip(X.columns, model.feature_importances_)],
        key=lambda r: -r["v"])[:10],
    "season_defaults": season_defaults,
    "weathersit_counts": {str(k): int(v) for k, v in
                          raw.weathersit.value_counts().sort_index().items()},
    # Every threshold any tree uses on weathersit. With only 3 rows at
    # weathersit=4 and min_samples_leaf=10, no tree can ever split at 3.5 --
    # so the forest returns an identical curve for light and heavy rain. The
    # UI reads this to say so, rather than presenting a distinction the model
    # does not actually make.
    "weathersit_splits": sorted({round(float(e.tree_.threshold[n]), 6)
                                 for e in model.estimators_
                                 for n in range(e.tree_.node_count)
                                 if e.tree_.feature[n] == list(X.columns).index("weathersit")}),
    "actual": actual,
    "cnt_max": int(raw.cnt.max()),
}
json.dump(meta, open(os.path.join(OUT, "meta.json"), "w"), separators=(",", ":"))
print(f"meta.json: {os.path.getsize(os.path.join(OUT, 'meta.json'))/1e3:.0f} KB "
      f"({len(actual)} reference curves)")

# ---- golden cases for the parity test ----
# Real rows, plus a day-long sweep, plus the edge rows that rounding bugs hide
# behind: hour 0 and 23 (the cyclical wrap), weathersit 4 (3 rows in the whole
# dataset), and the exact min/max of every continuous feature.
# Only these columns are genuinely integral. Casting the rest — the sin/cos
# pairs above all — would silently floor them to 0 and make the golden file
# describe a row the model was never given.
INT_COLS = ("season", "yr", "mnth", "hr", "holiday", "weekday",
            "workingday", "weathersit", "rush_hour")


def row_dict(r):
    return {c: (int(r[c]) if c in INT_COLS else float(r[c])) for c in X.columns}

cases = [{"input": row_dict(r), "expected": float(model.predict(X.loc[[i]])[0])}
         for i, r in X.sample(n=6, random_state=11).iterrows()]

base = X.iloc[len(X) // 2].copy()
for hr in (0, 6, 7, 12, 17, 23):                      # the cyclical wrap + both peaks
    r = base.copy()
    r["hr"] = hr
    r["hr_sin"], r["hr_cos"] = np.sin(2 * np.pi * hr / 24), np.cos(2 * np.pi * hr / 24)
    r["rush_hour"] = int(hr in (7, 8, 9, 16, 17, 18))
    cases.append({"input": row_dict(r),
                  "expected": float(model.predict(pd.DataFrame([r], columns=X.columns))[0])})

for ws in (1, 2, 3, 4):
    r = base.copy(); r["weathersit"] = ws
    cases.append({"input": row_dict(r),
                  "expected": float(model.predict(pd.DataFrame([r], columns=X.columns))[0])})

for col in ("temp", "hum", "windspeed"):
    for v in (X[col].min(), X[col].max()):
        r = base.copy(); r[col] = v
        r["comfort_index"] = r["temp"] * (1 - r["hum"])
        if col == "temp":
            a, b = np.polyfit(raw.temp, raw.atemp, 1)
            r["atemp"] = a * v + b
        cases.append({"input": row_dict(r),
                      "expected": float(model.predict(pd.DataFrame([r], columns=X.columns))[0])})

json.dump(cases, open(os.path.join(OUT, "golden.json"), "w"), indent=1)
print(f"golden.json: {len(cases)} cases")
print("top features:", ", ".join(f"{r['f']} {r['v']:.3f}" for r in meta["importances"][:5]))
