"""Retrain the medical-insurance model and export it to JavaScript.

Mirrors medical_insurance_cost_predictor.ipynb exactly:
  sex    male->1, female->0
  smoker yes->1,  no->0
  get_dummies(region, drop_first=True)   -> northeast is the baseline
  bmi_smoker  = bmi * smoker
  age_smoker  = age * smoker
  age_squared = age ** 2
  target = charges  (RAW - no log transform, so no expm1 on output)

Ships the notebook's Random Forest rather than its Gradient Boosting model:
m2cgen 0.10 cannot export sklearn's GradientBoostingRegressor. The forest is
marginally weaker (CV R2 0.854 vs 0.857) but it is the model the README's
"bmi_smoker accounts for 84% of predictive work" figure refers to, and it
exports to 722 KB - no size compromise needed.
"""
import json, os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import m2cgen as m2c

SRC = "/Users/sufyankadiwala/developer/Claude/Portfolio/Medical Insurance cost Prediction"
OUT = os.path.dirname(os.path.abspath(__file__))
TARGET = "charges"

df = pd.read_csv(os.path.join(SRC, "insurance.csv"))
print("loaded:", df.shape)

df_clean = df.copy()
df_clean["sex"] = df_clean["sex"].map({"male": 1, "female": 0})
df_clean["smoker"] = df_clean["smoker"].map({"yes": 1, "no": 0})

regions = sorted(df["region"].astype(str).unique().tolist())
df_clean = pd.get_dummies(df_clean, columns=["region"], drop_first=True, dtype=int)

df_clean["bmi_smoker"] = df_clean["bmi"] * df_clean["smoker"]
df_clean["age_smoker"] = df_clean["age"] * df_clean["smoker"]
df_clean["age_squared"] = df_clean["age"] ** 2

X = df_clean.drop(columns=[TARGET])
y = df_clean[TARGET]
feature_names = list(X.columns)
print("features:", len(feature_names), feature_names)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(n_estimators=100, max_depth=6,
                              min_samples_leaf=2, random_state=42)
model.fit(X_train, y_train)
pred = model.predict(X_test)

cv = cross_val_score(model, X, y, cv=KFold(5, shuffle=True, random_state=42), scoring="r2")
print("\n-- metrics --")
print("  test R2  : %.4f" % r2_score(y_test, pred))
print("  CV R2    : %.4f (+/- %.4f)" % (cv.mean(), cv.std()))
print("  MAE      : $%.0f" % mean_absolute_error(y_test, pred))
print("  RMSE     : $%.0f" % np.sqrt(mean_squared_error(y_test, pred)))

imp = pd.Series(model.feature_importances_, index=feature_names).sort_values(ascending=False)
print("\n  top features:")
for k, v in imp.head(4).items():
    print("    %-14s %.3f" % (k, v))

js = m2c.export_to_javascript(model, function_name="scoreInsurance")
open(os.path.join(OUT, "model.js"), "w").write(js)
import gzip
print("\nmodel.js: %.0f KB (%.0f KB gzipped)"
      % (len(js) / 1e3, len(gzip.compress(js.encode(), 9)) / 1e3))

meta = {
    "feature_names": feature_names,
    "regions": regions,
    "region_baseline": regions[0],
    "ranges": {c: {"min": float(df[c].min()), "max": float(df[c].max()),
                   "median": float(df[c].median())}
               for c in ["age", "bmi", "children"]},
    "metrics": {"test_r2": float(r2_score(y_test, pred)),
                "cv_r2": float(cv.mean()),
                "mae": float(mean_absolute_error(y_test, pred)),
                "bmi_smoker_importance": float(imp.get("bmi_smoker", 0))},
}
json.dump(meta, open(os.path.join(OUT, "meta.json"), "w"), indent=1)
print("region baseline (dropped):", meta["region_baseline"])

# ---- golden cases: sampled rows + edge cases hitting the baseline region ----
def encode(r):
    sex = 1 if str(r["sex"]) == "male" else 0
    smoker = 1 if str(r["smoker"]) == "yes" else 0
    bmi, age, ch = float(r["bmi"]), float(r["age"]), float(r["children"])
    row = {"age": age, "sex": sex, "bmi": bmi, "children": ch, "smoker": smoker,
           "bmi_smoker": bmi * smoker, "age_smoker": age * smoker,
           "age_squared": age ** 2}
    for reg in regions[1:]:
        row["region_" + reg] = 1 if str(r["region"]) == reg else 0
    return [float(row[f]) for f in feature_names]

cases = []
for _, r in df.sample(n=5, random_state=11).iterrows():
    raw = {k: (r[k].item() if hasattr(r[k], "item") else r[k])
           for k in ["age", "sex", "bmi", "children", "smoker", "region"]}
    cases.append({"input": raw,
                  "expected_charges": float(model.predict(np.array([encode(r)]))[0]),
                  "actual_charges": float(r[TARGET])})

for edge in [
    {"age": 30, "sex": "male", "bmi": 25.0, "children": 0, "smoker": "no", "region": "northeast"},
    {"age": 30, "sex": "female", "bmi": 25.0, "children": 0, "smoker": "no", "region": "northeast"},
    {"age": 30, "sex": "male", "bmi": 25.0, "children": 0, "smoker": "yes", "region": "northeast"},
    {"age": 64, "sex": "male", "bmi": 53.1, "children": 5, "smoker": "yes", "region": "southeast"},
    {"age": 18, "sex": "female", "bmi": 16.0, "children": 0, "smoker": "no", "region": "southwest"},
]:
    cases.append({"input": edge,
                  "expected_charges": float(model.predict(np.array([encode(edge)]))[0]),
                  "actual_charges": None})

json.dump(cases, open(os.path.join(OUT, "golden.json"), "w"), indent=1)
print("\ngolden cases:", len(cases))
for c in cases:
    i = c["input"]
    print("  age=%-3s %-7s bmi=%-5s smoker=%-4s %-10s -> $%,.0f".replace("%,", "%")
          % (i["age"], i["sex"], i["bmi"], i["smoker"], i["region"], c["expected_charges"]))
