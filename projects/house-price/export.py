"""Export the House Price Flask app's model + data for a fully static demo.

The Flask app needs a server for three things:
  /api/predict   ensemble mean, per-tree spread, contributions, percentile
  /api/autofill  median of the 30 nearest census blocks to a point
  /api/meta      stats, ratio stats, ocean categories, map scatter

All three become static files here.

m2cgen is deliberately NOT used for this project. It exports the averaged
ensemble as one if/else function, which cannot produce the per-tree spread the
UI's uncertainty band is built on. Exporting the trees as flat arrays gives
per-tree predictions AND is far smaller than m2cgen's generated code.
"""
import json, os, gzip
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.model_selection import StratifiedShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics import mean_squared_error

SRC = "/Users/sufyankadiwala/developer/Claude/Portfolio/House Price Prediction"
OUT = os.path.dirname(os.path.abspath(__file__))

NUM = ["longitude", "latitude", "housing_median_age", "total_rooms",
       "total_bedrooms", "population", "households", "median_income"]
CAT = ["ocean_proximity"]

raw = pd.read_csv(os.path.join(SRC, "housing.csv"))
print("loaded:", raw.shape)

# --- same stratified split as app.py / main.py ---
h = raw.copy()
h["income_cat"] = pd.cut(h["median_income"], bins=[0., 1.5, 3., 4.5, 6., np.inf],
                         labels=[1, 2, 3, 4, 5])
sp = StratifiedShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
tr_i, te_i = next(sp.split(h, h["income_cat"]))
train = h.loc[tr_i].drop("income_cat", axis=1)
test = h.loc[te_i].drop("income_cat", axis=1)

y_tr = train["median_house_value"]; X_tr = train.drop("median_house_value", axis=1)
y_te = test["median_house_value"];  X_te = test.drop("median_house_value", axis=1)

pipeline = ColumnTransformer([
    ("num", Pipeline([("imputer", SimpleImputer(strategy="median")),
                      ("scaler", StandardScaler())]), NUM),
    ("cat", Pipeline([("onehot", OneHotEncoder(handle_unknown="ignore"))]), CAT),
])
P_tr = pipeline.fit_transform(X_tr)
P_te = pipeline.transform(X_te)

# 50 trees / min_samples_leaf=10: keeps the per-tree band meaningful while
# staying small enough to ship. See README for the size/accuracy trade.
model = RandomForestRegressor(n_estimators=50, min_samples_leaf=10,
                              random_state=42, n_jobs=-1)
model.fit(P_tr, y_tr)
rmse = float(np.sqrt(mean_squared_error(y_te, model.predict(P_te))))
print("test RMSE: $%,.0f".replace("%,", "%") % rmse)

# --- pipeline parameters the JS port needs ---
num_pipe = pipeline.named_transformers_["num"]
imputer = num_pipe.named_steps["imputer"]
scaler = num_pipe.named_steps["scaler"]
ohe = pipeline.named_transformers_["cat"].named_steps["onehot"]
ocean_cats = [str(c) for c in ohe.categories_[0]]
print("ocean categories (OHE order):", ocean_cats)

# --- forest as flat arrays: one entry per node, per tree ---
trees = []
for est in model.estimators_:
    t = est.tree_
    trees.append({
        "f": [int(x) for x in t.feature],                       # -2 == leaf
        # full float precision: rounding thresholds mis-branches any row that
        # sits exactly on a split boundary (dataset medians do, constantly)
        "t": [float(x) for x in t.threshold],
        "l": [int(x) for x in t.children_left],
        "r": [int(x) for x in t.children_right],
        "v": [float(t.value[i][0][0]) for i in range(t.node_count)],
    })
forest = {"trees": trees, "n_features": int(P_tr.shape[1])}
js_forest = json.dumps(forest, separators=(",", ":"))
open(os.path.join(OUT, "forest.json"), "w").write(js_forest)
print("forest.json: %.1f MB (%.0f KB gzipped)"
      % (len(js_forest) / 1e6, len(gzip.compress(js_forest.encode(), 9)) / 1e3))

# --- stats mirroring app.py ---
stats = {c: {"min": float(raw[c].min()), "max": float(raw[c].max()),
             "median": float(raw[c].median()),
             "p05": float(raw[c].quantile(.05)), "p95": float(raw[c].quantile(.95))}
         for c in NUM}
ratios = pd.DataFrame({"rooms_per_home": raw.total_rooms / raw.households,
                       "bedrooms_per_home": raw.total_bedrooms / raw.households,
                       "people_per_home": raw.population / raw.households})
ratio_stats = {c: {"min": float(ratios[c].quantile(.005)),
                   "max": float(ratios[c].quantile(.995)),
                   "median": float(ratios[c].median())} for c in ratios.columns}

scatter_df = raw.sample(n=min(3000, len(raw)), random_state=7)
scatter = [[round(float(r.longitude), 3), round(float(r.latitude), 3),
            int(r.median_house_value)] for r in scatter_df.itertuples()]

meta = {
    "stats": stats,
    "ratios": ratio_stats,
    "ocean_categories": ["<1H OCEAN", "INLAND", "NEAR OCEAN", "NEAR BAY", "ISLAND"],
    "ohe_categories": ocean_cats,     # the order the model's one-hot columns use
    "mode_ocean": str(raw["ocean_proximity"].mode()[0]),
    "scatter": scatter,
    "target": {"min": float(raw["median_house_value"].min()),
               "max": float(raw["median_house_value"].max()),
               "median": float(raw["median_house_value"].median())},
    "n_rows": int(len(raw)),
    "n_trees": len(model.estimators_),
    "num_attribs": NUM,
    "imputer_medians": [float(x) for x in imputer.statistics_],
    "scaler_mean": [float(x) for x in scaler.mean_],
    "scaler_scale": [float(x) for x in scaler.scale_],
    "test_rmse": rmse,
    # sorted target values let the browser compute the state-wide percentile
    # without shipping every row twice
    "value_deciles": [float(raw["median_house_value"].quantile(q / 100))
                      for q in range(0, 101)],
}
json.dump(meta, open(os.path.join(OUT, "meta.json"), "w"), separators=(",", ":"))
print("meta.json: %.0f KB" % (os.path.getsize(os.path.join(OUT, "meta.json")) / 1e3))

# --- block table for the nearest-30 autofill ---
cols = ["total_rooms", "total_bedrooms", "population", "households",
        "housing_median_age", "median_income", "median_house_value"]
blocks = {
    "lon": [round(float(v), 4) for v in raw["longitude"]],
    "lat": [round(float(v), 4) for v in raw["latitude"]],
    "ocean": [str(v) for v in raw["ocean_proximity"]],
    "cols": cols,
    # null preserves NaN in total_bedrooms, which the median must skip
    "data": [[None if pd.isna(v) else round(float(v), 4) for v in raw[c]] for c in cols],
}
js_blocks = json.dumps(blocks, separators=(",", ":"))
open(os.path.join(OUT, "blocks.json"), "w").write(js_blocks)
print("blocks.json: %.1f MB (%.0f KB gzipped)"
      % (len(js_blocks) / 1e6, len(gzip.compress(js_blocks.encode(), 9)) / 1e3))

# --- golden cases for the parity test ---
def predict_full(row):
    df = pd.DataFrame([row], columns=NUM + CAT)
    X = pipeline.transform(df)
    per_tree = np.array([e.predict(X)[0] for e in model.estimators_])
    lo, hi = np.percentile(per_tree, [10, 90])
    return {"price": float(per_tree.mean()), "std": float(per_tree.std()),
            "low": float(lo), "high": float(hi),
            "per_tree_first5": [float(x) for x in per_tree[:5]]}

cases = []
for _, r in raw.sample(n=5, random_state=3).iterrows():
    row = {c: (None if pd.isna(r[c]) else float(r[c])) for c in NUM}
    row["ocean_proximity"] = str(r["ocean_proximity"])
    cases.append({"input": row, "expected": predict_full(row)})

# edge cases: every ocean category + a missing total_bedrooms (imputer path)
base = {c: stats[c]["median"] for c in NUM}
for cat in ocean_cats:
    row = dict(base); row["ocean_proximity"] = cat
    cases.append({"input": row, "expected": predict_full(row)})
row = dict(base); row["total_bedrooms"] = None; row["ocean_proximity"] = "INLAND"
cases.append({"input": row, "expected": predict_full(row)})

json.dump(cases, open(os.path.join(OUT, "golden.json"), "w"), indent=1)
print("golden cases:", len(cases))
for c in cases[:4]:
    print("  %-12s -> $%,.0f  [band $%,.0f - $%,.0f]".replace("%,", "%")
          % (c["input"]["ocean_proximity"], c["expected"]["price"],
             c["expected"]["low"], c["expected"]["high"]))
