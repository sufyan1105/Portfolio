// Smoke check: load i18n.js + script.js against a stub DOM and assert the
// card builders produce both languages.  Run: node tools/test_render.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

let lang = "en";
const noop = () => {};
const el = { addEventListener: noop, setAttribute: noop, classList: { toggle: noop, add: noop, remove: noop }, querySelectorAll: () => [], querySelector: () => el, style: { setProperty: noop } };
globalThis.document = {
  documentElement: { getAttribute: () => lang, setAttribute: noop, classList: { add: noop } },
  body: { classList: { add: noop, remove: noop }, dataset: {}, appendChild: noop },
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => el,
  addEventListener: noop,
};
globalThis.window = { matchMedia: () => ({ matches: false }), addEventListener: noop, setTimeout, requestAnimationFrame: noop, innerWidth: 1280 };
globalThis.localStorage = { getItem: () => null, setItem: noop };
globalThis.IntersectionObserver = class { observe() {} unobserve() {} };

// node already defines a read-only `navigator`; the site only reads .language

const src = ["js/i18n.js", "js/script.js"].map((f) => readFileSync(f, "utf8")).join("\n");
const scope = new Function(src + "\nreturn { projectCardHTML, skillCardHTML, experienceItemHTML, educationItemHTML, programCardHTML, certCardHTML, projects, skills, experience, education, certificates };")();

for (lang of ["en", "de"]) {
  const project = scope.projectCardHTML(scope.projects[0]);
  assert.match(project, lang === "de" ? /KI-Lernassistent/ : /RAG-based AI Teaching Assistant/);
  assert.match(project, /class="tag">Python<\/span>/);

  const demo = scope.projectCardHTML(scope.projects.find((p) => p.demo));
  assert.match(demo, lang === "de" ? /In Colab öffnen/ : /Open in Colab/);

  assert.match(scope.skillCardHTML(scope.skills[1]), lang === "de" ? /Neuronale Netze/ : /Neural Networks/);
  assert.match(scope.experienceItemHTML(scope.experience[0]), lang === "de" ? /über Forage/ : /via Forage/);
  assert.match(scope.educationItemHTML(scope.education[0]), lang === "de" ? /Seit März 2026/ : /Since March 2026/);

  const program = scope.programCardHTML(scope.certificates[0], 0);
  assert.match(program, /Google Advanced Data Analytics/);
  assert.equal((program.match(/cert-course-title/g) || []).length, 7);
  assert.match(scope.certCardHTML(scope.certificates[2]), /CWH-THE-ULTIMATE/);
}
console.log("render smoke check: ok");
