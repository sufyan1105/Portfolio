// ---------- Config ----------
const EMAIL = "kadiwalasufyan03@gmail.com";

// Pick the current language out of an {en, de} field. Missing field -> "".
function pick(v) {
  return v ? v[currentLang()] || v.en : "";
}

// Render `items` into #id with `fn`; pages without that element are skipped.
function render(id, items, fn) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = items.map(fn).join("");
}

/* ------------------------------------------------------------
   Projects
   Each project has an English and a German title + description.
   Tags stay the same in both languages (they're tool names).
   Add `featured: true` to also show it on the home page.
   ------------------------------------------------------------ */
const projects = [
  {
    icon: "🤖",
    title: {
      en: "RAG-based AI Teaching Assistant",
      de: "KI-Lernassistent auf RAG-Basis",
    },
    desc: {
      en: "A retrieval-augmented generation system for course videos — transcribes lectures into timestamped chunks, embeds them locally, and lets students ask questions that get answered with exact video timestamps as grounding context.",
      de: "Ein RAG-System (Retrieval-Augmented Generation) für Lehrvideos: Es transkribiert Vorlesungen in Abschnitte mit Zeitstempeln, erzeugt daraus lokal Embeddings und beantwortet Fragen von Studierenden mit dem genauen Zeitstempel im Video als Beleg.",
    },
    tags: ["Python", "RAG", "Ollama", "Llama 3.2", "Embeddings"],
    code: "https://github.com/sufyan1105/RAG-based-AI-Teaching-Assistant",
    featured: true,
  },
  {
    icon: "🏠",
    title: {
      en: "House Price Prediction",
      de: "Immobilienpreis-Vorhersage",
    },
    desc: {
      en: "End-to-end pipeline on the California Housing dataset, shipped as a live Flask estimator with an interactive map. Random Forest reached $49,432 ± 2,125 RMSE under 10-fold cross-validation — about 29 % below both the linear and decision-tree baselines.",
      de: "Durchgängige Pipeline auf dem California-Housing-Datensatz, ausgeliefert als Flask-Anwendung mit interaktiver Karte. Random Forest erreichte 49.432 ± 2.125 $ RMSE bei 10-facher Kreuzvalidierung — rund 29 % unter den Baselines aus linearer Regression und Entscheidungsbaum.",
    },
    tags: ["Python", "Scikit-learn", "Random Forest", "Flask", "Cross-Validation"],
    code: "https://github.com/sufyan1105/House-Price-Prediction",
  },
  {
    icon: "🚗",
    title: {
      en: "Used Car Price Prediction",
      de: "Gebrauchtwagenpreis-Vorhersage",
    },
    desc: {
      en: "Regression on 15,411 CarDekho listings predicting used-car selling price. Random Forest reached R² 0.9333 on the held-out test set (0.9262 ± 0.0105 cross-validated), beating the linear baseline by nine R² points.",
      de: "Regression auf 15.411 CarDekho-Inseraten zur Vorhersage von Gebrauchtwagenpreisen. Random Forest erreichte R² 0,9333 auf dem Test-Set (0,9262 ± 0,0105 kreuzvalidiert) und übertraf die lineare Baseline um neun R²-Punkte.",
    },
    tags: ["Python", "Scikit-learn", "Random Forest", "Feature Engineering"],
    code: "https://github.com/sufyan1105/Used-Car-Price-Prediction",
    live: "projects/used-car-price/",
    featured: true,
  },
  {
    icon: "🏥",
    title: {
      en: "Medical Insurance Cost Prediction",
      de: "Vorhersage von Krankenversicherungskosten",
    },
    desc: {
      en: "Predicting annual insurance charges from six demographic and health attributes. A single engineered BMI × smoker interaction accounts for 84 % of the Random Forest's predictive work; best cross-validated R² 0.857, MAE $2,417.",
      de: "Vorhersage jährlicher Versicherungskosten aus sechs demografischen und gesundheitlichen Merkmalen. Ein einziges konstruiertes BMI-×-Raucher-Merkmal erklärt 84 % der Vorhersageleistung des Random Forest; bestes kreuzvalidiertes R² 0,857, MAE 2.417 $.",
    },
    tags: ["Python", "Scikit-learn", "Regression", "Feature Engineering"],
    code: "https://github.com/sufyan1105/Medical-Insurance-Cost-Prediction",
    featured: true,
  },
  {
    icon: "🚲",
    title: {
      en: "Bike Sharing Demand Prediction",
      de: "Nachfragevorhersage für Bike-Sharing",
    },
    desc: {
      en: "Demand forecasting on the bike-sharing dataset (hourly and daily records), predicting rental counts from weather and calendar features.",
      de: "Nachfrageprognose auf dem Bike-Sharing-Datensatz (Stunden- und Tagesdaten): Vorhersage der Ausleihzahlen aus Wetter- und Kalendermerkmalen.",
    },
    tags: ["Python", "Regression", "EDA", "Time Series"],
    code: "https://github.com/sufyan1105/Bike-sharing-demand-prediction",
  },
  {
    icon: "🔢",
    title: {
      en: "Neural Network on MNIST",
      de: "Neuronales Netz auf MNIST",
    },
    desc: {
      en: "Neural network trained on the MNIST handwritten-digit dataset, reaching 90.8 % test accuracy over five epochs, with a companion notebook for visualising the data.",
      de: "Neuronales Netz auf dem MNIST-Datensatz handgeschriebener Ziffern, das über fünf Epochen 90,8 % Testgenauigkeit erreicht, mit einem zusätzlichen Notebook zur Visualisierung der Daten.",
    },
    tags: ["Python", "TensorFlow / Keras", "Neural Networks", "Deep Learning"],
    code: "https://github.com/sufyan1105/Training-Neural-Network-on-MNIST-",
  },
  {
    icon: "🍷",
    title: {
      en: "Wine Quality Prediction",
      de: "Vorhersage der Weinqualität",
    },
    desc: {
      en: "Predicting wine quality from physicochemical properties, comparing seven classifiers. Random Forest came out best at 89.4 % accuracy, just ahead of XGBoost (89.2 %) and well clear of Naive Bayes (83.3 %).",
      de: "Vorhersage der Weinqualität anhand physikalisch-chemischer Eigenschaften im Vergleich von sieben Klassifikatoren. Random Forest schnitt mit 89,4 % Genauigkeit am besten ab, knapp vor XGBoost (89,2 %) und deutlich vor Naive Bayes (83,3 %).",
    },
    tags: ["Python", "Scikit-learn", "Classification", "XGBoost", "Random Forest"],
    code: "https://github.com/sufyan1105/Wine-quality-prediction",
  },
  {
    icon: "⛽",
    title: {
      en: "Mileage Prediction",
      de: "Kraftstoffverbrauch-Vorhersage",
    },
    desc: {
      en: "Regression analysis estimating vehicle fuel efficiency (mpg) through exploratory data analysis and model building.",
      de: "Regressionsanalyse zur Schätzung der Kraftstoffeffizienz von Fahrzeugen (mpg) mittels explorativer Datenanalyse und Modellbildung.",
    },
    tags: ["Python", "Regression", "EDA"],
    code: "https://github.com/sufyan1105/Mileage-prediction",
    demo: "https://colab.research.google.com/drive/1V4GpHraG39H_eHFv6jozhESk_6a9AOUO?usp=sharing",
    demoKey: "projects.colab",
  },
  {
    icon: "🎙️",
    title: {
      en: "Audio-to-Text AI Bot",
      de: "KI-Bot für Audio-Transkription",
    },
    desc: {
      en: "A Flask web app that transcribes audio into text and translates it into multiple languages using OpenAI's Whisper API.",
      de: "Eine Flask-Webanwendung, die Audio mit der Whisper-API von OpenAI in Text umwandelt und in mehrere Sprachen übersetzt.",
    },
    tags: ["Python", "Flask", "OpenAI Whisper"],
    code: "https://github.com/sufyan1105/Audio-to-text-Ai-bot",
    featured: true,
  },
];


/* ------------------------------------------------------------
   Experience — newest first.
   `kind` is shown as a pill and states exactly what each one was.
   The Deloitte entry is a Forage *job simulation*, not employment,
   and is labelled as such on purpose.
   ------------------------------------------------------------ */
const experience = [
  {
    kind: "exp.kind.simulation",
    period: { en: "August 2025", de: "August 2025" },
    // the "Job simulation" pill already says what this was, so the role
    // title doesn't repeat it; the full issued title is on the PDF
    role: { en: "Data Analytics", de: "Data Analytics" },
    org: { en: "Deloitte &middot; via Forage", de: "Deloitte &middot; über Forage" },
    mode: "exp.mode.remote",
    note: {
      en: "Practical tasks in data analysis and forensic technology.",
      de: "Praktische Aufgaben in Datenanalyse und Forensic Technology.",
    },
    file: "assets/certificates/deloitte-data-analytics-job-simulation.pdf",
  },
  {
    kind: "exp.kind.internship",
    period: { en: "Aug — Sep 2023", de: "Aug. — Sep. 2023" },
    role: { en: "Machine Learning Intern", de: "Praktikant Machine Learning" },
    org: { en: "Bharat Intern", de: "Bharat Intern" },
    mode: "exp.mode.remote",
    note: {
      en: "One-month virtual internship programme in machine learning.",
      de: "Einmonatiges virtuelles Praktikumsprogramm im Bereich Machine Learning.",
    },
    file: "assets/certificates/bharat-intern-machine-learning-internship.pdf",
  },
  {
    kind: "exp.kind.internship",
    period: { en: "2023 &middot; 1 month", de: "2023 &middot; 1 Monat" },
    role: { en: "Data Science &amp; Machine Learning Intern", de: "Praktikant Data Science &amp; Machine Learning" },
    org: { en: "Ybi Foundation", de: "Ybi Foundation" },
    mode: "exp.mode.remote",
    note: {
      en: "One-month certificate programme cum internship, completed August 2023.",
      de: "Einmonatiges Zertifikatsprogramm mit Praktikum, abgeschlossen im August 2023.",
    },
    file: "assets/certificates/ybi-foundation-data-science-ml-internship.pdf",
  },
];

function experienceItemHTML(e) {
  const meta = [pick(e.org), e.mode ? t(e.mode) : ""].filter(Boolean).join(" &middot; ");
  return `
    <li class="timeline-item reveal">
      <p class="timeline-period">${pick(e.period)}
        <span class="timeline-kind">${t(e.kind)}</span>
      </p>
      <h3>${pick(e.role)}</h3>
      ${meta ? `<p class="timeline-org">${meta}</p>` : ""}
      ${e.note ? `<p class="timeline-note">${pick(e.note)}</p>` : ""}
      ${e.file ? `<a class="cert-link" href="${e.file}" target="_blank" rel="noopener">${t("exp.certificate")}</a>` : ""}
    </li>
  `;
}


/* ------------------------------------------------------------
   Education
   Newest first. `institution` / `location` are optional — leave
   them out and the line simply isn't rendered.
   ------------------------------------------------------------ */
const education = [
  {
    current: true,
    period: { en: "Since March 2026", de: "Seit März 2026" },
    degree: { en: "M.Sc. AI &amp; Robotics", de: "M.Sc. KI &amp; Robotik" },
    institution: { en: "Hof University of Applied Sciences", de: "Hochschule Hof" },
    location: { en: "Hof, Germany", de: "Hof, Deutschland" },
  },
  {
    period: { en: "Winter 2021 — Summer 2025", de: "Wintersemester 2021 — Sommersemester 2025" },
    degree: {
      en: "Bachelor's degree, AI &amp; Data Science",
      de: "Bachelorabschluss, KI &amp; Data Science",
    },
    institution: { en: "University of Mumbai", de: "University of Mumbai" },
    location: { en: "Mumbai, India", de: "Mumbai, Indien" },
  },
];

function educationItemHTML(e) {
  const org = [pick(e.institution), pick(e.location)].filter(Boolean).join(" &middot; ");
  return `
    <li class="timeline-item${e.current ? " current" : ""} reveal">
      <p class="timeline-period">${pick(e.period)}${
        e.current ? ` <span class="timeline-now">${t("edu.current")}</span>` : ""
      }</p>
      <h3>${pick(e.degree)}</h3>
      ${org ? `<p class="timeline-org">${org}</p>` : ""}
    </li>
  `;
}


/* ------------------------------------------------------------
   Skills
   A tag is either a plain string (identical in both languages)
   or {en, de}. `evidence` names the certificate that backs the
   group — see the `certificates` array below.
   ------------------------------------------------------------ */
const skills = [
  {
    key: "skills.programming",
    tags: ["Python", "SQL", "JavaScript", "HTML/CSS"],
    evidence: ["skills.ev.google", "skills.ev.cwh"],
  },
  {
    key: "skills.ml",
    tags: [
      { en: "Linear &amp; Logistic Regression", de: "Lineare &amp; logistische Regression" },
      { en: "Neural Networks", de: "Neuronale Netze" },
      { en: "Decision Trees", de: "Entscheidungsbäume" },
      "Random Forests",
      "Clustering",
      { en: "Anomaly Detection", de: "Anomalieerkennung" },
      { en: "Recommender Systems", de: "Empfehlungssysteme" },
      "Reinforcement Learning",
      { en: "Model Evaluation &amp; Tuning", de: "Modellbewertung &amp; -optimierung" },
    ],
    evidence: ["skills.ev.ml", "skills.ev.google"],
  },
  {
    key: "skills.stats",
    tags: [
      { en: "Descriptive Statistics", de: "Deskriptive Statistik" },
      { en: "Probability", de: "Wahrscheinlichkeitsrechnung" },
      { en: "Sampling", de: "Stichprobenverfahren" },
      { en: "Confidence Intervals", de: "Konfidenzintervalle" },
      { en: "Hypothesis Testing", de: "Hypothesentests" },
      { en: "Regression Analysis", de: "Regressionsanalyse" },
      { en: "Exploratory Data Analysis", de: "Explorative Datenanalyse" },
      { en: "Predictive Modelling", de: "Prädiktive Modellierung" },
    ],
    evidence: ["skills.ev.google"],
  },
  {
    key: "skills.libs",
    tags: ["Pandas", "NumPy", "Scikit-learn", "TensorFlow / Keras", "Matplotlib", "Seaborn", "Flask"],
    evidence: ["skills.ev.cwh", "skills.ev.projects"],
  },
  {
    key: "skills.ai",
    tags: [
      "RAG",
      "Embeddings",
      "Ollama",
      "Llama 3.2",
      "OpenAI Whisper",
      "Prompt Engineering",
      { en: "Responsible AI", de: "Verantwortungsvolle KI" },
    ],
    evidence: ["skills.ev.aiess", "skills.ev.projects"],
  },
  {
    key: "skills.tools",
    tags: ["Jupyter", "Google Colab", "Git &amp; GitHub", "Tableau", "Power BI"],
    evidence: ["skills.ev.projects"],
  },
];

function skillCardHTML(group) {
  const tags = group.tags
    .map((tag) => `<span class="tag">${typeof tag === "string" ? tag : pick(tag)}</span>`)
    .join("");
  const evidence = group.evidence
    ? `<div class="skill-evidence-list">${group.evidence
        .map(
          (key) => `<a class="skill-evidence" href="certificates.html">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m4 12 5 5L20 6"/></svg>
             <span>${t(key)}</span>
           </a>`
        )
        .join("")}</div>`
    : "";
  return `
    <div class="skill-card reveal">
      <h3>${t(group.key)}</h3>
      <div class="tag-row">${tags}</div>
      ${evidence}
    </div>
  `;
}


/* ------------------------------------------------------------
   Certificates
   Course titles stay in English in both languages — that is how
   they appear on the certificate itself and on a German CV.
   `verify` is the official verification page; `file` is the PDF.
   ------------------------------------------------------------ */
const certificates = [
  {
    program: true,
    issuer: "Google",
    title: "Google Advanced Data Analytics",
    level: "Professional Certificate",
    date: "2024-10-15",
    verify: "https://coursera.org/verify/professional-cert/A3F2KI4V63G8",
    file: "assets/certificates/google-advanced-data-analytics.pdf",
    skills: ["Python", "Statistics", "Regression", "Machine Learning", "Tableau"],
    courses: [
      { title: "Foundations of Data Science", date: "2024-08-24", verify: "https://coursera.org/verify/W2OKRRK26ST4", file: "assets/certificates/google-ada-foundations-of-data-science.pdf" },
      { title: "Get Started with Python", date: "2024-09-26", verify: "https://coursera.org/verify/Y69DELN3VXJT", file: "assets/certificates/google-ada-get-started-with-python.pdf" },
      { title: "Go Beyond the Numbers: Translate Data into Insights", date: "2024-10-02", verify: "https://coursera.org/verify/8PQLF5TL3VFR", file: "assets/certificates/google-ada-go-beyond-the-numbers.pdf" },
      { title: "The Power of Statistics", date: "2024-10-06", verify: "https://coursera.org/verify/JID8CD4INJU2", file: "assets/certificates/google-ada-power-of-statistics.pdf" },
      { title: "Regression Analysis: Simplify Complex Data Relationships", date: "2024-10-10", verify: "https://coursera.org/verify/55HUV4E438PL", file: "assets/certificates/google-ada-regression-analysis.pdf" },
      { title: "The Nuts and Bolts of Machine Learning", date: "2024-10-15", verify: "https://coursera.org/verify/0666VAM7O1I8", file: "assets/certificates/google-ada-nuts-and-bolts-of-ml.pdf" },
      { title: "Google Advanced Data Analytics Capstone", date: "2024-10-15", verify: "https://coursera.org/verify/7NECF9X02S75", file: "assets/certificates/google-ada-capstone.pdf" },
    ],
  },
  {
    program: true,
    issuer: "DeepLearning.AI &amp; Stanford University",
    title: "Machine Learning Specialization",
    level: "Specialization",
    date: "2025-09-16",
    verify: "https://coursera.org/verify/specialization/7UJUHNMYABUB",
    file: "assets/certificates/ml-specialization.pdf",
    skills: ["Supervised Learning", "Neural Networks", "Decision Trees", "Clustering", "Recommender Systems", "Reinforcement Learning"],
    courses: [
      { title: "Supervised Machine Learning: Regression and Classification", date: "2025-07-30", verify: "https://coursera.org/verify/BITSGII8BY7G", file: "assets/certificates/ml-supervised-regression-classification.pdf" },
      { title: "Advanced Learning Algorithms", date: "2025-09-01", verify: "https://coursera.org/verify/G2MPQVMUSOZF", file: "assets/certificates/ml-advanced-learning-algorithms.pdf" },
      { title: "Unsupervised Learning, Recommenders, Reinforcement Learning", date: "2025-09-16", verify: "https://coursera.org/verify/EMAJUUX14656", file: "assets/certificates/ml-unsupervised-recommenders-rl.pdf" },
    ],
  },
  {
    issuer: "CodeWithHarry",
    title: "The Ultimate Job Ready Data Science Course",
    date: "2026-08-19",
    credentialId: "CWH-THE-ULTIMATE-JOB-READY-DATA-SCIENCE-COURSE-9CDCYYHN",
    file: "assets/certificates/codewithharry-job-ready-data-science.pdf",
  },
  {
    issuer: "Google",
    title: "Google AI Essentials",
    date: "2024-10-16",
    verify: "https://coursera.org/verify/JS58LGSV2EVH",
    file: "assets/certificates/google-ai-essentials.pdf",
  },
  {
    issuer: "Google",
    title: "Foundations of Cybersecurity",
    date: "2024-12-30",
    verify: "https://coursera.org/verify/R34TRP7W1HDQ",
    file: "assets/certificates/google-foundations-of-cybersecurity.pdf",
  },
  {
    issuer: "Simplilearn SkillUp",
    title: "Power BI for Beginners",
    date: "2024-06-26",
    credentialId: "6812496",
    file: "assets/certificates/simplilearn-power-bi-for-beginners.pdf",
  },
  {
    issuer: "Techobytes Technologies &amp; ITC, IIT Bombay",
    title: "Tech Workshop Series 2024 — AI &amp; Machine Learning",
    date: "2024-03-10",
    credentialId: "TB-ITC-IITB-AI-039",
    file: "assets/certificates/techobytes-itc-iitb-ai-ml-workshop.pdf",
  },
];

// ---------- Language ----------
function currentLang() {
  return document.documentElement.getAttribute("data-lang") || "en";
}

function t(key) {
  const dict = I18N[currentLang()] || I18N.en;
  return dict[key] != null ? dict[key] : I18N.en[key] || "";
}

function applyLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = "en";
  const root = document.documentElement;
  root.setAttribute("lang", lang);
  root.setAttribute("data-lang", lang);

  // Text content (translations are authored by us, so innerHTML is safe here)
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const val = t(el.getAttribute("data-i18n"));
    if (val) el.innerHTML = val;
  });

  // Attributes
  const attrMap = {
    "data-i18n-aria": "aria-label",
    "data-i18n-title": "title",
    "data-i18n-content": "content",
    "data-i18n-alt": "alt",
  };
  Object.entries(attrMap).forEach(([dataAttr, target]) => {
    document.querySelectorAll(`[${dataAttr}]`).forEach((el) => {
      const val = t(el.getAttribute(dataAttr));
      if (val) el.setAttribute(target, val);
    });
  });

  // Re-render the JS-driven cards in the new language
  render("projectGrid", projects, projectCardHTML);
  render("featuredGrid", projects.filter((p) => p.featured), projectCardHTML);
  render("experienceList", experience, experienceItemHTML);
  render("educationList", education, educationItemHTML);
  render("skillsGrid", skills, skillCardHTML);
  renderCertificates();
  initReveal();

  // Reflect state on the toggle buttons
  document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
    const isOn = btn.getAttribute("data-lang-btn") === lang;
    btn.classList.toggle("active", isOn);
    btn.setAttribute("aria-pressed", String(isOn));
  });

  safeSet("lang", lang);
}

function initLang() {
  const stored = safeGet("lang");
  const browser = (navigator.language || "en").slice(0, 2).toLowerCase();
  const initial = stored || (SUPPORTED_LANGS.includes(browser) ? browser : "en");

  document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.getAttribute("data-lang-btn");
      if (next === currentLang()) return;
      // brief cross-fade so the swap feels intentional, not glitchy
      document.body.classList.add("lang-switching");
      window.setTimeout(() => {
        applyLang(next);
        document.body.classList.remove("lang-switching");
      }, 140);
    });
  });

  applyLang(initial);
}

// ---------- Project cards ----------
function projectCardHTML(p) {
  return `
    <article class="project-card reveal">
      <div class="project-card-top">
        <div class="project-icon" aria-hidden="true">${p.icon}</div>
      </div>
      <h3>${pick(p.title)}</h3>
      <p>${pick(p.desc)}</p>
      <div class="project-tags">
        ${p.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
      </div>
      <div class="project-links">
        ${p.live ? `<a class="primary" href="${p.live}">${t("projects.live")}</a>` : ""}
        <a class="${p.live ? "" : "primary"}" href="${p.code}" target="_blank" rel="noopener">${t("projects.code")}</a>
        ${p.demo ? `<a href="${p.demo}" target="_blank" rel="noopener">${t(p.demoKey)}</a>` : ""}
      </div>
    </article>
  `;
}


// ---------- Certificate cards ----------
function formatCertDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat(currentLang() === "de" ? "de-DE" : "en-GB", {
    month: "short",
    year: "numeric",
  }).format(d);
}

function certLinksHTML(c) {
  const verify = c.verify
    ? `<a class="cert-link primary" href="${c.verify}" target="_blank" rel="noopener">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m4 12 5 5L20 6"/></svg>
         ${t("certs.verify")}</a>`
    : "";
  const file = c.file
    ? `<a class="cert-link" href="${c.file}" target="_blank" rel="noopener">${t("certs.view")}</a>`
    : "";
  return verify + file;
}

function programCardHTML(c, i) {
  const id = "certcourses" + i;
  return `
    <article class="cert-program reveal">
      <div class="cert-program-head">
        <div>
          <p class="cert-issuer">${c.issuer}${c.level ? ` &middot; ${c.level}` : ""}</p>
          <h3>${c.title}</h3>
          <p class="cert-meta">${t("certs.issued")} ${formatCertDate(c.date)} &middot; ${c.courses.length} ${t("certs.courses")}</p>
        </div>
        <div class="cert-actions">${certLinksHTML(c)}</div>
      </div>

      ${c.skills ? `<div class="tag-row cert-skills">${c.skills.map((k) => `<span class="tag">${k}</span>`).join("")}</div>` : ""}

      <button class="cert-expand" type="button" aria-expanded="false" aria-controls="${id}">
        <span class="cert-expand-label">${t("certs.showCourses")}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      <ol class="cert-courses" id="${id}" hidden>
        ${c.courses
          .map(
            (co) => `
          <li>
            <div class="cert-course-main">
              <span class="cert-course-title">${co.title}</span>
              <span class="cert-course-date">${formatCertDate(co.date)}</span>
            </div>
            <div class="cert-course-links">${certLinksHTML(co)}</div>
          </li>`
          )
          .join("")}
      </ol>
    </article>
  `;
}

function certCardHTML(c) {
  return `
    <article class="cert-card reveal">
      <p class="cert-issuer">${c.issuer}</p>
      <h3>${c.title}</h3>
      <p class="cert-meta">${t("certs.issued")} ${formatCertDate(c.date)}</p>
      ${c.credentialId ? `<p class="cert-id"><span>${t("certs.id")}</span> ${c.credentialId}</p>` : ""}
      <div class="cert-actions">${certLinksHTML(c)}</div>
    </article>
  `;
}

function renderCertificates() {
  render("certPrograms", certificates.filter((c) => c.program), programCardHTML);
  render("certOthers", certificates.filter((c) => !c.program), certCardHTML);

  // Expand / collapse the course list inside a programme card
  document.querySelectorAll(".cert-expand").forEach((btn) => {
    btn.addEventListener("click", () => {
      const list = document.getElementById(btn.getAttribute("aria-controls"));
      if (!list) return;
      const open = list.hidden;
      list.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      btn.classList.toggle("open", open);
      btn.querySelector(".cert-expand-label").textContent = t(
        open ? "certs.hideCourses" : "certs.showCourses"
      );
    });
  });
}


// ---------- Profile photo ----------
// The avatar starts on the "SK" initials and only swaps to the photo once it
// actually loads, so a missing assets/profile.jpg degrades cleanly.
function initAvatar() {
  document.querySelectorAll(".avatar img").forEach((img) => {
    const avatar = img.closest(".avatar");
    const reveal = () => avatar.classList.remove("no-photo");
    if (img.complete && img.naturalWidth > 0) reveal();
    else img.addEventListener("load", reveal, { once: true });
  });
}

// ---------- Theme ----------
function initTheme() {
  const root = document.documentElement;
  // The initial theme is already set by the inline <head> script (avoids a flash).
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    safeSet("theme", next);
  });
}

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}
function safeSet(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch (e) {
    /* ignore — private browsing */
  }
}

// ---------- Mobile menu ----------
function initMobileMenu() {
  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("navLinks");
  if (!toggle || !nav) return;

  function setOpen(open) {
    nav.classList.toggle("open", open);
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", t(open ? "nav.menu.close" : "nav.menu.open"));
  }

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 780) setOpen(false);
  });
}

// ---------- Click-to-copy email ----------
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return false; // denied permission, or a browser without the Clipboard API
  }
}

function initCopyEmail() {
  document.querySelectorAll("[data-copy-email]").forEach((btn) => {
    const label = btn.querySelector("[data-copy-label]") || btn;
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const original = label.textContent;
      const ok = await copyText(EMAIL);
      btn.classList.add(ok ? "copied" : "copy-failed");
      label.textContent = t(ok ? "contact.copied" : "contact.copyfail");
      window.setTimeout(() => {
        btn.classList.remove("copied", "copy-failed");
        label.textContent = original;
      }, 1800);
    });
  });
}

function initEmailLinks() {
  document.querySelectorAll("[data-email-link]").forEach((el) => {
    el.setAttribute("href", `mailto:${EMAIL}`);
  });
  document.querySelectorAll("[data-email-text]").forEach((el) => {
    el.textContent = EMAIL;
  });
}

// ---------- Scroll reveal ----------
function initReveal() {
  const targets = document.querySelectorAll(".reveal:not(.visible)");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  targets.forEach((el) => io.observe(el));
}

// ---------- Header state + scroll progress ----------
function initScrollFx() {
  const header = document.querySelector(".site-header");
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.appendChild(bar);

  let ticking = false;
  function update() {
    const scrollTop = window.scrollY;
    header?.classList.toggle("scrolled", scrollTop > 10);
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + "%";
    ticking = false;
  }
  update();
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
}

// ---------- Mouse-reactive spotlight on hero / page headers ----------
function initSpotlight() {
  const zones = document.querySelectorAll(".hero, .page-hero");
  if (!zones.length) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  zones.forEach((zone) => {
    let frame = null;
    zone.addEventListener("mousemove", (e) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const r = zone.getBoundingClientRect();
        zone.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        zone.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
        frame = null;
      });
    });
  });
}

// ---------- Active nav link ----------
function initActiveNav() {
  const current = document.body.dataset.current;
  if (!current) return;
  document.querySelectorAll("#navLinks a[data-page]").forEach((a) => {
    if (a.getAttribute("data-page") === current) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    }
  });
}

function initYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

// This file is loaded at the end of <body>, so the DOM is already parsed.
// Running immediately (rather than waiting for DOMContentLoaded) means the
// German text is in place before the first paint — no flash of English.
initTheme();
initLang(); // also renders the project cards in the right language
initActiveNav();
initMobileMenu();
initEmailLinks();
initCopyEmail();
initAvatar();
initYear();
initScrollFx();
initSpotlight();
