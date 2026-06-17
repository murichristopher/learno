# PLAN — Skill `learn` (evolução do `teach`)

> Documento de design iterativo. Vamos trabalhar aqui até chegar na versão final.
> Referência original em `skill/original/SKILL.md`.

---

## O que o `teach` original faz bem (mantém tudo)

- Workspace stateful com MISSION, RESOURCES, NOTES, learning-records, lessons, reference
- Filosofia Knowledge → Skills → Wisdom
- Fluency vs Storage Strength
- Zone of Proximal Development guiando o que ensinar
- Lições HTML belas, auto-contidas, completáveis rápido
- Glossário como linguagem canônica do workspace

---

## O que o `learn` adiciona

### 1. Analogias obrigatórias

Toda lição começa com uma analogia da vida real **antes** de qualquer conceito técnico.
A analogia deve ser do cotidiano do usuário — não genérica.
Claude deve buscar a analogia mais próxima do contexto/stack do usuário (lendo NOTES.md).

**Regra para o SKILL.md:**
> Every lesson MUST open with a real-world analogy section before any technical concept is introduced. The analogy must relate to something the user already knows from their daily life or work context (stored in NOTES.md). Only introduce the technical concept name after the analogy has been established.

---

### 2. Diagramas e fluxos visuais obrigatórios

Toda lição deve ter pelo menos um diagrama visual.
Diagramas aparecem junto com o conceito, não depois.

**Implementação: SVG inline** — não Mermaid via CDN.
Motivo: lições são HTML auto-contidas e estudadas localmente. Dependência de CDN quebra os diagramas sem internet. SVG inline funciona offline, imprime bem, e é mais controlável visualmente.

**Regra para o SKILL.md:**
> Every lesson MUST include at least one visual diagram as inline SVG. Diagrams must appear alongside the concept they illustrate, not after. For request flows, use sequence-style diagrams. For architecture, use component diagrams. For comparisons, use side-by-side layout. Never use external CDN dependencies — lessons must work fully offline.

---

### 3. O que foi aprendido — duas fontes, não uma

**Problema com a versão anterior:** o plano definia mastery como apenas `score IA ≥ 75`. O usuário disse: *"só iremos saber o que foi aprendido com base nas coisas q eu vou te falar em sequencia."* Isso é uma dimensão conversacional que o score IA não captura.

**Solução: duas fontes de mastery, ambas registradas:**

**Fonte A — Conversacional (Claude registra):**
Quando, em conversa, o usuário demonstra compreensão de um conceito — explica corretamente, usa o termo no contexto certo, ou verbaliza que entendeu — Claude cria ou atualiza um learning record e chama `POST /api/progress` com `source: "conversation"`.

**Fonte B — Score IA (Gemini valida):**
Ao final de cada seção/lição, o usuário escreve em suas palavras. Gemini pontua. Se score ≥ 75, registra com `source: "ai_validation"`.

**Um conceito é considerado aprendido quando:**
- Fonte A OU Fonte B com score ≥ 75 em pelo menos uma sessão
- O dashboard mostra a fonte: "aprendido em conversa" vs "validado por IA"

**Regra para o SKILL.md:**
> Mastery has two sources. (A) Conversational: when the user demonstrates understanding in conversation — correct usage, unprompted explanation, or explicit statement — Claude records it via POST /api/progress with source: "conversation". (B) AI-validated: score ≥ 75 in a Gemini teach-back. Both sources are displayed in the dashboard. Never reduce mastery to score alone.

---

### 4. Validação por IA (Gemini 2.5-flash) em toda lição

**Problema com múltipla escolha:** testa reconhecimento, não compreensão.
**Solução:** cada seção tem um textarea onde o usuário explica com suas palavras. A IA valida e dá nota.

**Fallback quando servidor offline:**
O HTML de cada lição detecta se `localhost:9990` está acessível ao carregar. Se não estiver:
- Textareas de validação IA são substituídos por múltipla escolha estática (já embutida no HTML)
- Um banner amarelo aparece: "Servidor offline — usando modo básico. Rode `npm start` em skill/server/ para validação IA."
- Progresso em modo offline não é salvo no MongoDB

Isso garante que as lições funcionam sempre, mas sinalizam claramente o que está faltando.

**Componentes do servidor:**
- `skill/server/` rodando na porta 9990
- `POST /api/validate` — proxy para Gemini 2.5-flash
- `POST /api/progress` — salva no MongoDB
- `GET /api/progress` — lê progresso + próximas revisões
- `GET /api/health` — usado pelo HTML para detectar se o servidor está online

**Prompt padrão para o Gemini:**
```
You are a learning validator. The student is learning: {CONCEPT}.

Lesson context: {SECTION_SUMMARY}

Canonical concept vocabulary (use these exact IDs in your response):
{GLOSSARY_CONCEPT_IDS}

Student's explanation: {USER_TEXT}

Score 0–100:
- 0–40: concept not understood
- 41–74: partial understanding, important gaps
- 75–89: solid understanding, minor inaccuracies
- 90–100: clear mastery

Return JSON only:
{
  "score": number,
  "feedback": "string, 2-3 sentences in the user's language (match their language)",
  "concepts_demonstrated": ["concept_id from canonical vocabulary only"],
  "misconceptions": ["string"]
}
```

**Vocabulário canônico:** `concepts_demonstrated` só pode conter IDs que existem no Glossário do workspace. O servidor valida isso antes de salvar no MongoDB — conceitos fora do glossário são descartados. Isso evita drift de nomes no banco (`"cache-aside"` vs `"cache aside"` vs `"lazy loading cache"`).

**Ao final de toda lição:** seção "Ensina de volta" — o usuário explica o conceito completo em suas palavras. A IA avalia tudo e dá nota final da lição.

**Regra para o SKILL.md:**
> Every lesson section must include a textarea for the user to explain the concept in their own words. This answer is validated by Gemini via POST /api/validate. The payload must include the canonical glossary concept IDs so Gemini anchors its response to known vocabulary. The final section of every lesson is a "Teach it back" exercise. The HTML must detect server availability on load and fall back to static multiple-choice if offline, showing a clear offline banner.

---

### 5. Repetição espaçada (SM-2)

**Baseado na curva do esquecimento de Ebbinghaus.**
Ciclo completo: **imediato → 24h → 7 dias → 30 dias**.

**Fase 0 — Imediata (mesma sessão):**
Ao completar a lição, um resumo visual aparece: "Você aprendeu X conceitos hoje." Um botão "Revisar agora" mostra os conceitos em flash cards inline na própria lição. Isso consolida antes de fechar a página.

**Fases 1–3 — Revisões agendadas:**

| Fase | Intervalo | Formato |
|---|---|---|
| 1 | +1 dia | Lição de revisão curta gerada: `lessons/review-CONCEPT.html` |
| 2 | +7 dias | Quiz de recall — sem contexto, só recall puro |
| 3 | +30 dias | Mini-design do zero com o conceito |

**Algoritmo SM-2:**
```
score ≥ 90  → interval *= ease_factor,  ease_factor += 0.1
75–89       → interval *= ease_factor   (ease_factor sem mudança)
41–74       → interval = 1,             ease_factor -= 0.15
< 40        → interval = 0 (revisar hoje), ease_factor -= 0.2

ease_factor mínimo: 1.3
interval inicial: 1 dia
```

**MongoDB — coleções:**

`concepts` — estado de cada conceito, ancorado no glossário
```json
{
  "concept_id": "cache-aside",       // ID canônico do glossário
  "lesson_id": "0004-caching",
  "first_seen": "ISODate",
  "last_reviewed": "ISODate",
  "next_review": "ISODate",
  "interval_days": 7,
  "ease_factor": 2.5,
  "mastered": true,
  "mastery_source": "ai_validation", // "ai_validation" | "conversation"
  "history": [{ "date": "ISODate", "score": 82, "source": "ai_validation" }]
}
```

`lessons` — uma entrada por sessão de lição completa
```json
{
  "lesson_id": "0004-caching",
  "completed_at": "ISODate",
  "final_score": 82,
  "sections": [
    { "id": "when-to-cache", "score": 90, "user_answer": "...", "ai_feedback": "..." }
  ]
}
```

**Regra para o SKILL.md:**
> After every lesson, the immediate review (Phase 0) runs inline — flash cards in the same HTML. Then call POST /api/progress to schedule SM-2 reviews. concept_id values must match glossary IDs exactly — the server rejects unknown IDs. When a concept's next_review date arrives, generate a review lesson file.

---

### 6. Dashboard "O que eu aprendi"

Arquivo: `reference/my-learning.html`
Lê de `GET /api/progress`.

**Conteúdo:**
- Conceitos dominados: ID canônico do glossário, fonte (conversa ou IA), data
- Próximas revisões: hoje / esta semana / este mês
- Progresso por lição: barra de score final
- Heatmap de atividade dos últimos 30 dias

**Importante:** o dashboard não funciona sem o servidor. Isso é uma concessão deliberada — diferentemente das lições (que têm fallback offline), o dashboard é puramente dinâmico. Se o servidor estiver offline, exibe uma mensagem clara.

**Regra para o SKILL.md:**
> Maintain reference/my-learning.html as a dynamic dashboard reading from GET localhost:9990/api/progress. It shows mastered concepts (with source: conversation or ai_validated), upcoming reviews, and lesson progress. Unlike lessons, the dashboard has no offline fallback — it requires the server. Rebuild it after every lesson completion.

---

## Estrutura de arquivos da skill

```
skill/
├── original/              ← cópia fiel do teach original (referência imutável)
│   ├── SKILL.md
│   ├── MISSION-FORMAT.md
│   ├── RESOURCES-FORMAT.md
│   ├── LEARNING-RECORD-FORMAT.md
│   └── GLOSSARY-FORMAT.md
├── PLAN.md                ← este arquivo
├── SKILL.md               ← skill em construção (versão final aqui)
├── LESSON-FORMAT.md       ← template HTML de uma lição (escrito antes do SKILL.md)
├── DASHBOARD-FORMAT.md    ← especificação do my-learning.html
└── server/                ← servidor local Node.js
    ├── index.js           ← Express, porta 9990
    ├── routes/
    │   ├── validate.js    ← proxy Gemini + validação de vocab canônico
    │   └── progress.js    ← MongoDB read/write + SM-2
    └── package.json
```

---

## Diferenças-chave: `teach` → `learn`

| Aspecto | `teach` (original) | `learn` (novo) |
|---|---|---|
| Validação | Múltipla escolha estática | IA (Gemini) valida texto livre + fallback offline |
| Diagramas | Opcional | SVG inline obrigatório em toda lição |
| Analogias | Opcional | Obrigatória antes de todo conceito |
| Progresso | Learning records em markdown | MongoDB + dashboard HTML dinâmico |
| Mastery | Subjetivo | Conversacional (Claude) OU score IA ≥ 75 |
| Vocabulário | Glossário como referência | Glossário como vocabulário canônico vinculado ao MongoDB |
| Retenção | Sem rastreamento | SM-2: imediato → 24h → 7d → 30d |
| Final da lição | Quiz | "Ensina de volta" + revisão imediata (flash cards inline) |
| Servidor | Nenhum | Local na porta 9990, lições funcionam offline sem ele |

---

## Questões em aberto

| Questão | Opções | Status |
|---|---|---|
| Onde instalar o servidor? | Global `~/.learn-server/` vs por workspace `skill/server/` | **Global** — um servidor, múltiplos workspaces passam o path do workspace no payload |
| Idioma do feedback IA | Sempre PT-BR / detectar idioma do usuário | **Detectar** — instrução no prompt: "match the user's language" |
| Revisões: HTML gerado ou conversa | HTML gerado vs thread no Claude | **HTML gerado** — para manter o padrão auto-contido |
| Score mínimo para mastery | 70 / 75 / 80 | **75** — decidido |

---

## Plano de implementação (ordem corrigida)

### Fase 1 — LESSON-FORMAT.md
Definir exatamente como uma lição do `learn` é estruturada em HTML.
Template completo com: analogia → diagrama SVG → seções com textarea IA → fallback offline → teach-back → flash cards de revisão imediata.
**Pronto quando:** dado o template, Claude consegue gerar uma lição sem ambiguidade.

### Fase 2 — SKILL.md v1
Escrever o `skill/SKILL.md` incorporando todos os 6 pilares e referenciando o LESSON-FORMAT.md.
**Pronto quando:** o SKILL.md cobre todos os pilares e um Claude sem contexto consegue executar o skill corretamente.

### Fase 3 — Servidor local + schema MongoDB para acesso direto pelo agente

**Servidor (`skill/server/`):**
Responsável apenas pelas rotas do browser (lições HTML). Claude não usa o servidor para contexto — ele acessa o MongoDB diretamente via CLI.

Rotas do servidor (somente browser-facing):
- `GET  /api/health`
- `POST /api/validate` — proxy Gemini + validação de vocab canônico
- `POST /api/progress` — salva progresso de lição + dispara SM-2

**Acesso direto pelo agente (Claude via `mongosh`):**

Claude acessa o MongoDB diretamente no início de cada sessão usando `mongosh` via Bash. Não há rota de API para isso — o agente consulta o banco diretamente com as queries que precisar.

Variável de conexão disponível em `.env`:
```
MONGODB_URI=mongodb+srv://...
MONGODB_DB=system_design_learn
```

Queries padrão que Claude executa ao iniciar uma sessão:

```bash
# Conceitos com revisão pendente (SM-2 vencido)
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('system_design_learn');
  db.concepts.find(
    { next_review: { \$lte: new Date() } },
    { concept_id: 1, interval_days: 1, ease_factor: 1, next_review: 1 }
  ).toArray()
"

# Misconceptions recorrentes (apareceram em 2+ sessões)
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('system_design_learn');
  db.lessons.aggregate([
    { \$unwind: '\$sections' },
    { \$unwind: '\$sections.misconceptions' },
    { \$group: { _id: '\$sections.misconceptions', count: { \$sum: 1 } } },
    { \$match: { count: { \$gte: 2 } } },
    { \$sort: { count: -1 } }
  ]).toArray()
"

# Histórico de scores por conceito (para ver evolução)
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('system_design_learn');
  db.concepts.find(
    {},
    { concept_id: 1, history: 1, mastered: 1, mastery_source: 1 }
  ).toArray()
"

# Últimas 5 lições completas
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('system_design_learn');
  db.lessons.find({}, { lesson_id: 1, final_score: 1, completed_at: 1 })
    .sort({ completed_at: -1 }).limit(5).toArray()
"
```

**Schema MongoDB — o que precisa estar persistido para as queries acima funcionarem:**

`concepts`
```js
{
  concept_id: String,        // ID canônico do glossário (ex: "cache-aside")
  lesson_id: String,         // lição onde foi visto pela primeira vez
  mastered: Boolean,
  mastery_source: String,    // "ai_validation" | "conversation"
  first_seen: Date,
  last_reviewed: Date,
  next_review: Date,         // calculado pelo SM-2
  interval_days: Number,
  ease_factor: Number,
  history: [{ date: Date, score: Number, source: String }]
}
```

`lessons`
```js
{
  lesson_id: String,
  completed_at: Date,
  final_score: Number,
  sections: [{
    id: String,
    score: Number,
    user_answer: String,     // texto livre do usuário
    ai_feedback: String,     // feedback do Gemini
    concepts_demonstrated: [String],
    misconceptions: [String] // nomes livres de misconceptions identificadas
  }]
}
```

`conversations` ← **nova coleção** (registra mastery conversacional)
```js
{
  recorded_at: Date,
  concept_id: String,        // ID canônico do glossário
  evidence: String,          // trecho da conversa que demonstrou o entendimento
  source: "conversation"
}
```

Quando Claude detecta mastery conversacional, além de escrever o learning-record markdown, insere um documento nessa coleção via:
```bash
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('system_design_learn');
  db.conversations.insertOne({
    recorded_at: new Date(),
    concept_id: 'cache-aside',
    evidence: 'usuário explicou corretamente o fluxo de cache miss sem ser perguntado',
    source: 'conversation'
  })
"
```

**Pronto quando:** `mongosh` conecta, as 4 queries padrão retornam dados válidos, e `curl localhost:9990/api/health` responde.

### Fase 4 — Piloto
Reescrever a lição de caching (0004) no novo formato completo.
Testar loop: analogia → diagrama → textarea → Gemini valida → salva MongoDB → revisão imediata.
**Pronto quando:** o loop completo funciona, e o dashboard exibe o conceito aprendido.

### Fase 5 — SKILL.md final + DASHBOARD-FORMAT.md
Refinar com base no piloto. Escrever especificação do dashboard. Versão publicável.

---

## Next Steps — Design System

### O que é

Um catálogo de tokens visuais e componentes HTML+CSS documentados numa pasta dedicada.
Claude lê o catálogo antes de gerar qualquer lição e escolhe componentes pelo nome da classe — sem inventar CSS a cada arquivo.

```
design-system/
├── SPEC.md           ← catálogo completo (o que Claude lê)
├── components.css    ← o único arquivo CSS que as lições importam
└── preview.html      ← visual de todos os componentes renderizados (para referência humana)
```

Lições passam a ter uma única linha no `<head>`:
```html
<link rel="stylesheet" href="../design-system/components.css">
```

### Bônus

**Consistência garantida** — Lição 1 e Lição 40 são visualmente idênticas sem esforço. Claude não precisa "lembrar" o estilo de lições anteriores.

**Claude fica mais preciso** — Em vez de gerar CSS do zero (onde há drift de cor, espaçamento, tipografia), Claude escolhe de um vocabulário fixo: `class="analogy-box"`, `class="phase-badge badge-2"`, `class="score-bar"`. Menos tokens de CSS no prompt, mais consistência no output.

**Manutenção centralizada** — Mudar o visual de todos os botões = 1 linha em `components.css`. Hoje exigiria editar 4 lições.

**Preview humano** — `preview.html` mostra todos os componentes renderizados num só lugar. Fácil ver o que existe antes de pedir a Claude para usar.

**Theming possível** — Trocar o tema escuro/claro = trocar os valores das CSS custom properties. Nenhuma lição muda.

**Escalável para revisões** — Lições de revisão geradas pelo SM-2 usam os mesmos componentes, já estilizadas.

### Ônus

**Quebra o "self-contained"** — Lições deixam de funcionar se movidas isoladamente para outra pasta. Decisão deliberada: para uma ferramenta local onde todos os arquivos vivem no mesmo workspace, isso é aceitável. A regra de self-contained do `teach` original protegia contra dependência de *servidor* — CSS local é diferente.

**Curva de setup** — Quem clonar o workspace precisa saber que há uma dependência de CSS. Mitigação: documentar no README e no SKILL.md.

**Risco de over-spec** — Definir todos os componentes possíveis de antemão é desperdício. Mitição: extrair dos 4 lessons existentes primeiro, estender conforme novas lições forem criadas.

### O que entra no design system (extraído das lições atuais)

**Tokens (CSS custom properties):**
```css
--color-ink, --color-muted, --color-rule
--color-accent, --color-correct, --color-wrong, --color-warn
--color-surface, --color-highlight
--color-analogy-bg, --color-analogy-border   /* verde */
--color-scenario-bg, --color-scenario-border /* âmbar */
--font-body, --font-mono
--radius-sm, --radius-md, --radius-lg
--shadow-card
```

**Componentes de layout:**
| Classe | O que é |
|---|---|
| `.lesson-container` | Wrapper central (max-width, padding, tipografia base) |
| `.progress-bar` + `.progress-seg` | Barra de progresso segmentada do topo |
| `.phase` + `.phase-header` + `.phase-body` | Bloco de seção com header e body travável |
| `.compare-grid` | Grid de 2 colunas para comparações lado a lado |

**Componentes de conteúdo:**
| Classe | O que é |
|---|---|
| `.analogy-box` | Caixa verde de analogia (obrigatória no início) |
| `.scenario-box` | Caixa âmbar de cenário ("a PM chegou com uma ideia...") |
| `.concept-reveal` | Box cinza que aparece após resposta correta |
| `.diagram-wrap` + `.diagram-svg` | Container de diagrama SVG inline |
| `.step-block` + `.step-label` + `.step-time` | Bloco de passo numerado (usado no framework) |
| `.worked-example` + `.calc-line` | Cálculo linha a linha (estimativas) |
| `.tip-box` | Dica contextual com borda colorida |

**Componentes de interação:**
| Classe | O que é |
|---|---|
| `.radio-group label` | Opção de múltipla escolha estilizada |
| `.check-group label` | Checkbox estilizado |
| `.answer-textarea` + `--large` | Textarea de resposta livre |
| `.ai-validate-block` | Container de validação IA (textarea + botão + resultado) |
| `.offline-fallback` | Versão offline de um bloco de validação |
| `.offline-banner` | Banner amarelo de aviso de servidor offline |
| `.btn` + `.btn-ghost` | Botões primário e secundário |

**Componentes de feedback:**
| Classe | O que é |
|---|---|
| `.inline-fb.ok / .warn / .bad` | Feedback colorido inline (verde/amarelo/vermelho) |
| `.score-display` | Número grande do score (ex: "82/100") |
| `.score-bar-wrap` + `.score-bar` | Barra de progresso animada do score |
| `.ai-feedback` | Parágrafo de feedback textual da IA |
| `.concepts-demonstrated` | Lista de conceitos demonstrados pelo usuário |

**Componentes de flash card:**
| Classe | O que é |
|---|---|
| `.flashcard-grid` | Grid de flash cards |
| `.flashcard` + `.flashcard-front` + `.flashcard-back` | Flash card com flip animado |
| `.next-review-box` | Box com data da próxima revisão |

**Badges de fase/step:**
| Classe | O que é |
|---|---|
| `.phase-badge.badge-1` → `.badge-5` | Badges coloridos de parte (roxo → azul → verde → laranja → rosa) |
| `.phase-badge.badge-final` | Badge especial do teach-back |
| `.lesson-tag` | Tag de identificação no header ("Lesson 04 · System Design") |
| `.step-badge` | Badge inline de qual passo do framework a lição alimenta |

### Regra para o SKILL.md

> Before generating any lesson HTML, read `design-system/SPEC.md` to understand all available components and their class names. Never write inline CSS for components that exist in the design system. Use the class names exactly as documented. If a new component is needed that doesn't exist in the design system, add it to `components.css` and document it in `SPEC.md` before using it in a lesson.

### Implementação (quando chegar a hora)

**Fase 0a — Extração:** Varrer lições 0001–0004 e extrair todo CSS repetido para `components.css`. Refatorar as lições para usar o link externo.

**Fase 0b — SPEC.md:** Documentar cada componente com: nome da classe, descrição, HTML de exemplo, quando usar, quando NÃO usar.

**Fase 0c — preview.html:** Renderizar todos os componentes num arquivo só para validação visual.

**Critério de pronto:** Claude consegue gerar uma lição nova usando apenas as classes do SPEC.md, sem inventar CSS. Preview.html mostra tudo visualmente correto.
