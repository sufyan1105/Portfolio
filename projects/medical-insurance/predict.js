/* ============================================================
   Medical Insurance Cost Prediction — preprocessing port
   ------------------------------------------------------------
   Reproduces the notebook's pandas pipeline in plain JS:

     sex     male -> 1, female -> 0
     smoker  yes  -> 1, no     -> 0
     pd.get_dummies(region, drop_first=True)  -> northeast is the baseline
     bmi_smoker  = bmi * smoker
     age_smoker  = age * smoker
     age_squared = age ** 2

   NOTE: unlike the used-car project, the target here is RAW `charges` —
   the notebook did NOT log-transform it — so the model's output is already
   in dollars and must NOT have expm1() applied.

   FEATURE_ORDER is the training column order; the model indexes a flat
   array, so it is load-bearing. Verified by the parity test.
   ============================================================ */

const FEATURE_ORDER = [
  "age", "sex", "bmi", "children", "smoker",
  "region_northwest", "region_southeast", "region_southwest",
  "bmi_smoker", "age_smoker", "age_squared",
];

const REGIONS = ["northeast", "northwest", "southeast", "southwest"];
const REGION_BASELINE = "northeast"; // dropped by drop_first=True

/** Build the 11-length feature vector the model expects. */
function buildFeatureVector(input) {
  const age = Number(input.age);
  const bmi = Number(input.bmi);
  const children = Number(input.children);
  const sex = String(input.sex) === "male" ? 1 : 0;
  const smoker = String(input.smoker) === "yes" ? 1 : 0;
  const region = String(input.region);

  const row = {
    age: age,
    sex: sex,
    bmi: bmi,
    children: children,
    smoker: smoker,
    region_northwest: region === "northwest" ? 1 : 0,
    region_southeast: region === "southeast" ? 1 : 0,
    region_southwest: region === "southwest" ? 1 : 0,
    bmi_smoker: bmi * smoker,
    age_smoker: age * smoker,
    age_squared: age * age,
  };
  return FEATURE_ORDER.map((f) => row[f]);
}

/** Predicted annual charges in USD. No inverse transform — target was raw. */
function predictCharges(input) {
  const vector = buildFeatureVector(input);
  if (vector.some((v) => !Number.isFinite(v))) {
    throw new Error("feature vector contains a non-finite value");
  }
  return scoreInsurance(vector);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { FEATURE_ORDER, REGIONS, REGION_BASELINE,
                     buildFeatureVector, predictCharges };
}
