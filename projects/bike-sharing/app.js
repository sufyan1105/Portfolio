/* Bike Sharing demand demo — form + chart, all client-side.

   Unlike the other demos this one predicts 24 rows per change rather than one,
   because the shape of the daily curve is the point. 40 trees x 24 hours is
   about a thousand tree walks, which is fast enough to run on every slider
   move without debouncing. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var chart = $("chart"), statusEl = $("status");
  var selected = 8;            // the hour the fourth tile reads out
  var curve = null, actual = null;

  function tr(key) {
    var dict = I18N[document.documentElement.getAttribute("data-lang")] || I18N.en;
    return dict[key] != null ? dict[key] : (I18N.en[key] || key);
  }
  var lang = function () { return document.documentElement.getAttribute("data-lang") === "de" ? "de-DE" : "en-US"; };
  var num = function (v, d) {
    return Number(v).toLocaleString(lang(), { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  };
  // Entities live in the dictionary because most keys are written with
  // innerHTML; these tiles use textContent, so decode before assigning.
  function plain(key) {
    var d = document.createElement("textarea");
    d.innerHTML = tr(key);
    return d.value;
  }
  var hhmm = function (h) { return (h < 10 ? "0" : "") + h + ":00"; };

  // ---------------------------------------------------------------- inputs
  function readInputs() {
    return {
      season: +$("season").value, yr: +$("yr").value, mnth: +$("mnth").value,
      weekday: +$("weekday").value, holiday: +$("holiday").value,
      weathersit: +$("weathersit").value,
      temp: +$("temp").value, hum: +$("hum").value, windspeed: +$("windspeed").value,
    };
  }

  function fillSelects() {
    var m = BS.meta;
    var opt = function (host, value, label, sel) {
      var o = document.createElement("option");
      o.value = value; o.textContent = label; o.selected = !!sel;
      host.appendChild(o);
    };
    for (var s = 1; s <= 4; s++) opt($("season"), s, plain("bike.season." + s), s === 3);
    for (var mo = 1; mo <= 12; mo++) {
      opt($("mnth"), mo, new Date(2012, mo - 1, 1).toLocaleDateString(lang(), { month: "long" }), mo === 7);
    }
    for (var w = 0; w <= 6; w++) opt($("weekday"), w, plain("bike.wd." + w), w === 3);
    for (var ws = 1; ws <= 4; ws++) opt($("weathersit"), ws, plain("bike.ws." + ws), ws === 1);
    // Season medians are a far better starting point than a flat 0.5.
    var d = m.season_defaults["3"];
    $("temp").value = d.temp; $("hum").value = d.hum; $("windspeed").value = d.windspeed;
  }

  /** Month names and the four season/weather lists are all translated. */
  function relabelSelects() {
    var opts = $("season").options, i;
    for (i = 0; i < opts.length; i++) opts[i].textContent = plain("bike.season." + opts[i].value);
    opts = $("weekday").options;
    for (i = 0; i < opts.length; i++) opts[i].textContent = plain("bike.wd." + opts[i].value);
    opts = $("weathersit").options;
    for (i = 0; i < opts.length; i++) opts[i].textContent = plain("bike.ws." + opts[i].value);
    opts = $("mnth").options;
    for (i = 0; i < opts.length; i++) {
      opts[i].textContent = new Date(2012, +opts[i].value - 1, 1).toLocaleDateString(lang(), { month: "long" });
    }
  }

  /**
   * Which other weather codes land in exactly the same leaves as this one.
   * Two values are separable only if some tree splits between them, so group
   * 1..4 by which side of every recorded threshold they fall on.
   */
  function indistinguishableFrom(ws) {
    var cuts = BS.meta.weathersit_splits || [];
    var sig = function (v) { return cuts.map(function (c) { return v <= c ? 1 : 0; }).join(""); };
    var mine = sig(ws), out = [];
    for (var v = 1; v <= 4; v++) if (v !== ws && sig(v) === mine) out.push(v);
    return out;
  }

  function renderReadouts(inp) {
    $("outTemp").textContent = num(BS.toReal("temp", inp.temp), 1) + " °C";
    $("outHum").textContent = num(BS.toReal("hum", inp.hum)) + " %";
    $("outWind").textContent = num(BS.toReal("windspeed", inp.windspeed)) + " km/h";

    var working = BS.isWorkingDay(inp.weekday, inp.holiday);
    $("dayBadge").textContent = plain(working ? "bike.workingday" : "bike.weekend");

    // weathersit 4 occurs 3 times in 17,379 rows, so no tree ever splits at
    // 3.5 and the forest returns the same curve for light and heavy rain.
    // Better to say that than to present a distinction the model never makes.
    var peers = indistinguishableFrom(inp.weathersit);
    var rare = $("rareNote");
    rare.hidden = peers.length === 0;
    if (!rare.hidden) {
      var all = peers.concat([inp.weathersit]).sort();
      var rarest = all.reduce(function (a, b) {
        return (BS.meta.weathersit_counts[String(a)] || 0) <= (BS.meta.weathersit_counts[String(b)] || 0) ? a : b;
      });
      rare.textContent = "⚠ " + plain("bike.ws.same")
        .replace("{a}", plain("bike.ws." + all[0]))
        .replace("{b}", plain("bike.ws." + all[all.length - 1]))
        .replace("{n}", num(BS.meta.weathersit_counts[String(rarest)] || 0));
    }
  }

  // ---------------------------------------------------------------- chart
  var W = 720, H = 280, PAD = { l: 46, r: 12, t: 14, b: 26 };
  var IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;

  function draw() {
    if (!curve) return;
    var top = Math.max.apply(null, curve.concat(actual ? actual.curve : [0]));
    top = Math.max(50, Math.ceil(top / 50) * 50);          // a round axis top
    var x = function (h) { return PAD.l + h / 23 * IW; };
    var y = function (v) { return PAD.t + IH - v / top * IH; };
    var path = function (arr) {
      return arr.map(function (v, h) { return (h ? "L" : "M") + x(h).toFixed(1) + " " + y(v).toFixed(1); }).join(" ");
    };

    var svg = "";
    // the two commuter windows, shaded so the peaks have context
    svg += '<rect class="rush" x="' + x(7) + '" y="' + PAD.t + '" width="' + (x(9) - x(7)) + '" height="' + IH + '"/>';
    svg += '<rect class="rush" x="' + x(16) + '" y="' + PAD.t + '" width="' + (x(18) - x(16)) + '" height="' + IH + '"/>';

    for (var g = 0; g <= 4; g++) {
      var v = top * g / 4, yy = y(v);
      svg += '<line class="grid-line" x1="' + PAD.l + '" y1="' + yy.toFixed(1) + '" x2="' + (W - PAD.r) + '" y2="' + yy.toFixed(1) + '"/>';
      svg += '<text class="axis-label" x="' + (PAD.l - 8) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end">' + num(v) + "</text>";
    }
    [0, 6, 12, 18, 23].forEach(function (h) {
      svg += '<text class="axis-label" x="' + x(h).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + hhmm(h) + "</text>";
    });

    svg += '<path class="area" d="' + path(curve) + " L" + x(23) + " " + y(0) + " L" + x(0) + " " + y(0) + ' Z"/>';
    if (actual) svg += '<path class="line-actual" d="' + path(actual.curve) + '"/>';
    svg += '<path class="line" d="' + path(curve) + '"/>';

    svg += '<line class="cursor" x1="' + x(selected).toFixed(1) + '" y1="' + PAD.t + '" x2="' + x(selected).toFixed(1) + '" y2="' + (PAD.t + IH) + '"/>';
    svg += '<circle class="dot" cx="' + x(selected).toFixed(1) + '" cy="' + y(curve[selected]).toFixed(1) + '" r="4.5"/>';

    chart.innerHTML = '<title id="chartTitle">' + plain("bike.curve") + "</title>" + svg;
  }

  function hourFromEvent(e) {
    var r = chart.getBoundingClientRect();
    var px = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width * W;
    return Math.max(0, Math.min(23, Math.round((px - PAD.l) / IW * 23)));
  }

  // ---------------------------------------------------------------- render
  function update() {
    var inp = readInputs();
    renderReadouts(inp);
    curve = BS.dayCurve(inp);
    actual = BS.actualCurve(inp);
    var s = BS.summarise(curve);

    $("tPeak").innerHTML = hhmm(s.peakHour) + ' <small>' + num(s.peakValue) + " " + plain("bike.ridesHour") + "</small>";
    $("tQuiet").innerHTML = hhmm(s.quietHour) + ' <small>' + num(curve[s.quietHour]) + " " + plain("bike.ridesHour") + "</small>";
    $("tTotal").innerHTML = num(s.total) + ' <small>' + plain("bike.rides") + "</small>";
    renderSelection();

    statusEl.textContent = actual
      ? plain("demo.local") + " · " + num(actual.n) + " " + plain("bike.actual.n")
      : plain("bike.actual.none");
    statusEl.className = "status";
    draw();
  }

  function renderSelection() {
    $("tSelK").textContent = plain("bike.selected").replace("{hr}", hhmm(selected));
    $("tSel").innerHTML = num(curve[selected]) + ' <small>' + plain("bike.ridesHour") + "</small>";
  }

  // ---------------------------------------------------------------- boot
  BS.load("").then(function (meta) {
    fillSelects();

    document.getElementById("bikeForm").addEventListener("input", function (e) {
      // Switching season moves the weather sliders to that season's medians,
      // otherwise "winter" keeps August's temperature and reads as nonsense.
      if (e.target.id === "season") {
        var d = meta.season_defaults[$("season").value];
        $("temp").value = d.temp; $("hum").value = d.hum; $("windspeed").value = d.windspeed;
      }
      update();
    });

    var pick = function (e) { selected = hourFromEvent(e); renderSelection(); draw(); };
    chart.addEventListener("click", pick);
    chart.addEventListener("touchstart", pick, { passive: true });
    chart.addEventListener("touchmove", pick, { passive: true });

    document.addEventListener("langchange", function () {
      relabelSelects();
      update();       // tiles, axis numbers and the status line are all built here
    });

    update();
  }).catch(function (err) {
    statusEl.textContent = plain("demo.failed");
    statusEl.className = "status error";
    console.error(err);
  });
})();
