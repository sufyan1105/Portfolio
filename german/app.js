/* Deutsch Vokabeln — single-page frontend, no build step. */
(() => {
  'use strict';

  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const ALL_LEVELS = ['A1', 'A2', 'B1', 'B2'];
  const BATCH = 50;      // cards fetched per request
  const REFILL_AT = 5;   // top the deck up once this few are left

  const state = {
    view: 'revise',
    queue: [],        // words due for review
    index: 0,
    flipped: false,
    levels: loadLevels(),   // active CEFR filter; empty set = all levels
    levelCounts: {},
    dueTotal: 0,            // words the server still considers due
    reviewedThisSession: 0,
    refilling: false,
    quiz: { pool: [], i: 0, right: 0, asked: 0, locked: false },
  };

  // The level filter is a per-device preference, so localStorage is the right
  // home for it. Private windows and blocked site data make it throw, hence
  // the guards: the app must work with no stored value at all.
  function loadLevels() {
    try {
      const raw = JSON.parse(localStorage.getItem('dv.levels') || '[]');
      return new Set(Array.isArray(raw) ? raw.filter((l) => ALL_LEVELS.includes(l)) : []);
    } catch { return new Set(); }
  }

  function saveLevels() {
    try { localStorage.setItem('dv.levels', JSON.stringify([...state.levels])); } catch { /* ignore */ }
  }

  // '' when nothing is selected, so the API returns every level.
  function levelQuery(prefix = '&') {
    if (!state.levels.size) return '';
    return prefix + [...state.levels].map((l) => `level=${l}`).join('&');
  }

  // ---------------------------------------------------------------- api
  // The only line that differs from the FastAPI version of this file: the
  // same paths, answered by store.js instead of by a server over the network.
  async function api(path, options = {}) {
    return DV.request(path, options);
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------------------------------------------------------- nav
  function goto(view) {
    state.view = view;
    $$('.view').forEach((el) => el.classList.add('hidden'));
    $(`#view-${view}`).classList.remove('hidden');
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.goto === view));
    window.scrollTo(0, 0);

    if (view === 'revise') loadDue();
    if (view === 'quiz')   startQuiz();
    if (view === 'words')  loadWords();
    if (view === 'stats')  loadStats();
  }

  async function loadLevelBar() {
    try {
      const rows = await api('/api/levels');
      state.levelCounts = Object.fromEntries(rows.map((r) => [r.level, r]));
    } catch { state.levelCounts = {}; }
    renderLevelBar();
  }

  function renderLevelBar() {
    const bar = $('#levelBar');
    const all = state.levels.size === 0;
    const chip = (label, active, data, sub) => `
      <button data-level="${data}" class="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active ? 'border-sky-400 bg-sky-500/20 text-sky-300' : 'border-slate-800 bg-slate-900 text-slate-400'
      }">${label}${sub ? `<span class="ml-1 font-normal opacity-60">${sub}</span>` : ''}</button>`;

    bar.innerHTML = chip('All', all, '') + ALL_LEVELS.map((lvl) => {
      const row = state.levelCounts[lvl];
      const due = row ? row.due : 0;
      return chip(lvl, state.levels.has(lvl), lvl, due ? `${due}` : '');
    }).join('');
  }

  function toggleLevel(lvl) {
    if (!lvl) state.levels.clear();                    // the "All" chip
    else if (state.levels.has(lvl)) state.levels.delete(lvl);
    else state.levels.add(lvl);
    saveLevels();
    renderLevelBar();
    goto(state.view);                                  // re-run the active view
  }

  async function refreshBadge() {
    try {
      const s = await api('/api/stats');
      state.dueTotal = s.due_today;
      $('#dueBadge').textContent = `${s.due_today} due`;
      $('#dueBadge').className = s.due_today > 0
        ? 'rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300'
        : 'rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400';
    } catch { /* offline — leave the badge as-is */ }
  }

  // Reviewing changes the per-level due counts shown on the chips.
  let levelBarTimer;
  function refreshLevelBarSoon() {
    clearTimeout(levelBarTimer);
    levelBarTimer = setTimeout(loadLevelBar, 400);
  }

  // ------------------------------------------------------------- revise
  async function fetchDue() {
    try {
      return await api(`/api/review/due?limit=${BATCH}${levelQuery()}`);
    } catch {
      return [];
    }
  }

  async function loadDue() {
    state.queue = await fetchDue();
    state.index = 0;
    state.reviewedThisSession = 0;
    renderCard();
    refreshBadge();
  }

  // Pull the next batch of due cards, skipping any already in hand. Without
  // this the session stopped dead after one batch of 50 and claimed nothing
  // was due, even with hundreds of words still waiting.
  async function refillDeck() {
    if (state.refilling) return false;
    state.refilling = true;
    try {
      const next = await fetchDue();
      const have = new Set(state.queue.map((w) => w.id));
      const fresh = next.filter((w) => !have.has(w.id));
      state.queue.push(...fresh);
      return fresh.length > 0;
    } finally {
      state.refilling = false;
    }
  }

  function renderCard() {
    const empty = $('#reviseEmpty');
    const deck  = $('#reviseDeck');
    const word  = state.queue[state.index];

    if (!word) {
      // Out of cards in hand — try to top up before declaring the day done.
      if (!state.refilling) {
        refillDeck().then((got) => {
          if (got) {
            state.index = 0;
            renderCard();
          } else {
            empty.classList.remove('hidden');
            deck.classList.add('hidden');
          }
        });
      }
      return;
    }
    empty.classList.add('hidden');
    deck.classList.remove('hidden');

    setFlipped(false);
    $('#reviseProgress').textContent = state.dueTotal
      ? `Card ${state.reviewedThisSession + 1} · ${state.dueTotal} due`
      : `Card ${state.reviewedThisSession + 1}`;
    $('#cardFront').textContent = word.word;
    $('#cardPos').textContent   = word.part_of_speech;
    const lvl = $('#cardLevel');
    lvl.textContent = word.level || '';
    lvl.classList.toggle('hidden', !word.level);
    $('#cardRelearn').classList.toggle('hidden', !word.relearning);

    const art = $('#cardArticle');
    art.textContent = word.gender || '';
    art.className   = word.gender
      ? `text-center text-2xl font-bold g-${word.gender}`
      : 'hidden';

    $('#cardBack').textContent   = word.meaning;
    $('#cardPlural').textContent = word.plural ? `Plural: ${word.plural}` : '';
    $('#cardExample').textContent   = word.example || '';
    $('#cardExampleEn').textContent = word.example_en || '';

    // Fetch the next batch while there is still runway, so the deck never stalls.
    if (state.queue.length - state.index <= REFILL_AT) refillDeck();
  }

  function setFlipped(on) {
    state.flipped = on;
    $('#flashcard').classList.toggle('flipped', on);
    $('#ratingRow').classList.toggle('opacity-30', !on);
    $$('#ratingRow .rate').forEach((b) => { b.disabled = !on; });
  }

  async function rate(rating) {
    const word = state.queue[state.index];
    if (!word) return;
    const card = $('#flashcard');
    card.classList.add(rating === 0 ? 'swipe-out-left' : 'swipe-out-right');

    // The server owns the "keep showing me this" rule: a card is in relearning
    // from the moment you rate it Again until you rate it Easy.
    let updated = null;
    try {
      updated = await api(`/api/review/${word.id}`, {
        method: 'POST',
        body: JSON.stringify({ rating }),
      });
    } catch (e) {
      console.error(e);
    }

    setTimeout(() => {
      card.classList.remove('swipe-out-left', 'swipe-out-right');
      state.reviewedThisSession += 1;
      state.queue.splice(state.index, 1);
      if (updated && updated.relearning) {
        state.queue.push(updated);   // back to the end of the deck, not gone
      }
      if (state.index >= state.queue.length) state.index = 0;
      renderCard();
      refreshBadge();
      refreshLevelBarSoon();
    }, 250);
  }

  // --------------------------------------------------------------- quiz
  async function startQuiz() {
    try {
      state.quiz.pool = await api(`/api/quiz/gender?limit=20${levelQuery()}`);
    } catch {
      state.quiz.pool = [];
    }
    Object.assign(state.quiz, { i: 0, right: 0, asked: 0, locked: false });
    $('#btnQuizRestart').classList.add('hidden');
    renderQuiz();
  }

  function renderQuiz() {
    const q = state.quiz;
    const word = q.pool[q.i];
    $('#quizEmpty').classList.toggle('hidden', q.pool.length > 0);
    $('#quizBox').classList.toggle('hidden', q.pool.length === 0);
    $('#quizScore').textContent = `${q.right} / ${q.asked}`;

    if (!word) {
      if (q.pool.length) {
        $('#quizWord').textContent = 'Round complete 🎉';
        $('#quizMeaning').textContent = `${q.right} of ${q.asked} correct`;
        $('#quizFeedback').textContent = '';
        $('#btnQuizRestart').classList.remove('hidden');
        $$('.gender-btn').forEach((b) => { b.disabled = true; });
      }
      return;
    }

    q.locked = false;
    $$('.gender-btn').forEach((b) => {
      b.disabled = false;
      b.classList.remove('correct', 'wrong');
    });
    // Show the noun without its article so the answer isn't given away.
    $('#quizWord').textContent = word.word.replace(/^(der|die|das)\s+/i, '');
    $('#quizMeaning').textContent = word.meaning;
    $('#quizFeedback').textContent = '';
  }

  function answerQuiz(choice, button) {
    const q = state.quiz;
    if (q.locked) return;
    const word = q.pool[q.i];
    if (!word) return;

    q.locked = true;
    q.asked += 1;
    const correct = choice === word.gender;
    if (correct) q.right += 1;

    button.classList.add(correct ? 'correct' : 'wrong');
    const fb = $('#quizFeedback');
    fb.innerHTML = correct
      ? `<span class="text-emerald-400 font-semibold">Richtig! ${esc(word.word)}</span>`
      : `<span class="text-rose-400 font-semibold">Not quite — it's <span class="g-${word.gender}">${esc(word.gender)}</span> ${esc(word.word.replace(/^(der|die|das)\s+/i, ''))}</span>`;
    $('#quizScore').textContent = `${q.right} / ${q.asked}`;
    $$('.gender-btn').forEach((b) => { b.disabled = true; });

    setTimeout(() => { q.i += 1; renderQuiz(); }, correct ? 750 : 1600);
  }

  // -------------------------------------------------------------- words
  let searchTimer;
  async function loadWords(search = '') {
    const list = $('#wordList');
    let words = [];
    try {
      const qs = `?limit=400${search ? `&search=${encodeURIComponent(search)}` : ''}${levelQuery()}`;
      words = await api(`/api/words${qs}`);
    } catch (e) {
      list.innerHTML = `<p class="py-8 text-center text-sm text-rose-400">${esc(e.message)}</p>`;
      return;
    }
    if (!words.length) {
      list.innerHTML = '<p class="py-8 text-center text-sm text-slate-500">No words found.</p>';
      return;
    }
    list.innerHTML = words.map((w) => {
      const article = w.gender
        ? `<span class="mr-2 rounded-md px-1.5 py-0.5 text-xs font-bold chip-${w.gender}">${esc(w.gender)}</span>`
        : '';
      const level   = w.level
        ? `<span class="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">${esc(w.level)}</span>`
        : '';
      const plural  = w.plural  ? `<p class="mt-1 text-xs text-slate-500">pl. ${esc(w.plural)}</p>` : '';
      const example = w.example
        ? `<p class="mt-2 text-xs italic text-slate-500">${esc(w.example)}</p>` +
          (w.example_en ? `<p class="text-xs text-slate-600">${esc(w.example_en)}</p>` : '')
        : '';
      return `
        <div class="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold">${article}${esc(w.word)}${level}</p>
              <p class="mt-0.5 text-sm text-slate-400">${esc(w.meaning)}</p>
              ${plural}${example}
            </div>
            <div class="flex shrink-0 flex-col items-end gap-2">
              <span class="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">${esc(w.mastery)}</span>
              <button data-del="${w.id}" class="text-xs text-slate-600 active:text-rose-400">delete</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  // ---------------------------------------------------------------- add
  function bindAddForm() {
    const form = $('#addForm');
    const posSelect = form.part_of_speech;

    const syncNounFields = () => {
      $('#nounFields').classList.toggle('hidden', posSelect.value !== 'noun');
    };
    posSelect.addEventListener('change', syncNounFields);
    syncNounFields();

    $$('.pick').forEach((btn) => {
      btn.addEventListener('click', () => {
        const picked = form.gender.value === btn.dataset.pick ? '' : btn.dataset.pick;
        form.gender.value = picked;
        $$('.pick').forEach((b) => b.classList.toggle('ring-2', b.dataset.pick === picked));
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('#addMsg');
      const data = Object.fromEntries(new FormData(form).entries());
      const payload = {
        word: data.word.trim(),
        meaning: data.meaning.trim(),
        part_of_speech: data.part_of_speech,
        gender: data.part_of_speech === 'noun' && data.gender ? data.gender : null,
        plural: data.part_of_speech === 'noun' && data.plural ? data.plural.trim() : null,
        example: data.example ? data.example.trim() : null,
        example_en: data.example_en ? data.example_en.trim() : null,
        level: data.level || null,
      };
      try {
        await api('/api/words', { method: 'POST', body: JSON.stringify(payload) });
        msg.className = 'min-h-[1.25rem] text-center text-sm text-emerald-400';
        msg.textContent = `Saved "${payload.word}"`;
        form.reset();
        form.gender.value = '';
        $$('.pick').forEach((b) => b.classList.remove('ring-2'));
        syncNounFields();
        refreshBadge();
      } catch (err) {
        msg.className = 'min-h-[1.25rem] text-center text-sm text-rose-400';
        msg.textContent = err.message;
      }
      setTimeout(() => { msg.textContent = ''; }, 3000);
    });
  }

  // -------------------------------------------------------------- stats
  async function loadStats() {
    let s;
    try { s = await api('/api/stats'); } catch { return; }

    $('#stTotal').textContent   = s.total_words;
    $('#stDue').textContent     = s.due_today;
    $('#stLearned').textContent = s.learned;
    $('#stReviews').textContent = s.total_reviews;
    const relearn = $('#stRelearn');
    if (relearn) {
      relearn.textContent = s.relearning ?? 0;
      relearn.parentElement.classList.toggle('hidden', !s.relearning);
    }

    const levels = [
      ['new',      'New',      'bg-slate-500'],
      ['learning', 'Learning', 'bg-amber-500'],
      ['familiar', 'Familiar', 'bg-sky-500'],
      ['mastered', 'Mastered', 'bg-emerald-500'],
    ];
    const total = Math.max(s.total_words, 1);
    $('#masteryBars').innerHTML = levels.map(([key, label, colour]) => {
      const n = s.mastery[key] || 0;
      const pct = Math.round((n / total) * 100);
      return `
        <div>
          <div class="mb-1 flex justify-between text-xs">
            <span class="text-slate-300">${label}</span>
            <span class="text-slate-500">${n} · ${pct}%</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-slate-800">
            <div class="h-full ${colour}" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join('');

    const byLevel = s.by_level || {};
    $('#levelBars').innerHTML = ALL_LEVELS.map((lvl) => {
      const row  = byLevel[lvl] || { total: 0, due: 0, started: 0 };
      const pct  = row.total ? Math.round((row.started / row.total) * 100) : 0;
      return `
        <div>
          <div class="mb-1 flex justify-between text-xs">
            <span class="text-slate-300">${lvl}<span class="ml-2 text-slate-500">${row.total} words</span></span>
            <span class="text-slate-500">${row.started} started · ${row.due} due</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-slate-800">
            <div class="h-full bg-sky-500" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join('');

    const genders = [['der', 'bg-blue-600'], ['die', 'bg-rose-600'], ['das', 'bg-emerald-600']];
    $('#genderBars').innerHTML = genders.map(([g, colour]) => `
      <div class="flex-1 rounded-2xl ${colour}/20 border border-slate-800 p-3 text-center">
        <p class="text-2xl font-bold g-${g}">${s.by_gender[g] || 0}</p>
        <p class="mt-0.5 text-xs text-slate-400">${g}</p>
      </div>`).join('');
  }

  // ------------------------------------------------------------- events
  function bindEvents() {
    $$('[data-goto]').forEach((el) => el.addEventListener('click', () => goto(el.dataset.goto)));

    $('#levelBar').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-level]');
      if (btn) toggleLevel(btn.dataset.level);
    });

    $('#flashcard').addEventListener('click', () => setFlipped(!state.flipped));

    $$('#ratingRow .rate').forEach((btn) => {
      btn.addEventListener('click', () => { if (state.flipped) rate(Number(btn.dataset.rate)); });
    });

    $('#btnSkip').addEventListener('click', () => {
      if (state.queue.length < 2) return;
      state.index = (state.index + 1) % state.queue.length;
      renderCard();
    });

    $$('.gender-btn').forEach((btn) => {
      btn.addEventListener('click', () => answerQuiz(btn.dataset.gender, btn));
    });
    $('#btnQuizRestart').addEventListener('click', startQuiz);

    $('#searchInput').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadWords(e.target.value.trim()), 250);
    });

    $('#wordList').addEventListener('click', async (e) => {
      const id = e.target.dataset?.del;
      if (!id) return;
      if (!confirm('Delete this word?')) return;
      await api(`/api/words/${id}`, { method: 'DELETE' });
      loadWords($('#searchInput').value.trim());
      refreshBadge();
    });

    // Horizontal swipe on the card: left = Again, right = Good.
    const card = $('#flashcard');
    let x0 = null, y0 = null;
    card.addEventListener('touchstart', (e) => {
      x0 = e.changedTouches[0].clientX;
      y0 = e.changedTouches[0].clientY;
    }, { passive: true });
    card.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (state.flipped && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        rate(dx < 0 ? 0 : 2);
      }
    }, { passive: true });

    // Keyboard shortcuts for desktop testing.
    document.addEventListener('keydown', (e) => {
      if (state.view !== 'revise' || e.target.matches('input, textarea, select')) return;
      if (e.code === 'Space') { e.preventDefault(); setFlipped(!state.flipped); }
      if (state.flipped && ['1', '2', '3', '4'].includes(e.key)) rate(Number(e.key) - 1);
    });
  }

  // was: these ran straight away, because the server already had the words.
  // Now the word list is a file, so booting waits for it.
  DV.init('vocab.json?v=9c86d517').then(() => {
    bindAddForm();
    bindEvents();
    renderLevelBar();
    loadLevelBar();
    goto('revise');
  }).catch((err) => {
    document.body.insertAdjacentHTML('afterbegin',
      `<p class="p-4 text-center text-sm text-rose-400">Could not load the vocabulary: ${err.message}</p>`);
  });
})();


/* ---- progress backup, added for the static build ----------------------
   localStorage is per-browser and a browser can clear it. These two buttons
   are the way progress moves between the phone and the Mac, and the way it
   survives a wipe. */
(() => {
  const save = document.getElementById('btnExport');
  const load = document.getElementById('btnImport');
  const file = document.getElementById('importFile');
  if (!save || !load || !file) return;

  save.addEventListener('click', () => {
    const blob = new Blob([DV.exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vokabeln-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  load.addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const chosen = file.files[0];
    if (!chosen) return;
    const msg = document.getElementById('backupMsg');
    try {
      const n = DV.importProgress(await chosen.text());
      msg.className = 'mt-2 text-center text-xs text-emerald-400';
      msg.textContent = `Restored ${n} studied words. Reloading\u2026`;
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      msg.className = 'mt-2 text-center text-xs text-rose-400';
      msg.textContent = err.message;
    }
    file.value = '';
  });
})();
