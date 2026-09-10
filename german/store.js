/* ============================================================
   Deutsch Vokabeln — static port of the FastAPI backend.

   The original app is FastAPI + SQLite. Cloudflare Pages serves static
   files only, so the whole backend runs here instead:

     app/srs.py  -> schedule() / nextRelearning() / mastery()  (line-for-line)
     app/db.py   -> the query helpers below, over an in-memory word list
     app/main.py -> request(), which speaks the same 8 API paths so that
                    app.js needs a one-line change instead of a rewrite

   The vocabulary is read-only and ships in vocab.json. Only what you cannot
   rebuild — your review history, plus any words you add or delete — is
   written to localStorage, which is what makes progress survive a reload.

   CAREFUL: localStorage is per-browser. Studying on the phone and on the Mac
   gives you two separate histories. Stats -> Export writes the whole thing to
   a JSON file, and Import reads one back; that is the bridge between devices,
   and the backup if a browser ever clears its site data.
   ============================================================ */

const DV = (function () {
  "use strict";

  const KEY = "dv.v1";
  const LEVELS = ["A1", "A2", "B1", "B2"];
  const PARTS = ["noun", "verb", "adjective", "adverb", "phrase"];
  const GENDERS = ["der", "die", "das"];

  // ---------------------------------------------------------------- srs.py
  const AGAIN = 0, HARD = 1, GOOD = 2, EASY = 3;
  const MIN_EASE = 1.3, MAX_EASE = 3.0, DEFAULT_EASE = 2.5;
  const EASE_DELTA = { 0: -0.2, 1: -0.15, 2: 0.0, 3: 0.15 };
  const LEARNING_STEPS = [1, 3];
  const MASTERY_THRESHOLD_DAYS = 21;

  // Python's round() breaks an exact .5 to the nearest EVEN number, and
  // Math.round() rounds it up. That is not a rounding-error technicality: a
  // card at interval 125 with the default ease of 2.5 lands on exactly 312.5,
  // and the two rules give 312 and 313. From there every later interval
  // diverges and compounds — the parity test caught it at 15006 vs 15049 days.
  function pyRound(x) {
    const f = Math.floor(x);
    const frac = x - f;
    if (frac > 0.5) return f + 1;
    if (frac < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
  }

  const clampEase = (e) =>
    pyRound(Math.max(MIN_EASE, Math.min(MAX_EASE, e)) * 1e4) / 1e4;

  function nextInterval(reps, ease, prevInterval, rating) {
    if (rating === AGAIN) return 0;
    if (reps === 0) return LEARNING_STEPS[0];
    if (reps === 1) return LEARNING_STEPS[1];
    const base = Math.max(prevInterval, 1);
    if (rating === HARD) return Math.max(1, pyRound(base * 1.2));
    return Math.max(1, pyRound(base * ease * (rating === EASY ? 1.3 : 1.0)));
  }

  function schedule(reps, ease, intervalDays, rating) {
    const newEase = clampEase(Number(ease) + EASE_DELTA[rating]);
    const interval = rating === AGAIN ? 0 : nextInterval(reps, newEase, intervalDays, rating);
    return {
      repetitions: rating === AGAIN ? 0 : reps + 1,
      ease_factor: newEase,
      interval_days: interval,
      due_date: plusDays(interval),
    };
  }

  /** "Again" puts a card in the keep-showing-me pool; only "Easy" takes it out. */
  function nextRelearning(relearning, rating) {
    if (rating === AGAIN) return 1;
    if (rating === EASY) return 0;
    return relearning ? 1 : 0;
  }

  function mastery(reps, intervalDays) {
    if (reps === 0) return "new";
    if (intervalDays >= MASTERY_THRESHOLD_DAYS) return "mastered";
    if (reps >= 3) return "familiar";
    return "learning";
  }

  // ---------------------------------------------------------------- dates
  // Local dates, not UTC: toISOString() in Germany rolls back to yesterday
  // for anything studied before 01:00, which would mark cards due a day early.
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayISO = () => iso(new Date());
  function plusDays(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return iso(d);
  }

  // ---------------------------------------------------------------- state
  let SEED = [];                 // vocab.json, read-only
  let saved = { p: {}, added: [], deleted: [], nextId: 0 };
  let words = [];                // seed + added - deleted
  let index = new Map();

  function hasSaved() {
    try { return localStorage.getItem(KEY) !== null; } catch (e) { return false; }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        saved = Object.assign({ p: {}, added: [], deleted: [], nextId: 0 }, parsed);
      }
    } catch (e) {
      // A private window or blocked site data: run with no history rather
      // than refusing to start. Nothing will persist, which is the honest
      // outcome — better than a blank screen.
      console.warn("progress could not be read; running without it", e);
    }
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch (e) {
      console.error("progress could not be saved", e);
    }
  }

  function rebuild() {
    const gone = new Set(saved.deleted);
    words = SEED.concat(saved.added).filter((w) => !gone.has(w.id));
    index = new Map(words.map((w) => [w.id, w]));
  }

  // Progress is stored as a compact array only for words you have actually
  // touched, so the payload stays a few KB instead of one record per 1,614.
  const DEFAULTS = { repetitions: 0, ease_factor: DEFAULT_EASE, interval_days: 0,
                     due_date: "2000-01-01", reviews: 0, lapses: 0, relearning: 0 };

  function progressOf(id) {
    const p = saved.p[id];
    if (!p) return Object.assign({}, DEFAULTS);
    return { repetitions: p[0], ease_factor: p[1], interval_days: p[2],
             due_date: p[3], reviews: p[4], lapses: p[5], relearning: p[6] };
  }

  function setProgress(id, p) {
    saved.p[id] = [p.repetitions, p.ease_factor, p.interval_days,
                   p.due_date, p.reviews, p.lapses, p.relearning];
    persist();
  }

  /** A word plus its review state — the shape the API used to return. */
  function row(w) {
    const p = progressOf(w.id);
    return Object.assign({}, w, p, { mastery: mastery(p.repetitions, p.interval_days) });
  }

  const isDue = (p, today) => p.relearning === 1 || p.due_date <= today;

  function levelFilter(q) {
    const wanted = q.getAll("level").map((l) => l.toUpperCase());
    const unknown = wanted.filter((l) => !LEVELS.includes(l));
    if (unknown.length) throw new Error(`unknown level(s): ${unknown}`);
    return wanted.length ? (w) => wanted.includes(w.level) : () => true;
  }

  // ---------------------------------------------------------------- queries
  function dueWords(q) {
    const today = todayISO();
    const keep = levelFilter(q);
    const limit = Number(q.get("limit") || 20);
    const out = words.filter((w) => keep(w) && isDue(progressOf(w.id), today)).map(row);
    // relearning first, then most overdue, then random — the shuffle matters:
    // the whole list shares one due date, so without it the queue would walk
    // A1 in file order and never reach A2.
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    out.sort((a, b) =>
      (b.relearning - a.relearning) || (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0));
    return out.slice(0, limit);
  }

  function reviewWord(id, rating) {
    if (![AGAIN, HARD, GOOD, EASY].includes(rating)) throw new Error("rating must be 0-3");
    const w = index.get(id);
    if (!w) throw new Error(`no word with id ${id}`);
    const before = progressOf(id);
    const s = schedule(before.repetitions, before.ease_factor, before.interval_days, rating);
    setProgress(id, Object.assign({}, s, {
      reviews: before.reviews + 1,
      lapses: before.lapses + (rating === AGAIN ? 1 : 0),
      relearning: nextRelearning(before.relearning, rating),
    }));
    return row(w);
  }

  function listWords(q) {
    const keep = levelFilter(q);
    const search = (q.get("search") || "").toLowerCase();
    const pos = q.get("part_of_speech");
    const limit = q.get("limit") ? Number(q.get("limit")) : null;
    let out = words.filter((w) =>
      keep(w) &&
      (!pos || w.part_of_speech === pos) &&
      (!search || w.word.toLowerCase().includes(search) || w.meaning.toLowerCase().includes(search)));
    out.sort((a, b) => a.word.localeCompare(b.word, "de", { sensitivity: "base" }));
    if (limit !== null) out = out.slice(0, limit);
    return out.map(row);
  }

  function randomNouns(q) {
    const keep = levelFilter(q);
    const limit = Number(q.get("limit") || 10);
    const pool = words.filter((w) => keep(w) && w.part_of_speech === "noun" && w.gender);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, limit).map(row);
  }

  function addWord(payload) {
    const word = String(payload.word || "").trim();
    const meaning = String(payload.meaning || "").trim();
    if (!word) throw new Error("word must not be empty");
    if (!meaning) throw new Error("meaning must not be empty");
    if (!PARTS.includes(payload.part_of_speech)) throw new Error("invalid part of speech");
    if (words.some((w) => w.word.toLowerCase() === word.toLowerCase())) {
      throw new Error(`'${word}' is already in the vocabulary`);
    }
    const noun = payload.part_of_speech === "noun";
    const gender = noun && GENDERS.includes(payload.gender) ? payload.gender : null;
    const level = payload.level && LEVELS.includes(String(payload.level).toUpperCase())
      ? String(payload.level).toUpperCase() : null;
    const w = {
      id: ++saved.nextId,
      word, meaning,
      part_of_speech: payload.part_of_speech,
      gender,
      plural: noun && payload.plural ? String(payload.plural).trim() : null,
      example: payload.example ? String(payload.example).trim() : null,
      example_en: payload.example_en ? String(payload.example_en).trim() : null,
      level,
    };
    saved.added.push(w);
    persist();
    rebuild();
    return row(w);
  }

  function deleteWord(id) {
    if (!index.has(id)) throw new Error(`no word with id ${id}`);
    saved.added = saved.added.filter((w) => w.id !== id);
    if (!saved.deleted.includes(id)) saved.deleted.push(id);
    delete saved.p[id];
    persist();
    rebuild();
  }

  function stats() {
    const today = todayISO();
    const counts = { new: 0, learning: 0, familiar: 0, mastered: 0 };
    const byGender = { der: 0, die: 0, das: 0 };
    const byLevel = {};
    LEVELS.forEach((l) => { byLevel[l] = { total: 0, due: 0, started: 0 }; });
    let due = 0, relearning = 0, reviews = 0, lapses = 0;

    for (const w of words) {
      const p = progressOf(w.id);
      counts[mastery(p.repetitions, p.interval_days)] += 1;
      reviews += p.reviews;
      lapses += p.lapses;
      if (p.relearning === 1) relearning += 1;
      const d = isDue(p, today);
      if (d) due += 1;
      if (w.gender && byGender[w.gender] !== undefined) byGender[w.gender] += 1;
      const lvl = byLevel[w.level];
      if (lvl) {
        lvl.total += 1;
        if (d) lvl.due += 1;
        if (p.repetitions > 0) lvl.started += 1;
      }
    }
    return {
      total_words: words.length,
      due_today: due,
      relearning,
      learned: words.length - counts.new,
      mastery: counts,
      total_reviews: reviews,
      total_lapses: lapses,
      by_gender: byGender,
      by_level: byLevel,
    };
  }

  // ---------------------------------------------------------------- main.py
  /** Same eight paths the FastAPI app served, answered locally. */
  function request(path, options = {}) {
    const [route, qs] = path.split("?");
    const q = new URLSearchParams(qs || "");
    const method = (options.method || "GET").toUpperCase();
    const body = options.body ? JSON.parse(options.body) : null;

    if (route === "/api/words" && method === "GET") return listWords(q);
    if (route === "/api/words" && method === "POST") return addWord(body);
    if (route === "/api/review/due") return dueWords(q);
    if (route === "/api/quiz/gender") return randomNouns(q);
    if (route === "/api/stats") return stats();
    if (route === "/api/levels") {
      const byLevel = stats().by_level;
      return LEVELS.map((level) => Object.assign({ level }, byLevel[level]));
    }
    const one = route.match(/^\/api\/(words|review)\/(\d+)$/);
    if (one) {
      const id = Number(one[2]);
      if (one[1] === "review") return reviewWord(id, body.rating);
      if (method === "DELETE") { deleteWord(id); return null; }
      const w = index.get(id);
      if (!w) throw new Error(`no word with id ${id}`);
      return row(w);
    }
    throw new Error(`unknown route ${method} ${route}`);
  }

  // ---------------------------------------------------------------- backup
  function exportProgress() {
    return JSON.stringify({ app: "deutsch-vokabeln", version: 1,
                            exported: new Date().toISOString(), data: saved }, null, 1);
  }

  function importProgress(text) {
    const parsed = JSON.parse(text);
    const data = parsed && parsed.data ? parsed.data : parsed;
    if (!data || typeof data.p !== "object") throw new Error("not a progress file");
    saved = Object.assign({ p: {}, added: [], deleted: [], nextId: 0 }, data);
    persist();
    rebuild();
    return Object.keys(saved.p).length;
  }

  async function init(seedUrl) {
    const seed = await (await fetch(seedUrl)).json();
    SEED = seed.words;
    const had = hasSaved();
    load();
    // First run in this browser inherits the review history that was already
    // in vocab.db, so the phone does not start from card one.
    if (!had && seed.progress) { saved.p = seed.progress; persist(); }
    // Words added before this build keep their ids; new ones continue past
    // the highest seed id so an import from another device cannot collide.
    saved.nextId = Math.max(saved.nextId, ...SEED.map((w) => w.id));
    rebuild();
    return words.length;
  }

  return { init, request, exportProgress, importProgress,
           get words() { return words; } };
})();
