#!/usr/bin/env python3
"""
Regenerates the four HTML pages from one shared shell.

The generated .html files are plain, standalone HTML — this script is only a
convenience so the header/footer/meta don't have to be edited four times.
Run it after changing anything in SHELL / the PAGES bodies below:

    python3 tools/build_pages.py
"""
import os, hashlib

# ---- Update this once the custom domain is live -----------------------------
SITE_URL = "https://sufyankadiwala.de"

FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E"
           "%3Crect width='100' height='100' rx='20' fill='%230e7c86'/%3E%3Ctext x='50' y='68' "
           "font-size='55' font-family='Arial, sans-serif' font-weight='bold' fill='white' "
           "text-anchor='middle'%3ESK%3C/text%3E%3C/svg%3E")

GITHUB = "https://github.com/sufyan1105"
LINKEDIN = "https://www.linkedin.com/in/sufyan-arshad-kadiwala-a35717290/"

ICON_GITHUB = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.1 3.29 9.4 7.86 10.94.57.1.78-.25.78-.55v-1.94c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.78 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.58.24 2.75.12 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.08.78 2.18v3.23c0 .3.2.66.79.55A10.51 10.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z"/></svg>'
ICON_LINKEDIN = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.56V9h3.56v11.45Z"/></svg>'
ICON_MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2.5 5.5h19v13h-19z"/><path d="m3 6 9 7 9-7"/></svg>'

SHELL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title data-i18n="meta.title.{page}">{title_en}</title>
<meta name="description" data-i18n-content="meta.desc.{page}" content="{desc_en}" />
<link rel="canonical" href="{site}/{file}" />

<!-- Link previews (LinkedIn, WhatsApp, Slack, email clients) -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Sufyan Arshad Kadiwala" />
<meta property="og:locale" content="en_GB" />
<meta property="og:locale:alternate" content="de_DE" />
<meta property="og:title" content="{title_en}" />
<meta property="og:description" content="{desc_en}" />
<meta property="og:url" content="{site}/{file}" />
<meta property="og:image" content="{site}/assets/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Sufyan Arshad Kadiwala — AI &amp; Robotics Master's student, open to Werkstudent roles" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title_en}" />
<meta name="twitter:description" content="{desc_en}" />
<meta name="twitter:image" content="{site}/assets/og-image.png" />
<meta name="theme-color" content="#0e7c86" />

<link rel="icon" href="{favicon}" />

<!-- Fonts are self-hosted in assets/fonts (see css/style.css) - no request leaves this origin -->
<link rel="stylesheet" href="css/style.css?v={v_css}" />

<!-- Set theme + language before first paint so there is no flash -->
<script>
(function () {{
  var d = document.documentElement;
  d.classList.add("js");
  var theme = "light", lang = "en";
  try {{
    theme = localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    lang = localStorage.getItem("lang") ||
      ((navigator.language || "en").slice(0, 2).toLowerCase() === "de" ? "de" : "en");
  }} catch (e) {{}}
  d.setAttribute("data-theme", theme);
  d.setAttribute("data-lang", lang);
  d.setAttribute("lang", lang);
}})();
</script>
</head>
<body data-current="{page}">

<a class="skip-link" href="#main" data-i18n="nav.skip">Skip to content</a>

<header class="site-header">
  <div class="container nav-inner">
    <a href="index.html" class="logo">Sufyan<span>.</span></a>

    <nav class="nav-links" id="navLinks" aria-label="Main">
      <a href="index.html" data-page="index" data-i18n="nav.home">Home</a>
      <a href="about.html" data-page="about" data-i18n="nav.about">About</a>
      <a href="projects.html" data-page="projects" data-i18n="nav.projects">Projects</a>
      <a href="certificates.html" data-page="certificates" data-i18n="nav.certificates">Certificates</a>
      <a href="contact.html" data-page="contact" data-i18n="nav.contact">Contact</a>
    </nav>

    <div class="nav-actions">
      <div class="lang-switch" role="group" aria-label="Change language" data-i18n-aria="nav.lang">
        <button type="button" data-lang-btn="en" aria-pressed="true">EN</button>
        <button type="button" data-lang-btn="de" aria-pressed="false">DE</button>
      </div>

      <button id="themeToggle" class="icon-btn" aria-label="Toggle dark mode" data-i18n-aria="nav.theme" data-i18n-title="nav.theme" title="Toggle dark mode">
        <svg class="icon icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
        <svg class="icon icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>

      <button id="menuToggle" class="icon-btn menu-toggle" aria-label="Open menu" data-i18n-aria="nav.menu.open" aria-expanded="false" aria-controls="navLinks">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>

<main id="main">
{body}
</main>

<footer class="site-footer">
  <div class="container footer-inner">
    <p>&copy; <span id="year">2026</span> Sufyan Arshad Kadiwala. <span data-i18n="footer.text">Built with HTML, CSS &amp; JavaScript.</span></p>
    <p class="footer-legal">
      <a href="impressum.html" data-i18n="footer.impressum">Impressum</a>
      <span aria-hidden="true">&middot;</span>
      <a href="datenschutz.html" data-i18n="footer.datenschutz">Datenschutzerkl&auml;rung</a>
    </p>
  </div>
</footer>

<script src="js/i18n.js?v={v_i18n}"></script>
<script src="js/script.js?v={v_script}"></script>
</body>
</html>
"""

# --------------------------------------------------------------------------
AVAILABILITY = """
  <!-- AVAILABILITY -->
  <section class="section section-alt" id="availability">
    <div class="container">
      <div class="avail-head">
        <div>
          <p class="section-eyebrow" data-i18n="avail.eyebrow">Availability</p>
          <h2 class="section-title" data-i18n="avail.title">Open to work — right now</h2>
        </div>
        <span class="status-dot" data-i18n="avail.start.value">Immediately</span>
      </div>

      <div class="avail-grid">
        <div class="avail-card reveal">
          <p class="label" data-i18n="avail.hours.label">Hours</p>
          <p class="value" data-i18n="avail.hours.value">20 h / week</p>
          <p class="note" data-i18n="avail.hours.note">During the semester, as permitted by my student visa. Full-time during semester breaks.</p>
        </div>
        <div class="avail-card reveal">
          <p class="label" data-i18n="avail.roles.label">Looking for</p>
          <p class="value" data-i18n="avail.roles.value">Werkstudent &middot; Internship</p>
          <p class="note" data-i18n="avail.roles.note">Data Science, Machine Learning, AI — remote or hybrid.</p>
        </div>
        <div class="avail-card reveal">
          <p class="label" data-i18n="avail.location.label">Based in</p>
          <p class="value" data-i18n="avail.location.value">Hof, Bavaria</p>
          <p class="note" data-i18n="avail.location.note">Remote or hybrid suits me best from Hof, and I&#39;m happy to travel for on-site days.</p>
        </div>
        <div class="avail-card reveal">
          <p class="label" data-i18n="avail.lang.label">Languages</p>
          <p class="value" data-i18n="avail.lang.value">German B1 &middot; English C1</p>
          <p class="note" data-i18n="avail.lang.note">Actively improving my German — happy to hold the interview in German.</p>
        </div>
        <div class="avail-card reveal">
          <p class="label" data-i18n="avail.start.label">Start date</p>
          <p class="value" data-i18n="avail.start.value">Immediately</p>
          <p class="note" data-i18n="avail.start.note">Notice period: none. I can start as soon as you need me.</p>
        </div>
      </div>

      <div class="avail-footer">
        <a href="contact.html" class="btn btn-primary" data-i18n="avail.cta">Get in touch &rarr;</a>
      </div>
    </div>
  </section>
"""

INDEX_BODY = """
  <!-- HERO -->
  <section class="hero">
    <div class="aurora-bg" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="container hero-anim hero-inner">
      <p class="eyebrow" data-i18n="hero.eyebrow">Hi, I'm</p>
      <h1 class="hero-title" data-i18n="hero.title">Sufyan Arshad Kadiwala</h1>
      <p class="hero-subtitle" data-i18n="hero.subtitle">Master's Student in <strong>AI &amp; Robotics</strong> &middot; Data Science &amp; Machine Learning</p>
      <p class="hero-desc" data-i18n="hero.desc">
        I build practical machine learning projects — from regression &amp; classification models
        to small AI-powered web apps. Currently studying at Hof University of Applied Sciences, Germany,
        and looking for a <strong>Werkstudent</strong> position, an internship, or remote data science work.
      </p>

      <div class="hero-actions">
        <a href="projects.html" class="btn btn-primary" data-i18n="hero.cta.projects">View Projects</a>
        <a href="about.html" class="btn btn-ghost" data-i18n="hero.cta.about">About Me</a>
        <a href="cv.pdf" class="btn btn-ghost btn-resume" data-i18n="hero.cta.resume">CV &darr;</a>
      </div>

      <div class="hero-socials">
        <a href="__GITHUB__" target="_blank" rel="noopener" aria-label="GitHub profile" data-i18n-aria="hero.social.github">__ICON_GH__</a>
        <a href="__LINKEDIN__" target="_blank" rel="noopener" aria-label="LinkedIn profile" data-i18n-aria="hero.social.linkedin">__ICON_LI__</a>
        <a href="mailto:kadiwalasufyan03@gmail.com" data-email-link aria-label="Send email" data-i18n-aria="hero.social.email">__ICON_MAIL__</a>
      </div>
    </div>
  </section>
""" + AVAILABILITY + """
  <!-- INTRO TEASER -->
  <section class="section" id="intro">
    <div class="container about-grid">
      <div class="avatar-wrap reveal">
        <div class="avatar no-photo">
          <img src="assets/profile.jpg" alt="Sufyan Arshad Kadiwala" data-i18n-alt="about.photo.alt" width="150" height="150" />
          <span class="avatar-initials" aria-hidden="true">SK</span>
        </div>
      </div>

      <div class="reveal">
        <p class="section-eyebrow" data-i18n="intro.eyebrow">About</p>
        <h2 class="section-title" data-i18n="intro.title">Quick intro</h2>
        <p class="about-text" data-i18n="intro.text">
          I'm a Master's student in <strong>AI &amp; Robotics</strong> at Hof University of Applied Sciences, Germany,
          building on a Bachelor's degree in AI &amp; Data Science. I like turning raw data into working
          models — and working models into things people can actually click on and use.
        </p>
        <div class="intro-actions">
          <a href="about.html" class="btn btn-ghost" data-i18n="intro.cta">More about me &rarr;</a>
        </div>
      </div>
    </div>
  </section>

  <!-- FEATURED PROJECTS -->
  <section class="section section-alt" id="featured">
    <div class="container">
      <p class="section-eyebrow" data-i18n="featured.eyebrow">Selected Work</p>
      <h2 class="section-title" data-i18n="featured.title">A few things I've built</h2>
      <p class="section-intro" data-i18n="featured.intro">A quick sample of my machine learning and web projects.</p>

      <noscript><p class="nojs-note" data-i18n="footer.nojs">This site needs JavaScript for the language toggle and the project list. Everything else works without it.</p></noscript>
      <div class="project-grid" id="featuredGrid"></div>

      <div class="section-footer-link">
        <a href="projects.html" class="btn btn-ghost" data-i18n="featured.cta">View All Projects &rarr;</a>
      </div>
    </div>
  </section>
"""

ABOUT_BODY = """
  <section class="section page-hero">
    <div class="aurora-bg" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="container hero-anim">
      <p class="section-eyebrow" data-i18n="about.eyebrow">About</p>
      <h1 class="section-title" data-i18n="about.title">About Me</h1>
    </div>
  </section>

  <section class="section">
    <div class="container about-grid">
      <div class="avatar-wrap reveal">
        <div class="avatar no-photo">
          <img src="assets/profile.jpg" alt="Sufyan Arshad Kadiwala" data-i18n-alt="about.photo.alt" width="150" height="150" />
          <span class="avatar-initials" aria-hidden="true">SK</span>
        </div>
      </div>

      <div class="reveal">
        <p class="about-text" data-i18n="about.text">
          I'm a Master's student in <strong>AI &amp; Robotics</strong> at Hof University of Applied Sciences, Germany,
          building on a Bachelor's degree in AI &amp; Data Science. I like turning raw data into working
          models — and working models into things people can actually click on and use. My projects range
          from classic regression &amp; classification work in scikit-learn to small full-stack apps that
          wrap machine learning behind a simple web interface.
        </p>
        <ul class="quick-facts">
          <li><span aria-hidden="true">&#127891;</span> <span data-i18n="about.fact.study">MSc AI &amp; Robotics, Hof University of Applied Sciences (in progress)</span></li>
          <li><span aria-hidden="true">&#128205;</span> <span data-i18n="about.fact.location">Hof, Germany</span></li>
          <li><span aria-hidden="true">&#128188;</span> <span data-i18n="about.fact.open">Open to Werkstudent, internship &amp; Data Science roles — remote or hybrid</span></li>
          <li><span aria-hidden="true">&#9203;</span> <span data-i18n="about.fact.hours">Available 20 h/week during the semester, full-time during breaks</span></li>
          <li><span aria-hidden="true">&#128172;</span> <span data-i18n="about.fact.lang">German B1 (and improving) &middot; English C1</span></li>
        </ul>
      </div>
    </div>
  </section>

  <section class="section section-alt" id="experience">
    <div class="container">
      <p class="section-eyebrow" data-i18n="exp.eyebrow">Experience</p>
      <h2 class="section-title" data-i18n="exp.title">Internships &amp; practical work</h2>
      <noscript><p class="nojs-note" data-i18n="footer.nojs">This site needs JavaScript for the language toggle and the project list. Everything else works without it.</p></noscript>
      <ol class="timeline" id="experienceList"></ol>
    </div>
  </section>

  <section class="section" id="education">
    <div class="container">
      <p class="section-eyebrow" data-i18n="edu.eyebrow">Education</p>
      <h2 class="section-title" data-i18n="edu.title">Where I studied</h2>
      <ol class="timeline" id="educationList"></ol>
    </div>
  </section>

  <section class="section section-alt" id="skills">
    <div class="container">
      <p class="section-eyebrow" data-i18n="skills.eyebrow">Skills</p>
      <h2 class="section-title" data-i18n="skills.title">What I work with</h2>
      <p class="section-intro" data-i18n="skills.intro">Most of this is backed by a certificate — the badge under each group links to the proof.</p>

      <div class="skills-grid" id="skillsGrid"></div>
    </div>
  </section>

  <section class="section" id="certs-teaser">
    <div class="container">
      <p class="section-eyebrow" data-i18n="certs.eyebrow">Certifications</p>
      <h2 class="section-title" data-i18n="about.certs.title">Certifications</h2>
      <p class="section-intro" data-i18n="about.certs.text">16 verified certificates, including the <strong>Google Advanced Data Analytics</strong> Professional Certificate (7 courses) and the <strong>Machine Learning Specialization</strong> from DeepLearning.AI &amp; Stanford University (3 courses).</p>
      <a href="certificates.html" class="btn btn-ghost" data-i18n="certs.cta">See all certificates &rarr;</a>
    </div>
  </section>
"""

PROJECTS_BODY = """
  <section class="section page-hero">
    <div class="aurora-bg" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="container hero-anim">
      <p class="section-eyebrow" data-i18n="projects.eyebrow">Projects</p>
      <h1 class="section-title" data-i18n="projects.title">Things I've Built</h1>
      <p class="section-intro" data-i18n="projects.intro">A mix of machine learning projects and small web apps. Click a card to view the code — some link to a runnable notebook too.</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <noscript><p class="nojs-note" data-i18n="footer.nojs">This site needs JavaScript for the language toggle and the project list. Everything else works without it.</p></noscript>
      <div class="project-grid" id="projectGrid"></div>
    </div>
  </section>
"""

CONTACT_BODY = """
  <section class="section page-hero">
    <div class="aurora-bg" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="container hero-anim">
      <p class="section-eyebrow" data-i18n="contact.eyebrow">Contact</p>
      <h1 class="section-title" data-i18n="contact.title">Let's Talk</h1>
      <p class="section-intro" data-i18n="contact.intro">I'm actively looking for Werkstudent, internship and remote Data Science opportunities — feel free to reach out in English or German.</p>
    </div>
  </section>

  <section class="section">
    <div class="container">

      <div class="contact-email reveal">
        <span class="addr" data-email-text>kadiwalasufyan03@gmail.com</span>
        <button type="button" class="copy-btn" data-copy-email aria-label="Copy email address" data-i18n-aria="contact.copy">
          <svg class="icon-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <svg class="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m4 12 5 5L20 6"/></svg>
          <span data-copy-label data-i18n="contact.copy">Copy email address</span>
        </button>
      </div>
      <p class="contact-hint" data-i18n="contact.hint">Prefer email? Click the address above to copy it — no mail app required.</p>

      <div class="contact-grid">
        <a class="contact-card reveal" href="mailto:kadiwalasufyan03@gmail.com" data-email-link>
          __ICON_MAIL__
          <span data-i18n="contact.email">Email</span>
        </a>
        <a class="contact-card reveal" href="__GITHUB__" target="_blank" rel="noopener">
          __ICON_GH__
          <span data-i18n="contact.github">GitHub</span>
        </a>
        <a class="contact-card reveal" href="__LINKEDIN__" target="_blank" rel="noopener">
          __ICON_LI__
          <span data-i18n="contact.linkedin">LinkedIn</span>
        </a>
      </div>
    </div>
  </section>
""" + AVAILABILITY


CERTIFICATES_BODY = """
  <section class="section page-hero">
    <div class="aurora-bg" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="container hero-anim">
      <p class="section-eyebrow" data-i18n="certs.eyebrow">Certifications</p>
      <h1 class="section-title" data-i18n="certs.title">Verified Credentials</h1>
      <p class="section-intro" data-i18n="certs.intro">Every certificate below links to its official verification page and to the PDF itself — nothing here has to be taken on trust.</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <h2 class="section-title" data-i18n="certs.programs">Professional programmes</h2>
      <p class="section-intro" data-i18n="certs.programs.note">Multi-course programmes. Expand one to see the individual courses it contains.</p>
      <noscript><p class="nojs-note" data-i18n="footer.nojs">This site needs JavaScript for the language toggle and the project list. Everything else works without it.</p></noscript>
      <div class="cert-program-list" id="certPrograms"></div>
    </div>
  </section>

  <section class="section section-alt">
    <div class="container">
      <h2 class="section-title" data-i18n="certs.other">Individual courses</h2>
      <div class="cert-grid" id="certOthers"></div>
    </div>
  </section>
"""


IMPRESSUM_BODY = """
  <section class="section page-hero">
    <div class="aurora-bg" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="container hero-anim">
      <p class="section-eyebrow" data-i18n="imp.eyebrow">Legal notice</p>
      <h1 class="section-title" data-i18n="imp.title">Impressum</h1>
    </div>
  </section>

  <section class="section">
    <div class="container legal">
      <h2 data-i18n="imp.h.provider">Angaben gem&auml;&szlig; &sect; 5 DDG</h2>
      <p>
        Sufyan Arshad Kadiwala<br />
        Alsenberger Stra&szlig;e 53<br />
        95028 Hof<br />
        Deutschland
      </p>

      <h2 data-i18n="imp.h.contact">Kontakt</h2>
      <p>
        E-Mail: <a href="mailto:kadiwalasufyan03@gmail.com" data-email-link><span data-email-text>kadiwalasufyan03@gmail.com</span></a><br />
        Telefon: +49 176 28266324
      </p>

      <h2 data-i18n="imp.h.responsible">Verantwortlich f&uuml;r den Inhalt nach &sect; 18 Abs. 2 MStV</h2>
      <p data-i18n="imp.responsible.body">Sufyan Arshad Kadiwala, Anschrift wie oben.</p>

      <h2 data-i18n="imp.h.liability">Haftung f&uuml;r Inhalte</h2>
      <p data-i18n="imp.liability.body">&hellip;</p>

      <h2 data-i18n="imp.h.links">Haftung f&uuml;r Links</h2>
      <p data-i18n="imp.links.body">&hellip;</p>

      <h2 data-i18n="imp.h.copyright">Urheberrecht</h2>
      <p data-i18n="imp.copyright.body">&hellip;</p>
    </div>
  </section>
"""


DATENSCHUTZ_BODY = """
  <section class="section page-hero">
    <div class="aurora-bg" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="container hero-anim">
      <p class="section-eyebrow" data-i18n="ds.eyebrow">Datenschutz</p>
      <h1 class="section-title" data-i18n="ds.title">Datenschutzerkl&auml;rung</h1>
    </div>
  </section>

  <section class="section">
    <div class="container legal">
      <h2 data-i18n="ds.h.controller">Verantwortlicher</h2>
      <p data-i18n="ds.controller.body">&hellip;</p>

      <h2 data-i18n="ds.h.hosting">Hosting und Server-Logfiles</h2>
      <p data-i18n="ds.hosting.body">&hellip;</p>

      <h2 data-i18n="ds.h.cookies">Cookies, Analyse und Tracking</h2>
      <p data-i18n="ds.cookies.body">&hellip;</p>

      <h2 data-i18n="ds.h.fonts">Schriftarten</h2>
      <p data-i18n="ds.fonts.body">&hellip;</p>

      <h2 data-i18n="ds.h.contact">Kontaktaufnahme per E-Mail</h2>
      <p data-i18n="ds.contact.body">&hellip;</p>

      <h2 data-i18n="ds.h.links">Externe Links</h2>
      <p data-i18n="ds.links.body">&hellip;</p>

      <h2 data-i18n="ds.h.ssl">SSL-/TLS-Verschl&uuml;sselung</h2>
      <p data-i18n="ds.ssl.body">&hellip;</p>

      <h2 data-i18n="ds.h.rights">Ihre Rechte</h2>
      <p data-i18n="ds.rights.body">&hellip;</p>
    </div>
  </section>
"""

PAGES = {
    "index": ("index.html", INDEX_BODY,
              "Sufyan Arshad Kadiwala — Data Science &amp; ML Portfolio",
              "Portfolio of Sufyan Arshad Kadiwala — Master's student in AI &amp; Robotics, showcasing data science and machine learning projects. Available as a Werkstudent, 20 h/week, remote or hybrid."),
    "about": ("about.html", ABOUT_BODY,
              "About — Sufyan Arshad Kadiwala",
              "About Sufyan Arshad Kadiwala — Master's student in AI &amp; Robotics in Hof, Germany. Skills, background and availability."),
    "projects": ("projects.html", PROJECTS_BODY,
                 "Projects — Sufyan Arshad Kadiwala",
                 "Data science and machine learning projects by Sufyan Arshad Kadiwala."),
    "certificates": ("certificates.html", CERTIFICATES_BODY,
                     "Certificates — Sufyan Arshad Kadiwala",
                     "Verified certificates held by Sufyan Arshad Kadiwala, including the Google Advanced Data Analytics Professional Certificate and the DeepLearning.AI &amp; Stanford Machine Learning Specialization."),
    "impressum": ("impressum.html", IMPRESSUM_BODY,
                  "Impressum — Sufyan Arshad Kadiwala",
                  "Impressum gem&auml;&szlig; § 5 DDG."),
    "datenschutz": ("datenschutz.html", DATENSCHUTZ_BODY,
                    "Datenschutzerkl&auml;rung — Sufyan Arshad Kadiwala",
                    "Datenschutzerkl&auml;rung f&uuml;r sufyankadiwala.de gem&auml;&szlig; DSGVO."),
    "contact": ("contact.html", CONTACT_BODY,
                "Contact — Sufyan Arshad Kadiwala",
                "Get in touch with Sufyan Arshad Kadiwala — open to Werkstudent and internship roles in Germany."),
}

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def asset_version(relpath):
    """Short content hash, appended to css/js URLs so browsers never serve a
    stale copy after an update."""
    with open(os.path.join(root, relpath), "rb") as fh:
        return hashlib.sha1(fh.read()).hexdigest()[:8]


V = {
    "v_css": asset_version("css/style.css"),
    "v_i18n": asset_version("js/i18n.js"),
    "v_script": asset_version("js/script.js"),
}


for page, (fname, body, title, desc) in PAGES.items():
    body = (body
            .replace("__GITHUB__", GITHUB)
            .replace("__LINKEDIN__", LINKEDIN)
            .replace("__ICON_GH__", ICON_GITHUB)
            .replace("__ICON_LI__", ICON_LINKEDIN)
            .replace("__ICON_MAIL__", ICON_MAIL))
    html = SHELL.format(page=page, file=fname, site=SITE_URL, favicon=FAVICON,
                        title_en=title, desc_en=desc, body=body, **V)
    with open(os.path.join(root, fname), "w") as fh:
        fh.write(html)
    print("wrote", fname)
