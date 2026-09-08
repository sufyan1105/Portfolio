/* ============================================================
   Used Car Price Prediction — preprocessing port
   ------------------------------------------------------------
   Reproduces, in plain JS, exactly what the notebook did in pandas
   before the RandomForest saw a row:

     km_driven_log = log1p(km_driven)          (raw km_driven dropped)
     pd.get_dummies(brand, fuel_type, seller_type, transmission_type,
                    drop_first=True,
                    prefix=[brand, fuel, seller, transmission])
     model trained on log1p(selling_price)  ->  expm1() to get INR back

   drop_first=True means pandas sorted each category list and dropped the
   FIRST one. That dropped value is the implicit baseline: when the user
   picks it, every dummy for that column is 0. Those baselines are
   Audi / CNG / Dealer / Automatic — see BASELINE below.

   FEATURE_ORDER is the exact column order of X at training time. The
   model indexes into a flat array, so this order is load-bearing: a
   single misplaced entry silently produces plausible-but-wrong prices.
   It is verified against the trained model by tools/verify_parity.mjs.
   ============================================================ */

const FEATURE_ORDER = [
  "vehicle_age", "mileage", "engine", "max_power", "seats", "km_driven_log",
  "brand_BMW", "brand_Bentley", "brand_Datsun", "brand_Ferrari", "brand_Force",
  "brand_Ford", "brand_Honda", "brand_Hyundai", "brand_ISUZU", "brand_Isuzu",
  "brand_Jaguar", "brand_Jeep", "brand_Kia", "brand_Land Rover", "brand_Lexus",
  "brand_MG", "brand_Mahindra", "brand_Maruti", "brand_Maserati",
  "brand_Mercedes-AMG", "brand_Mercedes-Benz", "brand_Mini", "brand_Nissan",
  "brand_Porsche", "brand_Renault", "brand_Rolls-Royce", "brand_Skoda",
  "brand_Tata", "brand_Toyota", "brand_Volkswagen", "brand_Volvo",
  "fuel_Diesel", "fuel_Electric", "fuel_LPG", "fuel_Petrol",
  "seller_Individual", "seller_Trustmark Dealer",
  "transmission_Manual",
];

// Full category lists, sorted exactly as pandas sorted them.
const CATEGORIES = {
  brand: ["Audi", "BMW", "Bentley", "Datsun", "Ferrari", "Force", "Ford",
    "Honda", "Hyundai", "ISUZU", "Isuzu", "Jaguar", "Jeep", "Kia",
    "Land Rover", "Lexus", "MG", "Mahindra", "Maruti", "Maserati",
    "Mercedes-AMG", "Mercedes-Benz", "Mini", "Nissan", "Porsche", "Renault",
    "Rolls-Royce", "Skoda", "Tata", "Toyota", "Volkswagen", "Volvo"],
  fuel_type: ["CNG", "Diesel", "Electric", "LPG", "Petrol"],
  seller_type: ["Dealer", "Individual", "Trustmark Dealer"],
  transmission_type: ["Automatic", "Manual"],
};

// The category dropped by drop_first — selecting it zeroes that column group.
const BASELINE = {
  brand: "Audi", fuel_type: "CNG",
  seller_type: "Dealer", transmission_type: "Automatic",
};

// column -> dummy prefix used at training time
const PREFIX = {
  brand: "brand", fuel_type: "fuel",
  seller_type: "seller", transmission_type: "transmission",
};

const NUMERIC = ["vehicle_age", "mileage", "engine", "max_power", "seats"];

/** Build the 44-length feature vector the model expects. */
function buildFeatureVector(input) {
  // one-hot lookup: "brand_Maruti" -> 1 when brand === "Maruti"
  const active = new Set();
  for (const col of Object.keys(PREFIX)) {
    const value = String(input[col]);
    if (value !== BASELINE[col]) active.add(PREFIX[col] + "_" + value);
  }

  return FEATURE_ORDER.map((name) => {
    if (name === "km_driven_log") return Math.log1p(Number(input.km_driven));
    if (NUMERIC.includes(name)) return Number(input[name]);
    return active.has(name) ? 1 : 0;
  });
}

/**
 * Predict selling price in INR.
 * `scoreUsedCar` comes from model.js (m2cgen export) and returns a value in
 * log space, because the notebook trained on log1p(selling_price).
 */
function predictPrice(input) {
  const vector = buildFeatureVector(input);
  if (vector.some((v) => !Number.isFinite(v))) {
    throw new Error("feature vector contains a non-finite value");
  }
  return Math.expm1(scoreUsedCar(vector)); // inverse of np.log1p
}

// Available to both the browser page and the Node parity test.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FEATURE_ORDER, CATEGORIES, BASELINE, PREFIX,
                     buildFeatureVector, predictPrice };
}
