require('dotenv').config({ path: '../../.env' });

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.use('/api/validate', require('./routes/validate'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/catalog', require('./routes/catalog'));   // lists all lesson/review files on disk
app.use('/debug', require('./routes/debug'));   // /debug/mic — mic & Web Speech diagnostics

// Serve the workspace statically so lessons open over http://localhost (a secure
// context) instead of file:// — required for the mic / Web Speech API to work and
// for the permission to be remembered. Dotfiles (.env) are ignored by default.
const WORKSPACE = path.join(__dirname, '..', '..');
app.use(express.static(WORKSPACE));

// Unknown routes
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = process.env.PORT || 9990;
app.listen(PORT, () => {
  console.log(`learno-server running on :${PORT}`);
  console.log(`  Gemini model : ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);
  console.log(`  MongoDB DB   : ${process.env.MONGODB_DB  || 'system_design_learn'}`);
  console.log(`  Lessons      : http://localhost:${PORT}/lessons/  ·  reviews: /review/`);
});
