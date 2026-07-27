/* ============================================================================
   learno — lesson runtime
   Linked once by every lesson; nothing here is generated per page.

   The page ships its configuration as JSON in #lx-config rather than as
   generated code, so a lesson never contains executable script of its own and
   the renderer never has to escape anything into a JS context.
   ========================================================================= */

(function () {
  'use strict';

  // Same origin as the page, so a lesson works on localhost, behind a tunnel,
  // and on a phone without anything being rebuilt. The fixed localhost is only
  // the fallback for a page opened over file://, where origin is "null".
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

  // Below this, a section does not open. Recognising the shape of an answer is
  // not the same as being able to give one, and letting a 30 through would make
  // the gate decorative.
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
    // A lesson must render before this resolves, so the page starts optimistic
    // and only degrades — the reverse would flash the fallback on every load.
    return fetch(SERVER + '/api/health', { signal: AbortSignal.timeout(1500) })
      .then(function (r) { setOffline(!r.ok); })
      .catch(function () { setOffline(true); });
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

  function unlockNext(fromId) {
    markPhaseDone(fromId);
    var i = PHASES.indexOf(String(fromId));
    if (i < 0 || i + 1 >= PHASES.length) return;
    var next = $('.lx-phase[data-phase="' + PHASES[i + 1] + '"]');
    if (!next) return;
    next.classList.remove('lx-phase--locked');
    next.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      .then(function (r) {
        if (!r.ok) throw new Error('servidor respondeu ' + r.status);
        return r.json();
      })
      .then(function (data) {
        showVerdict(block, data);
        if (data.score >= PASS && block.dataset.phase) unlockNext(block.dataset.phase);
      })
      .catch(function (err) {
        // An error must never look like a bad score — a failed request that
        // rendered as 0 would tell the reader they were wrong when they were not.
        fail(block, 'Não deu para validar agora (' + err.message + '). Sua resposta continua aí.');
      })
      .finally(function () { busy(btn, false); });
  }

  // ── multiple choice, used by quiz and by recall's offline fallback ───────

  function answerChoice(scope, input, phaseId, okText, badText) {
    var correct = input.dataset.correct === '1';
    $$('input[type="radio"]', scope).forEach(function (i) {
      var label = i.closest('.lx-choice');
      label.classList.toggle('is-correct', i.dataset.correct === '1');
      label.classList.toggle('is-wrong', i.checked && i.dataset.correct !== '1');
      i.disabled = true;
    });
    var fb = $('.lx-inline-fb', scope);
    if (fb) {
      fb.textContent = correct ? okText : badText;
      fb.className = 'lx-inline-fb is-shown ' + (correct ? 'is-ok' : 'is-bad');
    }
    if (correct && phaseId) unlockNext(phaseId);
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
      .then(function (r) {
        if (!r.ok) throw new Error('servidor respondeu ' + r.status);
        return r.json();
      })
      .then(function (data) {
        showVerdict(block, data);
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
          .then(function (saved) { showDone(data, saved); });
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
      // Scored but not recorded: say so, rather than showing a date that was
      // never written.
      date.textContent = 'não agendada';
      note.textContent = 'A lição foi avaliada, mas o progresso não pôde ser salvo.';
    }
    PHASES.forEach(markPhaseDone);
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
        // Some browsers (Arc among them) fail here silently rather than
        // prompting, so the reason is put on screen instead of the console.
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


  // ── theme ───────────────────────────────────────────────────────────────
  // Three states, not two: "auto" has to stay reachable, otherwise the first
  // click permanently opts the reader out of following their system.

  function applyTheme(choice) {
    if (choice === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', choice);

    $$('.lx-theme-btn').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.themeSet === choice);
      b.setAttribute('aria-pressed', String(b.dataset.themeSet === choice));
    });

    try { localStorage.setItem('lx-theme', choice); } catch (e) { /* private mode */ }
  }

  function setupTheme() {
    var stored = 'auto';
    try { stored = localStorage.getItem('lx-theme') || 'auto'; } catch (e) { /* private mode */ }
    applyTheme(stored);

    $$('.lx-theme-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { applyTheme(btn.dataset.themeSet); });
    });
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

    setupTheme();
    detectServer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
