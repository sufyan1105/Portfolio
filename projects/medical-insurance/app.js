/* UI wiring for the medical-insurance estimator.
   predict.js supplies the encoding; model.js supplies scoreInsurance(). */
(function () {
  var form = document.getElementById("medForm");
  var priceEl = document.getElementById("price");
  var subEl = document.getElementById("priceSub");
  var statusEl = document.getElementById("status");

  function tr(key) {
    var dict = I18N[document.documentElement.getAttribute("data-lang")] || I18N.en;
    var v = dict[key] || I18N.en[key] || "";
    var tmp = document.createElement("div"); tmp.innerHTML = v;
    return tmp.textContent;
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  function fmt() {
    return new Intl.NumberFormat(
      document.documentElement.getAttribute("data-lang") === "de" ? "de-DE" : "en-US",
      { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }

  function readForm() {
    return {
      age: parseFloat(document.getElementById("age").value),
      sex: document.getElementById("sex").value,
      bmi: parseFloat(document.getElementById("bmi").value),
      children: parseFloat(document.getElementById("children").value),
      smoker: document.getElementById("smoker").value,
      region: document.getElementById("region").value,
    };
  }

  function update() {
    if (typeof scoreInsurance !== "function") return;
    var data = readForm();

    var missing = ["age", "bmi", "children"].filter(function (k) {
      return !Number.isFinite(data[k]);
    });
    if (missing.length) {
      priceEl.textContent = "—"; subEl.textContent = "";
      statusEl.textContent = tr("demo.missing") + " " + missing.join(", ");
      statusEl.className = "status error";
      return;
    }

    try {
      var charges = predictCharges(data);
      priceEl.textContent = fmt().format(Math.round(charges));
      // monthly equivalent is the number people actually reason about
      subEl.textContent = "≈ " + fmt().format(Math.round(charges / 12)) + " " + tr("med.perMonth");
      statusEl.textContent = tr("demo.local");
      statusEl.className = "status";
    } catch (err) {
      priceEl.textContent = "—"; subEl.textContent = "";
      statusEl.textContent = err.message;
      statusEl.className = "status error";
    }
  }

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  document.addEventListener("langchange", update);

  function ready() {
    if (typeof scoreInsurance === "function") update();
    else {
      priceEl.textContent = "—";
      statusEl.textContent = tr("demo.failed");
      statusEl.className = "status error";
    }
  }
  if (document.readyState === "complete") ready();
  else window.addEventListener("load", ready);
})();
