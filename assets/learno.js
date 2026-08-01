/* learno — lesson runtime. Linked once by every lesson; nothing is generated per
   page. Configuration arrives as JSON in #lx-config, so a lesson never contains
   script of its own and nothing is escaped into a JS context. */

(function () {
  'use strict';

  // The fixed localhost is only the file:// fallback, where origin is "null".
  var SERVER = location.protocol.indexOf('http') === 0
    ? location.origin
    : 'http://localhost:9990';

  var cfg = (function () {
    var el = document.getElementById('lx-config');
    try { return el ? JSON.parse(el.textContent) : {}; }
    catch (e) { return {}; }
  })();

  var LESSON   = cfg.lesson || document.body.getAttribute('data-lesson') || '';
  var CONCEPTS = cfg.concepts || [];
  var PHASES   = cfg.phases || [];

  // Below this a section does not open.
  var PASS = 50;

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // ── server ──────────────────────────────────────────────────────────────

  var online = false;

  function setOffline(isOffline) {
    online = !isOffline;
    document.body.classList.toggle('lx-offline', isOffline);
    var banner = $('#lx-banner');
    if (banner) banner.hidden = !isOffline;
  }

  function detectServer() {
    // Starts optimistic and only degrades; the reverse flashes the fallback on load.
    return fetch(SERVER + '/api/health', { signal: AbortSignal.timeout(1500) })
      .then(function (r) { setOffline(!r.ok); })
      .catch(function () { setOffline(true); });
  }

  // ── remembering ─────────────────────────────────────────────────────────
  // A lesson is read across days, on a phone, with tabs that get closed. Losing
  // every answer to a reload made the page feel disposable and cost the reader
  // the one thing they had actually produced. Kept locally rather than on the
  // server: it is draft work, and it should survive being offline.

  var KEY = 'lx-state:' + LESSON;
  var restoring = false;

  function readState() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }

  function remember(kind, key, value) {
    if (restoring) return;
    try {
      var s = readState();
      (s[kind] = s[kind] || {})[key] = value;
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) { /* private mode, or quota — the lesson still works */ }
  }

  // Stable across reloads without adding an attribute to the markup: a recall is
  // named by its concept, a quiz by its position among quizzes, and there is only
  // ever one teach-back.
  function blockKey(el) {
    if (el.classList.contains('lx-teachback')) return 'teachback';
    var recall = el.closest ? el.closest('.lx-recall') : null;
    if (recall) return (el === recall ? 'recall:' : 'fallback:') + recall.dataset.conceptId;
    return 'quiz:' + $$('.lx-quiz').indexOf(el.closest('.lx-quiz') || el);
  }

  function forget() {
    try { localStorage.removeItem(KEY); } catch (e) { /* nothing to do */ }
    location.reload();
  }

  // ── progress ────────────────────────────────────────────────────────────

  function markPhaseDone(id) {
    var phase = $('.lx-phase[data-phase="' + id + '"]');
    if (phase) phase.classList.add('lx-phase--done');
    var i = PHASES.indexOf(String(id));
    var seg = $('.lx-progress-seg[data-seg="' + id + '"]');
    if (seg) seg.classList.add('is-done');
    return i;
  }

  // Both halves matter: the class un-blurs it, and removing aria-hidden makes it
  // exist for a screen reader again.
  function openGate(name, scroll) {
    var el = $('.lx-gate[data-gate="' + name + '"]');
    if (!el) return null;
    el.classList.remove('lx-gate--locked');
    var body = $('.lx-gate-body', el);
    if (body) body.removeAttribute('aria-hidden');
    if (scroll) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return el;
  }

  // Answering opens the next section, whatever the answer was worth. A weak one
  // only changes whether the page scrolls: it opens quietly and leaves the reader
  // looking at the feedback instead of being thrown down the page.
  function unlockNext(fromId, scroll) {
    markPhaseDone(fromId);
    var i = PHASES.indexOf(String(fromId));
    if (i < 0) return;

    // Only the teach-back. The flash cards carry the answers and stay shut until
    // it is submitted.
    if (i + 1 >= PHASES.length) {
      openGate('teachback', scroll !== false);
      return;
    }

    var next = $('.lx-phase[data-phase="' + PHASES[i + 1] + '"]');
    if (next) next.classList.remove('lx-phase--locked');
    openGate('phase-' + PHASES[i + 1], scroll !== false);
  }

  // ── verdict rendering ───────────────────────────────────────────────────

  function band(score) {
    if (score >= 90) return { cls: 'lx-score--top',  word: 'domínio' };
    if (score >= 75) return { cls: 'lx-score--good', word: 'sólido' };
    if (score >= 41) return { cls: 'lx-score--mid',  word: 'parcial' };
    return { cls: 'lx-score--bad', word: 'não compreendido' };
  }

  function showVerdict(block, data) {
    var box = $('.lx-verdict', block);
    var b   = band(data.score);

    $('.lx-score', box).className = 'lx-score ' + b.cls;
    $('.lx-score-num', box).textContent  = data.score;
    $('.lx-score-word', box).textContent = b.word;
    $('.lx-bar-fill', box).style.width   = Math.max(0, Math.min(100, data.score)) + '%';
    $('.lx-feedback', box).textContent   = data.feedback || '';

    var misses = $('.lx-misses', box);
    misses.innerHTML = '';
    (data.misconceptions || []).forEach(function (m) {
      var li = document.createElement('li');
      li.textContent = m;
      misses.appendChild(li);
    });

    var tags = $('.lx-concepts', box);
    if (tags) {
      tags.innerHTML = '';
      (data.concepts_demonstrated || []).forEach(function (c) {
        var el = document.createElement('span');
        el.className = 'lx-badge';
        el.textContent = c;
        tags.appendChild(el);
      });
    }

    box.classList.add('is-shown');
  }

  function fail(block, message) {
    var box = $('.lx-verdict', block);
    $('.lx-score', box).className = 'lx-score lx-score--bad';
    $('.lx-score-num', box).textContent  = '—';
    $('.lx-score-word', box).textContent = 'erro';
    $('.lx-bar-fill', box).style.width   = '0';
    $('.lx-feedback', box).textContent   = message;
    $('.lx-misses', box).innerHTML = '';
    box.classList.add('is-shown');
  }

  // Pass the server's own sentence through; a status code is not actionable.
  function readVerdict(r) {
    if (r.ok) return r.json();
    return r.json().catch(function () { return {}; }).then(function (body) {
      throw new Error(body.error || ('servidor respondeu ' + r.status));
    });
  }

  function busy(btn, isBusy, label) {
    btn.disabled = isBusy;
    if (isBusy) {
      btn.dataset.label = btn.textContent;
      btn.textContent = label || 'Validando…';
    } else if (btn.dataset.label) {
      btn.textContent = btn.dataset.label;
    }
  }

  // ── recall ──────────────────────────────────────────────────────────────

  function validate(block, btn) {
    var answer = $('.lx-answer', block).value.trim();
    if (!answer) { fail(block, 'Escreva uma resposta antes de validar.'); return; }

    busy(btn, true);
    fetch(SERVER + '/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concept_id:        block.dataset.conceptId,
        section_summary:   block.dataset.summary,
        user_answer:       answer,
        valid_concept_ids: CONCEPTS,
        lesson_id:         LESSON
      })
    })
      .then(readVerdict)
      .then(function (data) {
        showVerdict(block, data);
        remember('verdicts', blockKey(block), data);
        // Never gated on the score. A gap is for the tutor to act on — it reads
        // the score and closes the gap with the next lesson or review; a page
        // that locks someone out of their own material cannot teach them the
        // thing they just got wrong.
        if (block.dataset.phase) unlockNext(block.dataset.phase, data.score >= PASS);
      })
      .catch(function (err) {
        // Never render an error as a score: 0 would say they were wrong when
        // nothing evaluated the answer.
        fail(block, 'Não deu para validar agora (' + err.message + '). Sua resposta continua aí.');
      })
      .finally(function () { busy(btn, false); });
  }

  // ── multiple choice, used by quiz and by recall's offline fallback ───────

  // Answering opens the next section, right or wrong — the same rule recall
  // follows. What a miss changes is the invitation to try again: the choices stay
  // live and the correct one stays unmarked until it is chosen, so a retry is
  // still worth something. Revealing it on the first miss would make the retry a
  // formality.
  function answerChoice(scope, input, phaseId, okText, badText) {
    var correct = input.dataset.correct === '1';
    $$('input[type="radio"]', scope).forEach(function (i) {
      var label = i.closest('.lx-choice');
      label.classList.toggle('is-correct', correct && i.dataset.correct === '1');
      label.classList.toggle('is-wrong', !correct && i === input);
      i.disabled = correct;
    });
    var fb = $('.lx-inline-fb', scope);
    if (fb) {
      fb.textContent = correct ? okText : badText;
      fb.className = 'lx-inline-fb is-shown ' + (correct ? 'is-ok' : 'is-bad');
    }
    remember('choices', blockKey(scope), $$('input[type="radio"]', scope).indexOf(input));
    if (phaseId) unlockNext(phaseId, correct && !restoring);
  }

  // ── teach-back ──────────────────────────────────────────────────────────

  function teachback(block, btn) {
    var answer = $('.lx-answer', block).value.trim();
    if (!answer) { fail(block, 'Escreva sua explicação antes de encerrar.'); return; }

    var concepts = (block.dataset.concepts || '').split(',').filter(Boolean);

    busy(btn, true, 'Avaliando…');
    fetch(SERVER + '/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concept_id:        concepts[0] || '',
        section_summary:   'Teach-back final da lição ' + LESSON,
        user_answer:       answer,
        valid_concept_ids: CONCEPTS,
        is_teachback:      true,
        lesson_id:         LESSON
      })
    })
      .then(readVerdict)
      .then(function (data) {
        showVerdict(block, data);
        remember('verdicts', blockKey(block), data);
        return fetch(SERVER + '/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lesson_id:             LESSON,
            final_score:           data.score,
            concepts_demonstrated: data.concepts_demonstrated || []
          })
        })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (saved) { remember('done', 'done', saved || {}); showDone(data, saved); });
      })
      .catch(function (err) {
        fail(block, 'Não deu para encerrar agora (' + err.message + '). Sua explicação continua aí.');
      })
      .finally(function () { busy(btn, false); });
  }

  function showDone(verdict, saved) {
    var done = $('.lx-done');
    if (!done) return;
    var date = $('.lx-next-review-date', done);
    var note = $('.lx-next-review-note', done);

    if (saved && saved.next_review) {
      date.textContent = saved.next_review;
      note.textContent = saved.concepts_updated + ' conceito(s) agendado(s) pelo SM-2.';
    } else {
      // Scored but not recorded — do not show a date that was never written.
      date.textContent = 'não agendada';
      note.textContent = 'A lição foi avaliada, mas o progresso não pôde ser salvo.';
    }
    PHASES.forEach(markPhaseDone);
    openGate('flashcards');
    done.classList.add('is-shown');
    done.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── dictation ───────────────────────────────────────────────────────────

  function setupMic(block) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var btn = $('.lx-mic', block);
    if (!btn) return;
    if (!SR || !navigator.mediaDevices) return;   // stays hidden

    var lang = $('[data-role="lang"]', block);
    var hint = $('.lx-mic-hint', block);
    var area = $('.lx-answer', block);
    btn.hidden = false;
    if (lang) lang.hidden = false;

    var rec = null, active = false;

    btn.addEventListener('click', function () {
      if (active) { if (rec) rec.stop(); return; }

      rec = new SR();
      rec.lang = lang ? lang.value : 'pt-BR';
      rec.continuous = true;
      rec.interimResults = false;

      rec.onstart = function () {
        active = true;
        btn.classList.add('is-recording');
        btn.textContent = '⏹ Parar';
        hint.textContent = 'ouvindo…';
      };
      rec.onresult = function (e) {
        for (var i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            area.value = (area.value ? area.value + ' ' : '') + e.results[i][0].transcript.trim();
          }
        }
      };
      rec.onerror = function (e) {
        // Arc fails silently rather than prompting, so the reason goes on screen.
        hint.textContent = 'microfone falhou (' + e.error + ') — tente Safari ou Chrome';
      };
      rec.onend = function () {
        active = false;
        btn.classList.remove('is-recording');
        btn.textContent = '🎙 Ditar';
        if (hint.textContent === 'ouvindo…') hint.textContent = '';
      };
      rec.start();
    });
  }


  // Three states, not two: without "auto" the first click permanently opts the
  // reader out of following their system.

  // "auto" and "azul" are the absence of an attribute, not a value — the
  // stylesheet's defaults are already those, so setting them would be a second
  // place for the same fact to live.
  function applyPref(kind, choice, dflt) {
    var attr = 'data-' + kind, root = document.documentElement;
    if (choice === dflt) root.removeAttribute(attr);
    else root.setAttribute(attr, choice);

    $$('[data-' + kind + '-set]').forEach(function (b) {
      var on = b.dataset[kind + 'Set'] === choice;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });

    try { localStorage.setItem('lx-' + kind, choice); } catch (e) { /* private mode */ }
  }

  function setupPrefs() {
    [['theme', 'auto'], ['accent', 'azul']].forEach(function (pair) {
      var kind = pair[0], dflt = pair[1], stored = dflt;
      try { stored = localStorage.getItem('lx-' + kind) || dflt; } catch (e) { /* private mode */ }
      applyPref(kind, stored, dflt);

      $$('[data-' + kind + '-set]').forEach(function (btn) {
        btn.addEventListener('click', function () { applyPref(kind, btn.dataset[kind + 'Set'], dflt); });
      });
    });
  }

  // ── restoring ───────────────────────────────────────────────────────────
  // Replays what was answered through the same code paths that answered it, so
  // there is one definition of what a rendered answer looks like. `restoring`
  // suppresses the two things a replay must not do: write the state back, and
  // scroll — the reader chose where they were, not this.

  function restore() {
    var s = readState();
    if (!s.choices && !s.answers && !s.verdicts) return;

    restoring = true;

    Object.keys(s.answers || {}).forEach(function (key) {
      $$('.lx-recall, .lx-teachback').forEach(function (block) {
        var box = $('.lx-answer', block);
        if (box && blockKey(block) === key) box.value = s.answers[key];
      });
    });

    Object.keys(s.verdicts || {}).forEach(function (key) {
      $$('.lx-recall, .lx-teachback').forEach(function (block) {
        if (blockKey(block) !== key) return;
        showVerdict(block, s.verdicts[key]);
        if (block.dataset.phase) unlockNext(block.dataset.phase, false);
      });
    });

    Object.keys(s.choices || {}).forEach(function (key) {
      $$('.lx-quiz, .lx-fallback').forEach(function (scope) {
        if (blockKey(scope) !== key) return;
        var input = $$('input[type="radio"]', scope)[s.choices[key]];
        if (!input) return;
        input.checked = true;
        var owner = scope.closest('.lx-recall') || scope;
        answerChoice(scope, input, owner.dataset.phase,
          owner.dataset.ok || 'Correto.', owner.dataset.bad || 'Não é essa.');
      });
    });

    if (s.done) {
      var tb = $('.lx-teachback');
      var verdict = tb && s.verdicts && s.verdicts.teachback;
      if (verdict) showDone(verdict, s.done.done);
    }

    restoring = false;
  }

  // ── wiring ──────────────────────────────────────────────────────────────

  function init() {
    $$('.lx-recall').forEach(function (block) {
      var btn = $('[data-action="validate"]', block);
      if (btn) btn.addEventListener('click', function () { validate(block, btn); });
      setupMic(block);

      $$('.lx-fallback input[type="radio"]', block).forEach(function (input) {
        input.addEventListener('change', function () {
          var fb = block.querySelector('.lx-fallback');
          answerChoice(fb, input, block.dataset.phase,
            block.dataset.ok || 'Correto.', block.dataset.bad || 'Não é essa.');
        });
      });
    });

    $$('.lx-quiz').forEach(function (block) {
      $$('input[type="radio"]', block).forEach(function (input) {
        input.addEventListener('change', function () {
          answerChoice(block, input, block.dataset.phase, block.dataset.ok, block.dataset.bad);
        });
      });
    });

    $$('.lx-teachback').forEach(function (block) {
      var btn = $('[data-action="teachback"]', block);
      if (btn) btn.addEventListener('click', function () { teachback(block, btn); });
      setupMic(block);
    });

    // Every draft is kept, not just submitted ones: the answer half-written when
    // the tab closed is the one worth not losing.
    $$('.lx-recall, .lx-teachback').forEach(function (block) {
      var box = $('.lx-answer', block);
      if (box) box.addEventListener('input', function () { remember('answers', blockKey(block), box.value); });
    });

    $$('[data-action="restart"]').forEach(function (btn) {
      btn.addEventListener('click', forget);
    });

    setupPrefs();

    // No phases means nothing to gate behind — otherwise the component gallery
    // would render permanently locked.
    if (!PHASES.length) $$('.lx-gate').forEach(function (g) { openGate(g.dataset.gate); });

    restore();

    detectServer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
