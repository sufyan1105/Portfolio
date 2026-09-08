"""Retrain the notebook's RandomForest and export it to JavaScript.

Mirrors used_car_price_predictor.ipynb exactly:
  drop Unnamed: 0, car_name, model
  km_driven_log = log1p(km_driven); drop km_driven
  get_dummies(brand, fuel_type, seller_type, transmission_type,
              drop_first=True, prefix=[brand, fuel, seller, transmission])
  target = log1p(selling_price)
  RandomForestRegressor(n_estimators=100, max_depth=None, random_state=42)
"""
import json, os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import m2cgen as m2c

SRC = "/Users/sufyankadiwala/developer/Claude/Portfolio/Used Car Price Prediction"
OUT = os.path.dirname(os.path.abspath(__file__))

df = pd.read_csv(os.path.join(SRC, "cardekho_dataset.csv"))
print("loaded:", df.shape)

df_clean = df.copy()
df_clean.drop(columns=["Unnamed: 0", "car_name", "model"], inplace=True)
df_clean["km_driven_log"] = np.log1p(df_clean["km_driven"])
df_clean.drop(columns=["km_driven"], inplace=True)

CAT = ["brand", "fuel_type", "seller_type", "transmission_type"]
PREFIX = ["brand", "fuel", "seller", "transmission"]

# Capture the categories BEFORE encoding so the JS port can reproduce
# drop_first: pandas sorts categories and drops the first one, which becomes
# the implicit all-zeros baseline.
categories = {c: sorted(df_clean[c].astype(str).unique().tolist()) for c in CAT}

df_clean = pd.get_dummies(df_clean, columns=CAT, drop_first=True,
                          prefix=PREFIX, dtype=int)
df_clean["selling_price_log"] = np.log1p(df_clean["selling_price"])

X = df_clean.drop(columns=["selling_price", "selling_price_log"])
y = df_clean["selling_price_log"]
feature_names = list(X.columns)
print("features:", len(feature_names))

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42)

# The notebook's unpruned 100-tree forest exports to a 237 MB JS file, which
# cannot ship on a web page. min_samples_leaf=10 with 40 trees gives 5.9 MB
# (512 KB gzipped) for a ~0.024 drop in R2. See BUILD_NOTES.md.
model = RandomForestRegressor(n_estimators=40, min_samples_leaf=10, random_state=42)
model.fit(X_train, y_train)

pred_log = model.predict(X_test)
y_real, pred_real = np.expm1(y_test), np.expm1(pred_log)
print("\n-- parity with notebook --")
print("  R2 (log space) : %.4f" % r2_score(y_test, pred_log))
print("  R2 (INR)       : %.4f" % r2_score(y_real, pred_real))
print("  RMSE (INR)     : %,.0f".replace("%,", "%") % np.sqrt(mean_squared_error(y_real, pred_real)))
print("  MAE  (INR)     : %.0f" % mean_absolute_error(y_real, pred_real))

# ---- export model to JS ----
js = m2c.export_to_javascript(model, function_name="scoreUsedCar")
open(os.path.join(OUT, "model.js"), "w").write(js)
print("\nmodel.js: %.1f MB" % (len(js) / 1e6))

# ---- metadata the JS preprocessing needs ----
meta = {
    "feature_names": feature_names,
    "categories": categories,
    "dropped_baseline": {c: categories[c][0] for c in CAT},
    "prefix": dict(zip(CAT, PREFIX)),
    "numeric_ranges": {
        col: {"min": float(df_clean[col].min()), "max": float(df_clean[col].max()),
              "median": float(df_clean[col].median())}
        for col in ["vehicle_age", "mileage", "engine", "max_power", "seats"]
    },
    "km_driven_range": {"min": float(df["km_driven"].min()),
                        "max": float(df["km_driven"].max()),
                        "median": float(df["km_driven"].median())},
}
json.dump(meta, open(os.path.join(OUT, "meta.json"), "w"), indent=1)
print("baseline (dropped) categories:", meta["dropped_baseline"])

# ---- golden test rows for the JS parity check ----
rows = df.sample(n=5, random_state=7)
cases = []
for _, r in rows.iterrows():
    raw = {c: (r[c].item() if hasattr(r[c], "item") else r[c])
           for c in ["brand", "vehicle_age", "km_driven", "fuel_type",
                     "seller_type", "transmission_type", "mileage",
                     "engine", "max_power", "seats"]}
    # build the encoded vector exactly as training did
    vec = []
    for f in feature_names:
        if f == "km_driven_log":
            vec.append(float(np.log1p(raw["km_driven"])))
        elif f in ("vehicle_age", "mileage", "engine", "max_power", "seats"):
            vec.append(float(raw[f]))
        else:
            pre, val = f.split("_", 1)
            src = {v: k for k, v in meta["prefix"].items()}[pre]
            vec.append(1.0 if str(raw[src]) == val else 0.0)
    pred = float(np.expm1(model.predict(np.array([vec]))[0]))
    cases.append({"input": raw, "expected_price": pred,
                  "actual_price": float(r["selling_price"])})

json.dump(cases, open(os.path.join(OUT, "golden.json"), "w"), indent=1)
print("\ngolden cases written:", len(cases))
for c in cases:
    print("  %-12s age=%-3s km=%-8s -> predicted %,.0f (actual %,.0f)".replace("%,", "%")
          % (c["input"]["brand"], c["input"]["vehicle_age"], c["input"]["km_driven"],
             c["expected_price"], c["actual_price"]))
