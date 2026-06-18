# LESSON-FORMAT — Formato de lição do skill `learno`

Toda lição do `learn` é um arquivo HTML auto-contido em `./lessons/`, nomeado `NNNN-dash-case-name.html`.
Este documento define a estrutura obrigatória. Cada seção marcada com `[OBRIGATÓRIO]` deve estar presente em toda lição.

---

## Estrutura completa de uma lição

```
[OBRIGATÓRIO] 1. Header
[OBRIGATÓRIO] 2. Barra de progresso
[OBRIGATÓRIO] 3. Analogia da vida real
[OBRIGATÓRIO] 4. Seções de conteúdo (1–N)
               └── por seção: conceito → diagrama SVG → prática (varia o tipo)
                   ├── Tipo A: recall escrito + ditado por voz (validação IA)
                   └── Tipo B: quiz de múltipla escolha (1ª classe, sem servidor)
[OBRIGATÓRIO] 5. "Ensina de volta" (teach-back final)
[OBRIGATÓRIO] 6. Revisão imediata (flash cards inline)
[OBRIGATÓRIO] 7. Footer com fonte primária e links
[OBRIGATÓRIO] 8. Script de detecção de servidor + fallback offline
```

---

## 1. Header

```html
<header>
  <div class="lesson-tag">Lesson NN · [Tópico]</div>
  <h1>[Título da lição]</h1>
  <p class="subtitle">[Uma frase descrevendo o que o usuário vai conseguir fazer]</p>
  <div class="offline-banner" id="offline-banner" style="display:none">
    ⚠️ Servidor offline — usando modo básico.
    Para validação por IA, rode: <code>npm start</code> em <code>skill/server/</code>
  </div>
</header>
```

O `offline-banner` começa oculto e é mostrado pelo script de detecção (seção 8).

---

## 2. Barra de progresso

Uma barra segmentada — um segmento por seção de conteúdo + 1 para o teach-back.
Cada segmento fica azul quando a seção correspondente é concluída.

```html
<div class="progress-bar">
  <div class="progress-seg" id="seg1"></div>
  <!-- repetir por seção -->
  <div class="progress-seg" id="seg-teachback"></div>
</div>
```

---

## 3. Analogia da vida real [OBRIGATÓRIO — vem antes de qualquer conceito técnico]

Deve relacionar o conceito com algo do cotidiano do usuário.
Claude deve ler `NOTES.md` para escolher a analogia mais próxima do contexto/stack do usuário.
O nome técnico do conceito só aparece **depois** da analogia.

```html
<div class="analogy-box">
  <div class="analogy-label">Antes de começar</div>
  <p>[Analogia em 2–4 frases. Cotidiano do usuário. Sem jargão técnico.]</p>
  <p class="analogy-bridge">
    Em sistema design, isso se chama <strong>[NOME DO CONCEITO]</strong>.
  </p>
</div>
```

**Exemplos de analogias boas:**
- Cache → prateleira da geladeira (o que você usa todo dia fica na frente, não no fundo do freezer)
- Load balancer → caixas do supermercado (distribuir fila entre atendentes para ninguém esperar demais)
- Sharding → separar arquivos por letra (A–M numa gaveta, N–Z noutra)
- Replicação → backup automático de fotos no iCloud (cópia em outro lugar, disponível mesmo se o telefone quebrar)

---

## 4. Seções de conteúdo

Cada seção ensina **um único conceito ou decisão**. Uma lição tem entre 2 e 5 seções.
Cada seção segue esta ordem interna:

### 4a. Título e contexto

```html
<div class="phase">
  <div class="phase-header">
    <span class="phase-badge badge-N">Parte N</span>
    <span class="phase-title">[Título da seção]</span>
  </div>
  <div class="phase-body [locked se não for a primeira]" id="bodyN">
```

A primeira seção começa desbloqueada. As demais começam com classe `locked` e são desbloqueadas via JS quando a seção anterior é concluída.

### 4b. Diagrama SVG [OBRIGATÓRIO por seção]

Deve aparecer junto com a explicação do conceito, não depois.
Use SVG inline — sem CDN, sem dependências externas.

**Tipos de diagrama por contexto:**

*Fluxo de requisição:*
```html
<div class="diagram-wrap">
  <svg viewBox="0 0 600 120" xmlns="http://www.w3.org/2000/svg" class="diagram-svg">
    <!-- boxes -->
    <rect x="10" y="40" width="100" height="40" rx="6" fill="#eff6ff" stroke="#2563eb"/>
    <text x="60" y="65" text-anchor="middle" font-size="12" fill="#1e40af">Cliente</text>
    <!-- arrow -->
    <line x1="110" y1="60" x2="160" y2="60" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arrow)"/>
    <!-- next box -->
    <rect x="160" y="40" width="120" height="40" rx="6" fill="#eff6ff" stroke="#2563eb"/>
    <text x="220" y="65" text-anchor="middle" font-size="12" fill="#1e40af">Load Balancer</text>
    <!-- arrowhead definition -->
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8"/>
      </marker>
    </defs>
  </svg>
</div>
```

*Comparação lado a lado:*
```html
<div class="compare-grid">
  <div class="compare-col">
    <div class="compare-label">Opção A</div>
    <svg ...><!-- diagrama A --></svg>
    <p>[descrição A]</p>
  </div>
  <div class="compare-col">
    <div class="compare-label">Opção B</div>
    <svg ...><!-- diagrama B --></svg>
    <p>[descrição B]</p>
  </div>
</div>
```

### 4c. Prática interativa — escolha o tipo por seção

Cada seção tem uma pergunta que o usuário responde antes de ver a explicação.
Para a aula não virar monótona, **varie o tipo de interação entre as seções**. Há dois tipos.

> **Regra pedagógica (obrigatória).** Escrever/falar é *recall* (esforço alto, retém muito);
> múltipla escolha é *recognition* (esforço baixo, retém menos). Por isso:
> - **No mínimo 1 seção de recall escrito (Tipo A) por lição.**
> - **O teach-back final é SEMPRE Tipo A** (é ele que alimenta o SM-2).
> - Use o Tipo B (quiz) para **aquecer, checar fato rápido ou variar o ritmo** — nunca para
>   substituir todo o recall. Variedade a serviço do conteúdo, não novidade por novidade.

#### Tipo A — Recall escrito (com ditado por voz) [≥1 por lição]

Textarea com validação Gemini quando online; múltipla escolha de fallback quando offline.
**Novidade:** todo textarea ganha um botão 🎤 que dita por voz (Web Speech API) e preenche o
campo — o texto continua editável, então o usuário revisa antes de enviar. Falar a explicação
em voz alta treina o formato real de "explicar no whiteboard".

```html
<!-- MODO ONLINE: textarea com validação IA + ditado por voz -->
<div class="ai-validate-block" id="validate-N" data-concept-id="[ID do glossário]"
     data-section-summary="[resumo do conceito desta seção em 1–2 frases]">
  <div class="q-label">[Pergunta aberta]</div>
  <textarea class="answer-textarea" id="answer-N"
    placeholder="Explique com suas palavras... (ou clique em 🎤 para falar)"></textarea>
  <div class="answer-tools">
    <button type="button" class="mic-btn" data-target="answer-N" title="Ditar por voz">🎤 Falar</button>
  </div>
  <button class="btn" onclick="validateSection('N')">Validar com IA</button>
  <div class="ai-result" id="result-N" style="display:none">
    <div class="score-display" id="score-N"></div>
    <div class="ai-feedback" id="feedback-N"></div>
  </div>
</div>

<!-- MODO OFFLINE: múltipla escolha (começa oculto, mostrado quando offline) -->
<div class="offline-fallback" id="fallback-N" style="display:none">
  <div class="q-label">[Mesma pergunta]</div>
  <div class="radio-group">
    <label><input type="radio" name="q-N" value="a"/> [Opção A]</label>
    <label><input type="radio" name="q-N" value="b"/> [Opção B — correta]</label>
    <label><input type="radio" name="q-N" value="c"/> [Opção C]</label>
  </div>
  <button class="btn" onclick="checkOffline('N', 'b', '[feedback correto]', '[feedback errado]')">
    Verificar
  </button>
  <div class="inline-fb" id="fb-offline-N"></div>
</div>
```

#### Tipo B — Quiz de múltipla escolha [1ª classe, para variar]

Mesma mecânica da múltipla escolha, mas é a interação **principal** da seção — fica **sempre
visível** (online e offline) porque não depende de servidor nem de IA. Reaproveita `checkOffline`.
Como não passa pela IA, **não persiste score** no Mongo: é checagem leve, o SM-2 continua vindo do teach-back.

```html
<!-- TIPO B: quiz sempre visível — NÃO usar as classes ai-validate-block / offline-fallback -->
<div class="quiz-block" id="quiz-N">
  <div class="q-label">[Pergunta de múltipla escolha]</div>
  <div class="radio-group">
    <label><input type="radio" name="q-N" value="a"/> [Opção A]</label>
    <label><input type="radio" name="q-N" value="b"/> [Opção B — correta]</label>
    <label><input type="radio" name="q-N" value="c"/> [Opção C]</label>
  </div>
  <button class="btn" onclick="checkOffline('N', 'b', '[feedback correto]', '[feedback errado]')">
    Verificar
  </button>
  <div class="inline-fb" id="fb-offline-N"></div>
</div>
```

**Regra de desbloqueio:** a próxima seção só desbloqueia quando:
- Tipo A online: score ≥ 50 (qualquer tentativa conta — o objetivo é engajamento, não bloqueio)
- Tipo A offline / Tipo B: resposta correta na múltipla escolha

---

## 5. "Ensina de volta" (teach-back final) [OBRIGATÓRIO]

Última seção antes dos flash cards. O usuário explica o tema completo da lição em suas palavras.
Este score é o **mastery score da lição** — é o que determina o schedule SM-2.

```html
<div class="phase" id="phase-teachback">
  <div class="phase-header">
    <span class="phase-badge badge-final">Ensina de volta</span>
    <span class="phase-title">Explique como se fosse ensinar um colega</span>
  </div>
  <div class="phase-body locked" id="body-teachback">
    <p class="q-sub">
      Imagine que um colega nunca ouviu falar de [TEMA DA LIÇÃO].
      Explique o conceito, quando usá-lo e qual o principal risco.
      Não precisa ser perfeito — escreva o que você entendeu.
    </p>

    <!-- Online -->
    <div class="ai-validate-block" id="validate-teachback"
         data-concept-id="[IDs dos conceitos da lição, separados por vírgula]"
         data-section-summary="[Resumo completo da lição]"
         data-is-teachback="true">
      <textarea class="answer-textarea answer-textarea--large" id="answer-teachback"
        placeholder="Escreva sua explicação aqui... (ou clique em 🎤 para falar)"></textarea>
      <div class="answer-tools">
        <button type="button" class="mic-btn" data-target="answer-teachback" title="Ditar por voz">🎤 Falar</button>
      </div>
      <button class="btn" onclick="validateTeachback()">Enviar para avaliação</button>
      <div class="ai-result" id="result-teachback" style="display:none">
        <div class="score-display" id="score-teachback"></div>
        <div class="score-bar-wrap">
          <div class="score-bar" id="score-bar-teachback"></div>
        </div>
        <div class="ai-feedback" id="feedback-teachback"></div>
        <div class="concepts-demonstrated" id="concepts-teachback"></div>
      </div>
    </div>

    <!-- Offline fallback para teach-back -->
    <div class="offline-fallback" id="fallback-teachback" style="display:none">
      <p style="color:var(--muted); font-size:0.9rem">
        Validação IA indisponível. Responda às perguntas de revisão abaixo.
      </p>
      <!-- múltipla escolha de revisão geral da lição -->
    </div>

  </div>
</div>
```

---

## 6. Revisão imediata — flash cards inline [OBRIGATÓRIO]

Aparece após o teach-back ser concluído. Mostra os conceitos-chave da lição como flash cards.
O usuário clica para revelar. Não tem score — é consolidação visual antes de fechar a página.

```html
<div id="flashcard-section" style="display:none">
  <hr/>
  <div class="flashcard-header">Revisão imediata — antes de fechar</div>
  <p class="q-sub">Clique em cada card para revelar. Não precisa acertar — o objetivo é ativar a memória.</p>

  <div class="flashcard-grid">

    <div class="flashcard" onclick="this.classList.toggle('flipped')">
      <div class="flashcard-front">O que é [CONCEITO 1]?</div>
      <div class="flashcard-back">[Definição curta — 1–2 frases]</div>
    </div>

    <div class="flashcard" onclick="this.classList.toggle('flipped')">
      <div class="flashcard-front">Quando usar [CONCEITO 2]?</div>
      <div class="flashcard-back">[Resposta curta]</div>
    </div>

    <!-- 3–5 cards por lição -->

  </div>

  <div class="next-review-box" id="next-review-box" style="display:none">
    <strong>Próxima revisão agendada:</strong>
    <span id="next-review-date"></span>
    <!-- preenchido pelo JS após salvar no MongoDB -->
  </div>
</div>
```

**CSS dos flash cards:**
```css
.flashcard {
  perspective: 600px;
  cursor: pointer;
}
.flashcard-front, .flashcard-back {
  backface-visibility: hidden;
  transition: transform 0.4s;
}
.flashcard.flipped .flashcard-front { transform: rotateY(180deg); }
.flashcard.flipped .flashcard-back  { transform: rotateY(0deg); }
```

---

## 7. Footer [OBRIGATÓRIO]

```html
<footer>
  <strong>Fonte primária:</strong>
  <div class="source-box">[Livro/artigo/vídeo mais autoritativo sobre o tema]</div>
  <p><strong>Referência:</strong>
    <a href="../reference/glossary.html">Glossário</a> ·
    <a href="[lição anterior]">Lição anterior</a>
  </p>
  <p>Dúvidas? Pergunte ao professor — é para isso que estou aqui.</p>
</footer>
```

---

## 8. Script de detecção de servidor + lógica central [OBRIGATÓRIO]

Todo HTML de lição deve incluir este bloco de script no final do `<body>`.

```javascript
// ── Detecção de servidor ────────────────────────────────────
const SERVER = 'http://localhost:9990';
let serverOnline = false;

async function detectServer() {
  try {
    const r = await fetch(`${SERVER}/api/health`, { signal: AbortSignal.timeout(1500) });
    serverOnline = r.ok;
  } catch {
    serverOnline = false;
  }
  if (!serverOnline) {
    document.getElementById('offline-banner').style.display = 'block';
    // Trocar todos os blocos ai-validate por offline-fallback
    // (quiz-block NÃO é tocado — é 1ª classe e funciona sem servidor)
    document.querySelectorAll('.ai-validate-block').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.offline-fallback').forEach(el => el.style.display = 'block');
  }
}
detectServer();

// ── Ditado por voz (Web Speech API) ─────────────────────────
// Cada .mic-btn dita para a textarea apontada por data-target. O texto fica
// editável (fonte de verdade). Navegador sem suporte → o botão some.
function setupDictation() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btns = document.querySelectorAll('.mic-btn');
  if (!SR) { btns.forEach(b => b.style.display = 'none'); return; }

  btns.forEach(btn => {
    const target = document.getElementById(btn.dataset.target);
    let rec = null, active = false;

    btn.addEventListener('click', () => {
      if (active) { rec && rec.stop(); return; }       // segundo clique = parar
      rec = new SR();
      rec.lang = 'pt-BR';
      rec.interimResults = true;
      rec.continuous = true;

      let base = target.value ? target.value.trimEnd() + ' ' : '';
      rec.onresult = (e) => {
        let finalTxt = '', interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalTxt += t; else interim += t;
        }
        if (finalTxt) base += finalTxt + ' ';
        target.value = base + interim;                 // mostra parcial enquanto fala
      };
      const reset = () => { active = false; btn.classList.remove('recording'); btn.textContent = '🎤 Falar'; };
      rec.onend = reset;
      rec.onerror = reset;

      rec.start();
      active = true;
      btn.classList.add('recording');
      btn.textContent = '⏹ Parar';
    });
  });
}
setupDictation();

// ── Validação online (Gemini via servidor) ──────────────────
async function validateSection(sectionId) {
  const block = document.getElementById(`validate-${sectionId}`);
  const answer = document.getElementById(`answer-${sectionId}`).value.trim();
  if (!answer) return;

  const conceptId = block.dataset.conceptId;
  const summary   = block.dataset.sectionSummary;

  const res = await fetch(`${SERVER}/api/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ concept_id: conceptId, section_summary: summary, user_answer: answer })
  });
  const data = await res.json();

  document.getElementById(`score-${sectionId}`).textContent = `${data.score}/100`;
  document.getElementById(`feedback-${sectionId}`).textContent = data.feedback;
  document.getElementById(`result-${sectionId}`).style.display = 'block';

  if (data.score >= 50) unlockNext(sectionId);
}

async function validateTeachback() {
  const answer = document.getElementById('answer-teachback').value.trim();
  if (!answer) return;

  const block     = document.getElementById('validate-teachback');
  const conceptId = block.dataset.conceptId;
  const summary   = block.dataset.sectionSummary;

  const res = await fetch(`${SERVER}/api/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      concept_id: conceptId,
      section_summary: summary,
      user_answer: answer,
      is_teachback: true,
      lesson_id: LESSON_ID   // constante definida no topo do script de cada lição
    })
  });
  const data = await res.json();

  document.getElementById('score-teachback').textContent = `${data.score}/100`;
  document.getElementById('score-bar-teachback').style.width = `${data.score}%`;
  document.getElementById('feedback-teachback').textContent = data.feedback;

  if (data.concepts_demonstrated?.length) {
    document.getElementById('concepts-teachback').textContent =
      'Conceitos demonstrados: ' + data.concepts_demonstrated.join(', ');
  }
  document.getElementById('result-teachback').style.display = 'block';

  // Salvar progresso + SM-2
  const prog = await fetch(`${SERVER}/api/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lesson_id: LESSON_ID,
      final_score: data.score,
      concepts_demonstrated: data.concepts_demonstrated || []
    })
  });
  const progData = await prog.json();

  // Mostrar flash cards e próxima revisão
  document.getElementById('flashcard-section').style.display = 'block';
  if (progData.next_review) {
    document.getElementById('next-review-date').textContent = progData.next_review;
    document.getElementById('next-review-box').style.display = 'block';
  }

  markProgress('seg-teachback');
}

// ── Fallback offline ────────────────────────────────────────
function checkOffline(sectionId, correctValue, feedbackOk, feedbackBad) {
  const sel = document.querySelector(`input[name="q-${sectionId}"]:checked`);
  if (!sel) return;
  const el = document.getElementById(`fb-offline-${sectionId}`);
  const isCorrect = sel.value === correctValue;
  el.className = `inline-fb show ${isCorrect ? 'ok' : 'bad'}`;
  el.textContent = isCorrect ? feedbackOk : feedbackBad;
  document.querySelectorAll(`input[name="q-${sectionId}"]`).forEach(i => {
    i.parentElement.classList.add(i.value === correctValue ? 'correct' : (i.checked ? 'wrong' : ''));
    i.disabled = true;
  });
  if (isCorrect) unlockNext(sectionId);
}

// ── Helpers ─────────────────────────────────────────────────
function unlockNext(currentId) {
  // Cada lição define sua sequência de desbloqueio
  // Exemplo: const UNLOCK_SEQUENCE = ['1','2','3','teachback']
  const idx = UNLOCK_SEQUENCE.indexOf(currentId);
  if (idx >= 0 && idx < UNLOCK_SEQUENCE.length - 1) {
    const nextId = UNLOCK_SEQUENCE[idx + 1];
    const nextBody = document.getElementById(`body${nextId === 'teachback' ? '-teachback' : nextId}`);
    if (nextBody) {
      nextBody.classList.remove('locked');
      nextBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  markProgress(`seg${currentId}`);
}

function markProgress(segId) {
  const seg = document.getElementById(segId);
  if (seg) seg.classList.add('done');
}
```

**Constantes que cada lição define no topo do seu script:**
```javascript
const LESSON_ID = '0004-caching';                          // ID da lição
const UNLOCK_SEQUENCE = ['1', '2', '3', 'teachback'];      // ordem das seções
```

---

## CSS base obrigatório

Todo lição inclui estas variáveis e classes base (além do CSS específico de conteúdo):

```css
:root {
  --ink: #1a1a1a;
  --muted: #666;
  --rule: #e2e2e2;
  --accent: #2563eb;
  --correct: #16a34a;
  --wrong: #dc2626;
  --warn: #d97706;
  --surface: #f8f8f8;
  --highlight: #eff6ff;
}

.offline-banner {
  background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px;
  padding: 0.6rem 1rem; margin-top: 0.75rem; font-size: 0.85rem; color: #92400e;
}

.analogy-box {
  background: #f0fdf4; border-left: 3px solid #16a34a;
  padding: 1rem 1.25rem; margin-bottom: 2rem; border-radius: 0 6px 6px 0;
}
.analogy-label { font-family: monospace; font-size: 0.7rem; text-transform: uppercase;
  letter-spacing: 0.08em; color: #15803d; margin-bottom: 0.4rem; }
.analogy-bridge { margin-top: 0.75rem; font-style: italic; color: var(--muted); }

.diagram-wrap { margin: 1.25rem 0; overflow-x: auto; }
.diagram-svg  { max-width: 100%; height: auto; }

.answer-textarea {
  width: 100%; min-height: 90px; padding: 0.75rem; border: 1px solid var(--rule);
  border-radius: 6px; font-family: inherit; font-size: 0.92rem; resize: vertical;
  margin-top: 0.5rem;
}
.answer-textarea--large { min-height: 140px; }

.answer-tools { margin-top: 0.4rem; }
.mic-btn { font: inherit; font-size: 0.82rem; padding: 0.3rem 0.7rem; border: 1px solid var(--rule);
  border-radius: 6px; background: #fff; color: var(--muted); cursor: pointer; transition: all 0.15s; }
.mic-btn:hover { border-color: var(--accent); color: var(--accent); }
.mic-btn.recording { background: #fef2f2; border-color: var(--wrong); color: var(--wrong);
  animation: micpulse 1.2s ease-in-out infinite; }
@keyframes micpulse { 0%,100%{opacity:1} 50%{opacity:.55} }

.radio-group { display: flex; flex-direction: column; gap: 0.5rem; margin: 0.75rem 0; }
.radio-group label { padding: 0.5rem 0.75rem; border: 1px solid var(--rule); border-radius: 6px;
  cursor: pointer; transition: border-color 0.15s; }
.radio-group label:hover { border-color: var(--accent); }
.radio-group label.correct { border-color: var(--correct); background: #f0fdf4; }
.radio-group label.wrong { border-color: var(--wrong); background: #fef2f2; }
.inline-fb { margin-top: 0.5rem; font-size: 0.9rem; display: none; }
.inline-fb.show { display: block; }
.inline-fb.ok { color: var(--correct); }
.inline-fb.bad { color: var(--wrong); }

.score-display { font-family: monospace; font-size: 1.5rem; font-weight: bold;
  color: var(--accent); margin-bottom: 0.5rem; }
.score-bar-wrap { background: var(--rule); border-radius: 4px; height: 6px; margin-bottom: 0.75rem; }
.score-bar { height: 100%; border-radius: 4px; background: var(--accent); transition: width 0.6s; width: 0%; }

.flashcard-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem; margin-top: 1rem; }
.flashcard { background: var(--surface); border: 1px solid var(--rule); border-radius: 8px;
  min-height: 120px; cursor: pointer; position: relative; perspective: 600px; }
.flashcard-front, .flashcard-back {
  position: absolute; inset: 0; padding: 1rem; display: flex; align-items: center;
  justify-content: center; text-align: center; font-size: 0.9rem; border-radius: 8px;
  backface-visibility: hidden; transition: transform 0.4s;
}
.flashcard-back { background: var(--highlight); color: var(--accent);
  transform: rotateY(180deg); }
.flashcard.flipped .flashcard-front { transform: rotateY(180deg); }
.flashcard.flipped .flashcard-back  { transform: rotateY(0deg); }

.next-review-box { margin-top: 1.5rem; padding: 0.75rem 1rem; background: var(--surface);
  border-radius: 6px; font-size: 0.9rem; }

.phase-body.locked { opacity: 0.35; pointer-events: none; user-select: none; }
```

---

## Checklist antes de publicar uma lição

- [ ] Analogia vem antes de qualquer nome técnico
- [ ] Todo diagrama é SVG inline (sem CDN)
- [ ] Cada seção tem `data-concept-id` com ID existente no glossário
- [ ] Fallback offline embutido em cada `ai-validate-block`
- [ ] **Variedade de interação:** pelo menos 1 seção Tipo A (recall escrito) e, idealmente, ≥1 Tipo B (quiz)
- [ ] **Ditado por voz:** botão 🎤 (`.mic-btn` com `data-target`) em todo textarea (seções + teach-back)
- [ ] Constantes `LESSON_ID` e `UNLOCK_SEQUENCE` definidas no script
- [ ] Teach-back cobre todos os conceitos da lição (sempre Tipo A, com 🎤)
- [ ] Flash cards presentes (3–5 cards)
- [ ] Footer com fonte primária
- [ ] Testado offline (servidor parado): lição funciona com múltipla escolha
- [ ] Testado online (servidor rodando): validação IA funciona e retorna score
