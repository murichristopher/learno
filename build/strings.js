// Every word the engine puts on a page, in one table.
//
// The language is a property of the workspace, not of a lesson: one fork studies
// one subject, in one language, and repeating a `lang` field in every envelope
// would be the same fact written a hundred times. It lives in `learno.json` at
// the workspace root.
//
// Adding a language means adding a key here and nothing else. A missing entry
// falls back to Portuguese rather than rendering an empty button — a blank
// control is worse than one in the wrong language.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_LANG = 'pt';

const STRINGS = {
  pt: {
    'html.lang':          'pt-BR',
    'locale':             'pt-BR',
    'nav.home':           'Ir para o painel',
    'nav.library':        'Biblioteca',
    'nav.dashboard':      'Painel',
    'nav.glossary':       'Glossário',
    'settings.title':     'Configurações',
    'settings.theme':     'Tema',
    'settings.light':     'Claro',
    'settings.auto':      'Seguir o sistema',
    'settings.dark':      'Escuro',
    'settings.accent':    'Cor principal',
    'offline.banner':     'Servidor fora do ar. As seções continuam abrindo por múltipla escolha, mas a validação por IA e o registro do progresso ficam indisponíveis.',

    'quiz.pickOne':       'Escolha uma',
    'recall.label':       'Explique com suas palavras',
    'teachback.offline':  'Esta parte precisa do servidor. Sem ele não dá para registrar a lição — e um score inventado estragaria o agendamento da revisão.',
    'done.nextReview':    'Próxima revisão',
    'recall.placeholder': 'Escreva sua explicação…',
    'recall.validate':    'Validar',
    'recall.fallbackNote': 'Servidor fora do ar — respondendo por múltipla escolha.',
    'recall.ok':          'Correto.',
    'recall.bad':         'Não é essa.',
    'mic.dictate':        'Ditar',
    'teachback.label':    'Ensina de volta',
    'teachback.placeholder': 'Explique o conceito inteiro, com suas palavras…',
    'teachback.finish':   'Encerrar a lição',
    'flashcards.title':   'Revisão rápida',
    'source.label':       'Fonte primária',
    'callout.note':       'Nota',
    'callout.warn':       'Atenção',
    'callout.danger':     'Cuidado',
    'rubric.ok':          'Suficiente',
    'rubric.bad':         'Insuficiente',
    'deliverable.label':  'O que entregar',
    'deliverable.must':   'Precisa aguentar',

    'gate.phase':         'Responda a seção anterior para abrir',
    'gate.teachback':     'Termine as seções acima para abrir',
    'gate.flashcards':    'Encerre a lição para abrir a revisão',

    'score.top':          'domínio',
    'score.good':         'sólido',
    'score.mid':          'parcial',
    'score.bad':          'não compreendido',
    'score.error':        'erro',

    'run.validating':     'Validando…',
    'run.grading':        'Avaliando…',
    'run.needAnswer':     'Escreva uma resposta antes de validar.',
    'run.needExplain':    'Escreva sua explicação antes de encerrar.',
    'run.validateFailed': 'Não deu para validar agora. Sua resposta continua aí.',
    'run.finishFailed':   'Não deu para encerrar agora. Sua explicação continua aí.',
    'run.serverSaid':     'servidor respondeu',
    'run.notScheduled':   'não agendada',
    'run.notSaved':       'A lição foi avaliada, mas o progresso não pôde ser salvo.',
    'run.scheduled':      'conceito(s) agendado(s) pelo SM-2.',
    'run.restart':        'Recomeçar',
    'run.restartTitle':   'Apaga as respostas guardadas neste navegador e recomeça',
    'run.teachbackOf':    'Teach-back final da lição'
  },

  en: {
    'html.lang':          'en',
    'locale':             'en-GB',
    'nav.home':           'Go to the dashboard',
    'nav.library':        'Library',
    'nav.dashboard':      'Dashboard',
    'nav.glossary':       'Glossary',
    'settings.title':     'Settings',
    'settings.theme':     'Theme',
    'settings.light':     'Light',
    'settings.auto':      'Follow the system',
    'settings.dark':      'Dark',
    'settings.accent':    'Accent colour',
    'offline.banner':     'The server is down. Sections still open by multiple choice, but AI scoring and progress tracking are unavailable.',

    'quiz.pickOne':       'Pick one',
    'recall.label':       'Explain in your own words',
    'teachback.offline':  'This part needs the server. Without it the lesson cannot be recorded — and an invented score would poison the review schedule.',
    'done.nextReview':    'Next review',
    'recall.placeholder': 'Write your explanation…',
    'recall.validate':    'Check',
    'recall.fallbackNote': 'Server is down — answering by multiple choice.',
    'recall.ok':          'Correct.',
    'recall.bad':         'Not that one.',
    'mic.dictate':        'Dictate',
    'teachback.label':    'Teach it back',
    'teachback.placeholder': 'Explain the whole concept, in your own words…',
    'teachback.finish':   'Finish the lesson',
    'flashcards.title':   'Quick review',
    'source.label':       'Primary source',
    'callout.note':       'Note',
    'callout.warn':       'Careful',
    'callout.danger':     'Watch out',
    'rubric.ok':          'Enough',
    'rubric.bad':         'Not enough',
    'deliverable.label':  'What to deliver',
    'deliverable.must':   'It has to survive',

    'gate.phase':         'Answer the previous section to open this one',
    'gate.teachback':     'Finish the sections above to open this',
    'gate.flashcards':    'Finish the lesson to open the review',

    'score.top':          'mastered',
    'score.good':         'solid',
    'score.mid':          'partial',
    'score.bad':          'not understood',
    'score.error':        'error',

    'run.validating':     'Checking…',
    'run.grading':        'Grading…',
    'run.needAnswer':     'Write an answer before checking.',
    'run.needExplain':    'Write your explanation before finishing.',
    'run.validateFailed': 'Could not check that just now. Your answer is still here.',
    'run.finishFailed':   'Could not finish just now. Your explanation is still here.',
    'run.serverSaid':     'the server replied',
    'run.notScheduled':   'not scheduled',
    'run.notSaved':       'The lesson was graded, but the progress could not be saved.',
    'run.scheduled':      'concept(s) scheduled by SM-2.',
    'run.restart':        'Start over',
    'run.restartTitle':   'Clears the answers kept in this browser and starts again',
    'run.teachbackOf':    'Final teach-back for lesson'
  }
};

// Read once. The build is a single process per run, and a workspace does not
// change language halfway through rendering.
let lang = null;

function language() {
  if (lang) return lang;
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'learno.json'), 'utf8'));
    lang = STRINGS[cfg.lang] ? cfg.lang : DEFAULT_LANG;
  } catch {
    lang = DEFAULT_LANG;
  }
  return lang;
}

function t(key) {
  const table = STRINGS[language()] || STRINGS[DEFAULT_LANG];
  return table[key] ?? STRINGS[DEFAULT_LANG][key] ?? key;
}

// The subset the browser needs, shipped inside #lx-config so the runtime never
// has to fetch anything to know what a button says.
function runtimeStrings() {
  const out = {};
  for (const key of Object.keys(STRINGS[DEFAULT_LANG])) {
    if (/^(score|run|mic|recall\.(ok|bad))/.test(key)) out[key] = t(key);
  }
  return out;
}

module.exports = { t, language, runtimeStrings, STRINGS, DEFAULT_LANG };
