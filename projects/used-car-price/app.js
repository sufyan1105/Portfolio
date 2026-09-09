/* UI wiring for the used-car estimator.
   predict.js supplies the encoding; model.js supplies scoreUsedCar(). */

(function () {
  var form = document.getElementById("carForm");
  var priceEl = document.getElementById("price");
  var subEl = document.getElementById("priceSub");
  var statusEl = document.getElementById("status");

  // theme + language toggles are handled by the shared js/script.js
  function tr(key) {
    var dict = I18N[document.documentElement.getAttribute("data-lang")] || I18N.en;
    var v = dict[key] || I18N.en[key] || "";
    var tmp = document.createElement("div"); tmp.innerHTML = v;
    return tmp.textContent;
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  // ---- populate the dropdowns from the training category lists ----
  // Defaults are the dataset's most common values, not the drop_first
  // baselines, so the page opens on a realistic car rather than an Audi.
  var DEFAULTS = {
    brand: "Maruti", fuel_type: "Petrol",
    seller_type: "Dealer", transmission_type: "Manual",
  };
  Object.keys(CATEGORIES).forEach(function (col) {
    var sel = document.getElementById(col);
    if (!sel) return;
    CATEGORIES[col].forEach(function (v) {
      var o = document.createElement("option");
      o.value = v; o.textContent = v;
      if (v === DEFAULTS[col]) o.selected = true;
      sel.appendChild(o);
    });
  });

  // ---- formatting ----
  function inr() {
    return new Intl.NumberFormat("en-IN", {
      style: "currency", currency: "INR", maximumFractionDigits: 0,
    });
  }

  // Indian listings are read in lakh/crore, so show that alongside the figure.
  function inWords(v) {
    if (v >= 1e7) return "≈ " + (v / 1e7).toFixed(2) + " crore";
    if (v >= 1e5) return "≈ " + (v / 1e5).toFixed(2) + " lakh";
    return "";
  }

  function readForm() {
    var d = {};
    ["brand", "fuel_type", "seller_type", "transmission_type"].forEach(function (k) {
      d[k] = document.getElementById(k).value;
    });
    ["vehicle_age", "km_driven", "mileage", "engine", "max_power", "seats"].forEach(function (k) {
      d[k] = parseFloat(document.getElementById(k).value);
    });
    return d;
  }

  function update() {
    if (typeof scoreUsedCar !== "function") return;
    var data = readForm();

    var missing = Object.keys(data).filter(function (k) {
      return typeof data[k] === "number" && !Number.isFinite(data[k]);
    });
    if (missing.length) {
      priceEl.textContent = "—";
      subEl.textContent = "";
      statusEl.textContent = tr("demo.missing") + " " + missing.join(", ");
      statusEl.className = "status error";
      return;
    }

    try {
      var price = predictPrice(data);
      priceEl.textContent = inr().format(Math.round(price));
      subEl.textContent = inWords(price);
      statusEl.textContent = tr("demo.local");
      statusEl.className = "status";
    } catch (err) {
      priceEl.textContent = "—";
      subEl.textContent = "";
      statusEl.textContent = err.message;
      statusEl.className = "status error";
    }
  }

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  document.addEventListener("langchange", update);

  // model.js is deferred, so wait for it before the first prediction
  function ready() {
    if (typeof scoreUsedCar === "function") {
      statusEl.className = "status";
      update();
    } else {
      priceEl.textContent = "—";
      statusEl.textContent = tr("demo.failed");
      statusEl.className = "status error";
    }
  }
  if (document.readyState === "complete") ready();
  else window.addEventListener("load", ready);
})();
