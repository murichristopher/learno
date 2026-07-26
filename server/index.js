const path = require('path');

// Where the study workspace lives — see server/workspace.js.
const { WORKSPACE, DASHBOARD_PATH } = require('./workspace');

// Resolved from WORKSPACE rather than the shell's cwd, so the server behaves
// the same however it is launched. Must stay above the ./db require, which
// reads LEARNO_MODE at import time.
require('dotenv').config({ path: path.join(WORKSPACE, '.env') });

const express = require('express');
const cors    = require('cors');

const { SANDBOX } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, mode: SANDBOX ? 'sandbox' : 'live', ts: new Date().toISOString() })
);
app.use('/api/validate', require('./routes/validate'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/catalog', require('./routes/catalog'));   // lists all lesson/review files on disk
app.use('/debug', require('./routes/debug'));   // /debug/mic — mic & Web Speech diagnostics

// `/` → the dashboard (or an index of the workspace, if it isn't seeded yet).
// Declared before the static handler so it wins over any stray index.html.
app.use('/', require('./routes/home'));

// Serve the workspace statically so lessons open over http://localhost (a secure
// context) instead of file:// — required for the mic / Web Speech API to work and
// for the permission to be remembered. Dotfiles (.env) are ignored by default.
app.use(express.static(WORKSPACE));

// Unknown routes
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = process.env.PORT || 9990;
app.listen(PORT, () => {
  console.log(`learno-server running on :${PORT}${SANDBOX ? '  [MODE=sandbox]' : ''}`);
  if (SANDBOX) {
    console.log('  Store        : in-memory (seeded, resets on restart)');
    console.log('  Validator    : stubbed — !0 / !p / !ok / !m force each score band');
  } else {
    console.log(`  Gemini model : ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);
    console.log(`  MongoDB DB   : ${process.env.MONGODB_DB  || 'system_design_learn'}`);
  }
  console.log(`  Workspace    : ${WORKSPACE}`);
  console.log(`  Open         : http://localhost:${PORT}/   → ${DASHBOARD_PATH}`);
});
