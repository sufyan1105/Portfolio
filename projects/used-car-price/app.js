/* UI wiring for the used-car estimator.
   predict.js supplies the encoding; model.js supplies scoreUsedCar(). */

(function () {
  var form = document.getElementById("carForm");
  var priceEl = document.getElementById("price");
  var subEl = document.getElementById("priceSub");
  var statusEl = document.getElementById("status");

  // ---- theme toggle, sharing the site's localStorage key ----
  document.getElementById("themeToggle").addEventListener("click", function () {
    var root = document.documentElement;
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

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
  var inr = new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  });

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
      statusEl.textContent = "Enter a value for: " + missing.join(", ");
      statusEl.className = "status error";
      return;
    }

    try {
      var price = predictPrice(data);
      priceEl.textContent = inr.format(Math.round(price));
      subEl.textContent = inWords(price);
      statusEl.textContent = "Updates as you type · computed in your browser";
      statusEl.className = "status";
    } catch (err) {
      priceEl.textContent = "—";
      subEl.textContent = "";
      statusEl.textContent = "Could not compute a price: " + err.message;
      statusEl.className = "status error";
    }
  }

  form.addEventListener("input", update);
  form.addEventListener("change", update);

  // model.js is deferred, so wait for it before the first prediction
  function ready() {
    if (typeof scoreUsedCar === "function") {
      statusEl.className = "status";
      update();
    } else {
      priceEl.textContent = "—";
      statusEl.textContent = "Model failed to load. Try reloading the page.";
      statusEl.className = "status error";
    }
  }
  if (document.readyState === "complete") ready();
  else window.addEventListener("load", ready);
})();
