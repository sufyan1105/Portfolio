"""Convert the Flask template into a static page for the portfolio.

Three transforms:
  1. Rename the template's design tokens (--bg, --ink, ...) to --hp-* and
     redefine them in terms of the portfolio's tokens, so the page inherits
     light/dark mode and the IBM Plex fonts instead of being dark-only.
  2. Swap the site chrome in: header with back link, language + theme toggles,
     footer with the legal links.
  3. Replace the three server calls with local computation from predict.js.
"""
import re, os

SRC = "/Users/sufyankadiwala/developer/Claude/Portfolio/House Price Prediction/templates/index.html"
DST = "/Users/sufyankadiwala/developer/Claude/Portfolio/projects/house-price/index.html"

html = open(SRC).read()

# ---------------------------------------------------------------- 1. tokens
# longest names first so --bg-2 isn't clobbered by --bg
TOKENS = ["bg-2", "bg", "panel-2", "panel", "stroke-2", "stroke",
          "ink-2", "ink-3", "ink", "teal", "violet", "pink", "amber",
          "rose", "radius", "font", "mono"]
for name in sorted(TOKENS, key=len, reverse=True):
    html = re.sub(r"--" + re.escape(name) + r"\b", "--hp-" + name, html)

NEW_ROOT = """:root{
  color-scheme: dark;
  /* Mapped onto the portfolio's design tokens so this page follows the
     site's light/dark theme instead of being dark-only. */
  --hp-bg: var(--bg);
  --hp-bg-2: var(--bg-alt);
  --hp-panel: var(--card);
  --hp-panel-2: var(--bg-alt);
  --hp-stroke: var(--border);
  --hp-stroke-2: var(--border);
  --hp-ink: var(--text);
  --hp-ink-2: var(--text-muted);
  --hp-ink-3: var(--text-muted);
  --hp-teal: var(--accent);
  --hp-violet:#a78bfa;
  --hp-pink:#f0abfc;
  --hp-amber:#fbbf24;
  --hp-rose:#fb7185;
  --hp-radius: 16px;
  --hp-font:'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  --hp-mono:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace;
}"""
html = re.sub(r":root\{[^}]*\}", NEW_ROOT, html, count=1)

# the template resets every margin; that would fight the shared header/footer
html = html.replace("*{box-sizing:border-box;margin:0;padding:0}",
                    "*{box-sizing:border-box}\nmain,section,div,p,h1,h2,h3,ul,li{margin:0;padding:0}")

# ---------------------------------------------------------------- 2. chrome
HEAD_EXTRA = '''<link rel="stylesheet" href="../../css/style.css" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%230e7c86'/%3E%3Ctext x='50' y='68' font-size='55' font-family='Arial, sans-serif' font-weight='bold' fill='white' text-anchor='middle'%3ESK%3C/text%3E%3C/svg%3E" />
<link rel="canonical" href="https://sufyankadiwala.de/projects/house-price/" />
<meta property="og:type" content="website" />
<meta property="og:title" content="California House Price Estimator — Sufyan Arshad Kadiwala" />
<meta property="og:description" content="A Random Forest with a live map, per-tree uncertainty band and feature contributions — running entirely in your browser." />
<meta property="og:url" content="https://sufyankadiwala.de/projects/house-price/" />
<meta property="og:image" content="https://sufyankadiwala.de/assets/og-image.png" />
<meta name="theme-color" content="#0e7c86" />
<script>
(function () {
  var d = document.documentElement;
  d.classList.add("js");
  // This page's visual design is dark-only (gradients + white overlays), so
  // it pins data-theme="dark" and omits the theme toggle. Every other page
  // still honours the user's stored preference.
  var lang = "en";
  try {
    lang = localStorage.getItem("lang") ||
      ((navigator.language || "en").slice(0, 2).toLowerCase() === "de" ? "de" : "en");
  } catch (e) {}
  d.setAttribute("data-theme", "dark");
  d.setAttribute("data-lang", lang);
  d.setAttribute("lang", lang);
})();
</script>
</head>'''
html = html.replace("</head>", HEAD_EXTRA, 1)

SITE_HEADER = '''<header class="site-header">
  <div class="container nav-inner">
    <a href="../../index.html" class="logo">Sufyan<span>.</span></a>
    <div class="nav-actions">
      <a class="backlink" href="../../projects.html">&larr; <span data-i18n="demo.back">All projects</span></a>
      <div class="lang-switch" role="group" aria-label="Change language" data-i18n-aria="nav.lang">
        <button type="button" data-lang-btn="en" aria-pressed="true">EN</button>
        <button type="button" data-lang-btn="de" aria-pressed="false">DE</button>
      </div>
    </div>
  </div>
</header>
'''
html = html.replace("<body>", "<body>\n" + SITE_HEADER, 1)

SITE_FOOTER = '''<footer class="site-footer">
  <div class="container footer-inner">
    <p>&copy; <span id="year">2026</span> Sufyan Arshad Kadiwala.</p>
    <p class="footer-legal">
      <a href="../../impressum.html" data-i18n="footer.impressum">Impressum</a>
      <span aria-hidden="true">&middot;</span>
      <a href="../../datenschutz.html" data-i18n="footer.datenschutz">Datenschutzerkl&auml;rung</a>
    </p>
  </div>
</footer>
</body>'''
html = html.replace("</body>", SITE_FOOTER, 1)

# ---------------------------------------------------------------- 3. backend
html = html.replace(
    "  META = await (await fetch('/api/meta')).json();",
    "  META = await HP.load('');   // meta.json + forest.json + blocks.json")

OLD_PREDICT = """  try {
    const res = await fetch('/api/predict', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(S)
    });
    d = await res.json();
  } catch (err) {
    document.getElementById('priceSub').textContent = 'Could not reach the model server.';
    return;
  }"""
NEW_PREDICT = """  try {
    d = HP.predict(S);   // was POST /api/predict — now computed locally
  } catch (err) {
    document.getElementById('priceSub').textContent = err.message;
    return;
  }"""
assert OLD_PREDICT in html, "predict call site not found"
html = html.replace(OLD_PREDICT, NEW_PREDICT)

OLD_AUTOFILL = """      const r = await fetch(`/api/autofill?longitude=${S.longitude}&latitude=${S.latitude}`);
      const a = await r.json();"""
NEW_AUTOFILL = """      const a = HP.autofill(S.longitude, S.latitude);   // was GET /api/autofill"""
assert OLD_AUTOFILL in html, "autofill call site not found"
html = html.replace(OLD_AUTOFILL, NEW_AUTOFILL)

# scripts: i18n + shared site behaviour + the local model
html = html.replace(
    "<script>\n/* ═",
    '<script src="../../js/i18n.js"></script>\n'
    '<script src="../../js/script.js"></script>\n'
    '<script src="predict.js"></script>\n'
    "<script>\n/* ═", 1)

# ------------------------------------------------- 4. English -> bilingual
# The template is written in English throughout. Everything a visitor reads
# gets a data-i18n key so applyLang() in js/script.js swaps it, and the strings
# the script writes itself are re-rendered on the `langchange` event.
# Keys live in js/i18n.js under `hp.*`.

MARKUP = [
    # (what the template says, what replaces it)
    ("<title>Estimator — California House Price Prediction</title>",
     '<title data-i18n="hp.title">California House Price Estimator</title>\n'
     '<meta name="description" data-i18n-content="hp.intro"\n'
     '      content="A Random Forest with a live map, a per-tree uncertainty band and '
     'feature contributions - running entirely in your browser.">'),

    ('<span id="ntrees">100</span> trees · <span id="nrows">20,640</span> blocks',
     '<span id="ntrees">100</span> <span data-i18n="hp.eyebrow.trees">trees</span> '
     '&middot; <span id="nrows">20,640</span> <span data-i18n="hp.eyebrow.blocks">blocks</span>'),

    ("<h1>What is this<br>California block worth?</h1>",
     '<h1 data-i18n="hp.h1">What is this<br>California block worth?</h1>'),

    ('<p class="sub">Drop a pin', '<p class="sub" data-i18n="hp.sub">Drop a pin'),
    ('<div class="card-title">Location</div>',
     '<div class="card-title" data-i18n="hp.loc.title">Location</div>'),
    ('<div class="card-note" style="margin-top:4px">Click or drag anywhere on the map</div>',
     '<div class="card-note" style="margin-top:4px" data-i18n="hp.loc.note">Click or drag anywhere on the map</div>'),
    ('<div class="map-hint">3,000 sampled training blocks',
     '<div class="map-hint" data-i18n="hp.map.hint">3,000 sampled training blocks'),
    ('<span class="field-name">Latitude</span>',
     '<span class="field-name" data-i18n="hp.f.latitude">Latitude</span>'),
    ('<span class="field-name">Longitude</span>',
     '<span class="field-name" data-i18n="hp.f.longitude">Longitude</span>'),
    ('<div class="price-label">Estimated median house value</div>',
     '<div class="price-label" data-i18n="hp.price.label">Estimated median house value</div>'),
    ('<div class="price-sub" id="priceSub">Set the inputs to get an estimate</div>',
     '<div class="price-sub" id="priceSub" data-i18n="hp.price.idle">Set the inputs to get an estimate</div>'),
    ('<span id="bandLabel">80% of trees</span>',
     '<span id="bandLabel" data-i18n="hp.band.label">80% of trees</span>'),
    ('<div class="stat-k">Low estimate</div>',
     '<div class="stat-k" data-i18n="hp.stat.low">Low estimate</div>'),
    ('<div class="stat-k">High estimate</div>',
     '<div class="stat-k" data-i18n="hp.stat.high">High estimate</div>'),
    ('<div class="stat-k">Statewide pct.</div>',
     '<div class="stat-k" data-i18n="hp.stat.pct">Statewide pct.</div>'),
    ('<div class="warn" id="warn">', '<div class="warn" id="warn" data-i18n="hp.warn">'),

    ('<div class="stat-k">Reality check · 30 nearest real blocks</div>',
     '<div class="stat-k" data-i18n="hp.truth.k">Reality check &middot; 30 nearest real blocks</div>'),
    ('<div class="truth-note">Actual recorded median value',
     '<div class="truth-note" data-i18n="hp.truth.note">Actual recorded median value'),
    ('<div class="card-title" style="margin-bottom:14px">What is moving this number</div>',
     '<div class="card-title" style="margin-bottom:14px" data-i18n="hp.contrib.title">What is moving this number</div>'),
    ('<div class="card-note" style="margin-top:10px">Each bar:',
     '<div class="card-note" style="margin-top:10px" data-i18n="hp.contrib.note">Each bar:'),
    ('<div class="card-title">Neighbourhood profile</div>',
     '<div class="card-title" data-i18n="hp.ctl.title">Neighbourhood profile</div>'),
    ('<div class="card-note">Every change re-runs the model</div>',
     '<div class="card-note" data-i18n="hp.ctl.note">Every change re-runs the model</div>'),
    ('<span class="field-name">Ocean proximity</span>',
     '<span class="field-name" data-i18n="hp.n.ocean_proximity">Ocean proximity</span>'),
    ('<span class="field-help">The one categorical feature',
     '<span class="field-help" data-i18n="hp.h.ocean_proximity">The one categorical feature'),
    ('<span class="caret">▶</span> Block-level detail',
     '<span class="caret">▶</span> <span data-i18n="hp.adv.title">Block-level detail</span>'),
    ("<span>Auto-fill from the 30 nearest real blocks</span>",
     '<span data-i18n="hp.adv.auto">Auto-fill from the 30 nearest real blocks</span>'),
    ('<div class="card-note" style="margin-bottom:14px;max-width:680px">',
     '<div class="card-note" style="margin-bottom:14px;max-width:680px" data-i18n="hp.adv.body">'),
    ('<button data-m="totals">Block totals</button>',
     '<button data-m="totals" data-i18n="hp.mode.totals">Block totals</button>'),
    ('<button data-m="home">Per home</button>',
     '<button data-m="home" data-i18n="hp.mode.home">Per home</button>'),
    ("<div>California Housing · RandomForestRegressor",
     '<div data-i18n="hp.footer">California Housing &middot; RandomForestRegressor'),
]

# The slider specs carry their label and help text as literals. Swapping them
# for keys lets buildField stamp data-i18n on the spans it generates, which
# means applyLang re-translates them for free on every switch.
SCRIPT = [
    ("{k:'median_income', name:'Median household income', help:'Strongest single predictor in the dataset',",
     "{k:'median_income', key:'median_income',"),
    ("{k:'housing_median_age', name:'Median age of homes', help:'Years since the typical home here was built',",
     "{k:'housing_median_age', key:'housing_median_age',"),
    ("{k:'total_rooms', name:'Total rooms in block', help:'Across every home on the block', step:10, fmt:int}",
     "{k:'total_rooms', key:'total_rooms', step:10, fmt:int}"),
    ("{k:'total_bedrooms', name:'Total bedrooms in block', help:'The only feature with missing values in the raw data', step:5, fmt:int}",
     "{k:'total_bedrooms', key:'total_bedrooms', step:5, fmt:int}"),
    ("{k:'population', name:'Block population', help:'People living in the block', step:10, fmt:int}",
     "{k:'population', key:'population', step:10, fmt:int}"),
    ("{k:'households', name:'Households in block', help:'Occupied dwellings', step:5, fmt:int}",
     "{k:'households', key:'households', step:5, fmt:int}"),

    ("{k:'rooms_per_home', ratio:true, name:'Rooms per home', step:0.1, fmt:v=>v.toFixed(1)+' rooms',",
     "{k:'rooms_per_home', ratio:true, key:'rooms_per_home', step:0.1, fmt:v=>dec(v,1)+' '+t('hp.unit.rooms'),"),
    ("{k:'bedrooms_per_home', ratio:true, name:'Bedrooms per home', step:0.05, fmt:v=>v.toFixed(2)+' beds',",
     "{k:'bedrooms_per_home', ratio:true, key:'bedrooms_per_home', step:0.05, fmt:v=>dec(v,2)+' '+t('hp.unit.beds'),"),
    ("{k:'people_per_home', ratio:true, name:'People per home', step:0.1, fmt:v=>v.toFixed(1)+' people',",
     "{k:'people_per_home', ratio:true, key:'people_per_home', step:0.1, fmt:v=>dec(v,1)+' '+t('hp.unit.people'),"),
    ("{k:'households', scale:true, name:'Homes in the block', step:5, fmt:int,",
     "{k:'households', scale:true, key:'households_scale', step:5, fmt:int,"),

    ("fmt:v=>Math.round(v)+' yrs'}", "fmt:v=>Math.round(v)+' '+t('hp.unit.yrs')}"),

    # the three help: lines that survive the spec rewrites above
    ("   help:'The closest thing to “house size” in this dataset — there is no square footage'},",
     "   },"),
    ("   help:'A block median from census aggregates — it sits near 1.0, not a listing’s bedroom count'},",
     "   },"),
    ("   help:'Household occupancy across the block'},", "   },"),
    ("   help:'Scales the three ratios above into the block totals the model reads'}",
     "   }"),

    # Contribution-bar labels, looked up per render.
    ("""const LABELS = {
  location:'Where it is', median_income:'Median income', housing_median_age:'Home age',
  total_rooms:'Total rooms', total_bedrooms:'Total bedrooms', population:'Population',
  households:'Households', ocean_proximity:'Ocean proximity'
};""",
     """// Looked up through t() on every render so a language switch redraws them.
const label = f => t('hp.l.' + f) || f;

/* Numbers follow the reading language: 450,000 in English, 450.000 in German.
   The dataset is US, so the $ stays put in both. */
const nfLocale = () => (document.documentElement.getAttribute('data-lang') === 'de' ? 'de-DE' : 'en-US');
/* toFixed() always prints a dot. German writes 3,1 rooms, not 3.1. */
const dec = (v, n) => v.toLocaleString(nfLocale(), {minimumFractionDigits:n, maximumFractionDigits:n});"""),

    ("const int   = v => Math.round(v).toLocaleString();",
     "const int   = v => Math.round(v).toLocaleString(nfLocale());"),
    ("const money0 = v => '$' + Math.round(v).toLocaleString();",
     "const money0 = v => '$' + Math.round(v).toLocaleString(nfLocale());"),
    ("const money = v => '$' + Math.round(v).toLocaleString('en-US');",
     "const money = v => '$' + Math.round(v).toLocaleString(nfLocale());"),

    ("<div><span class=\"field-name\">${spec.name}</span><span class=\"field-help\">${spec.help}</span></div>",
     "<div><span class=\"field-name\" data-i18n=\"hp.n.${spec.key}\">${t('hp.n.' + spec.key)}</span>"
     "<span class=\"field-help\" data-i18n=\"hp.h.${spec.key}\">${t('hp.h.' + spec.key)}</span></div>"),

    # A data-i18n-title lets applyLang keep the tooltip in step too.
    ("  out.title = 'Click to type an exact value';",
     "  out.setAttribute('data-i18n-title', 'hp.edit.hint');\n"
     "  out.title = t('hp.edit.hint');"),

    ("""    d.innerHTML = `The model receives <b>${int(S.total_rooms)}</b> rooms, <b>${int(S.total_bedrooms)}</b> bedrooms
      and <b>${int(S.population)}</b> people across <b>${int(S.households)}</b> homes.`;""",
     """    d.innerHTML = t('hp.derived')
      .replace('{rooms}', int(S.total_rooms)).replace('{beds}', int(S.total_bedrooms))
      .replace('{people}', int(S.population)).replace('{homes}', int(S.households));"""),

    ("""  document.getElementById('priceSub').innerHTML =
    `<b>±${moneyK(d.std)}</b> spread across the forest · ${META.n_trees} trees voted`;""",
     """  document.getElementById('priceSub').innerHTML =
    `<b>±${moneyK(d.std)}</b> ${t('hp.spread')} · ${META.n_trees} ${t('hp.voted')}`;"""),

    # English wants 63rd; German writes the ordinal as 63.
    ("""  const suffix = (pct % 10 === 1 && pct !== 11) ? 'st' : (pct % 10 === 2 && pct !== 12) ? 'nd'
               : (pct % 10 === 3 && pct !== 13) ? 'rd' : 'th';
  document.getElementById('sPct').textContent = pct + suffix;""",
     """  const suffix = document.documentElement.getAttribute('data-lang') === 'de' ? '.'
               : (pct % 10 === 1 && pct !== 11) ? 'st' : (pct % 10 === 2 && pct !== 12) ? 'nd'
               : (pct % 10 === 3 && pct !== 13) ? 'rd' : 'th';
  document.getElementById('sPct').textContent = pct + suffix;"""),

    ("""    el.textContent = (gap >= 0 ? '+' : '−') + Math.abs(gap).toFixed(1) + '% vs. estimate';""",
     """    el.textContent = (gap >= 0 ? '+' : '−') + dec(Math.abs(gap), 1) + '% ' + t('hp.truth.delta');"""),

    ("`${Math.abs(S.latitude).toFixed(2)}°N  ${Math.abs(S.longitude).toFixed(2)}°W`;",
     "`${dec(Math.abs(S.latitude), 2)}°N  ${dec(Math.abs(S.longitude), 2)}°W`;"),

    ("  document.getElementById('nrows').textContent = META.n_rows.toLocaleString();",
     "  document.getElementById('nrows').textContent = META.n_rows.toLocaleString(nfLocale());"),

    ("""    <div class="cname">${LABELS[r.feature] || r.feature}</div>""",
     """    <div class="cname">${label(r.feature)}</div>"""),
]

for old, new in MARKUP + SCRIPT:
    assert old in html, "i18n: not found -> " + old[:70]
    html = html.replace(old, new)

# applyLang only touches [data-i18n] nodes. Everything the script prints — the
# spread line, the ordinal, the unit suffixes, the derived sentence — has to be
# redrawn by hand, which is what `langchange` is for.
LANG_HOOK = """
/* ══════════════════════════════════════════════════════════════
   LANGUAGE
   Static text is handled by applyLang() via data-i18n. These are the
   strings this script prints itself, so they need redrawing by hand.
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('langchange', () => {
  if (!META) return;
  document.getElementById('nrows').textContent = META.n_rows.toLocaleString(nfLocale());
  drawPin();     // the coordinate readout uses localised decimals
  renderAll();   // slider readouts carry unit words and localised digits
  predict();     // spread line, ordinal, contribution labels, delta
});
"""
before = html
html = html.replace("\n</script>\n<footer", LANG_HOOK + "</script>\n<footer", 1)
assert html != before, "langchange hook not inserted — script/footer boundary moved"

os.makedirs(os.path.dirname(DST), exist_ok=True)
open(DST, "w").write(html)
print("wrote", DST, "(%.0f KB)" % (len(html) / 1024))
for probe, label in [("HP.load", "meta -> HP.load"),
                     ("HP.predict(S)", "predict -> local"),
                     ("HP.autofill(", "autofill -> local"),
                     ("fetch('/api", "LEFTOVER server call")]:
    print("  %-26s %s" % (label, "yes" if probe in html else "no"))
print("  %-26s %d" % ("data-i18n bindings", html.count("data-i18n")))
