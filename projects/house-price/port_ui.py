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

os.makedirs(os.path.dirname(DST), exist_ok=True)
open(DST, "w").write(html)
print("wrote", DST, "(%.0f KB)" % (len(html) / 1024))
for probe, label in [("HP.load", "meta -> HP.load"),
                     ("HP.predict(S)", "predict -> local"),
                     ("HP.autofill(", "autofill -> local"),
                     ("fetch('/api", "LEFTOVER server call")]:
    print("  %-26s %s" % (label, "yes" if probe in html else "no"))
