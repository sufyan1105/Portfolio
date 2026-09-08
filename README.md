# Sufyan Arshad Kadiwala — Portfolio

A bilingual (English / German) portfolio site built with plain HTML, CSS and JavaScript.
No frameworks, no dependencies, no build step required to run it.

## Structure

```
index.html          Home (hero, availability, intro, featured projects)
about.html          About (bio, quick facts, skills)
projects.html       All project cards
certificates.html   Verified certificates (grouped programmes + single courses)
contact.html        Email + copy button, social links, availability
css/style.css       All styling (light/dark theme, layout, animations)
js/i18n.js          ALL SITE TEXT — English and German, side by side
js/script.js        Project data + behaviour (language, theme, menu, copy, reveals)
assets/og-image.png Link-preview image (1200×630) — og-image.svg is its source
assets/certificates/  The 20 certificate PDFs the site links to (clean filenames)
certificates/       Your original certificate folder — kept as the source of truth,
                    not served by the site
tools/build_pages.py  Regenerates the 4 HTML files from one shared template
cv.pdf              ← drop your CV here; the "CV" button already points to it
```

## Editing content

**All visible text lives in `js/i18n.js`**, not in the HTML. Each string has an English and a
German version under the same key, and the HTML references it as `data-i18n="that.key"`.
To change a heading, edit both languages in that one file.

- **Projects**: edit the `projects` array at the top of `js/script.js`. Each project needs
  `icon`, `title: {en, de}`, `desc: {en, de}`, `tags`, and a `code` link. Add `demo` for a
  second button, and `featured: true` to also show it on the home page.
- **Email**: set the `EMAIL` constant at the top of `js/script.js` — it fills in every mailto
  link, the displayed address and the copy button automatically.
- **CV**: add `cv.pdf` to this folder. Until you do, that button 404s. The label says "CV"
  in English and "Lebenslauf" in German — both are the normal terms in Germany.
- **Photo**: the avatar uses `assets/profile.jpg` (800×800, cropped to head-and-shoulders).
  `assets/sufyan image.png` is the untouched original it was made from. To re-crop, edit the
  crop box and re-run the one-liner in "Regenerating the photo" below. If `profile.jpg` is ever
  missing the avatar falls back to the "SK" initials, so nothing breaks.

### Regenerating the photo

```bash
python3 -c "
from PIL import Image
im = Image.open('assets/sufyan image.png').convert('RGB')
im.crop((120,30,904,814)).resize((800,800), Image.LANCZOS).save(
    'assets/profile.jpg','JPEG',quality=90,optimize=True,progressive=True)"
```
- **Experience**: edit the `experience` array in `js/script.js` (newest first). `kind` is an
  i18n key naming what the role actually was (`exp.kind.internship`, `exp.kind.simulation`) and
  renders as the pill — keep it accurate.
- **Education**: edit the `education` array in `js/script.js` (newest first).
  `current: true` draws the accent dot and the "in progress" pill.
- **Skills**: edit the `skills` array in `js/script.js`. A tag is either a plain string (same
  in both languages) or `{en, de}`. `evidence` points at the i18n key naming the certificate
  that backs the group — it renders as the badge that links to the certificates page.
- **Certificates**: edit the `certificates` array in `js/script.js`. A certificate with a
  `courses` array and `program: true` renders as an expandable programme card; without it,
  as a single card. Course titles stay in English in both languages — that's how they appear
  on the certificate and on a German CV. Put the PDF in `assets/certificates/` and point
  `file` at it; `verify` is the official verification URL.

### After editing the HTML structure

The four pages share one header, footer and `<head>`. Don't edit those in four places —
edit `tools/build_pages.py` and run:

```bash
python3 tools/build_pages.py
```

That rewrites all four `.html` files. It also stamps a content hash onto the CSS/JS URLs
(`style.css?v=…`) so returning visitors never get a stale cached copy. The generated HTML is
plain and standalone — the script is only a convenience, not a required build step.

## Before going live

1. **Add `cv.pdf`.**
2. **Set the real domain** — `SITE_URL` at the top of `tools/build_pages.py` is currently the
   placeholder `https://sufyankadiwala.de`. Change it and re-run the script so the canonical
   and link-preview URLs are correct.
3. Test the link preview at [opengraph.xyz](https://www.opengraph.xyz/) once it's live.

## Running locally

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173. (Opening the `.html` files directly with `file://` also
works, but the copy-to-clipboard button needs `http://` or `https://`.)

## Hosting free with GitHub Pages

1. Create a GitHub repo (`sufyan1105.github.io` for a root-domain site, or any name for a
   project site).
2. Push this folder:
   ```bash
   git init && git add . && git commit -m "Portfolio"
   git branch -M main
   git remote add origin https://github.com/sufyan1105/<repo-name>.git
   git push -u origin main
   ```
3. Repo → **Settings → Pages → Deploy from a branch → `main` / root** → Save.

## Still to do

- Add measurable results to each project (metric, baseline, what was hard) — currently the
  cards say what was built, not how well it worked.
- Add a screenshot or result chart per project; `assets/` only holds the link-preview image.
