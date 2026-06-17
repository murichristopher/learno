require('dotenv').config({ path: '../../.env' });

const express = require('express');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.use('/api/validate', require('./routes/validate'));
app.use('/api/progress', require('./routes/progress'));

// Unknown routes
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = process.env.PORT || 9990;
app.listen(PORT, () => {
  console.log(`learno-server running on :${PORT}`);
  console.log(`  Gemini model : ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);
  console.log(`  MongoDB DB   : ${process.env.MONGODB_DB  || 'system_design_learn'}`);
});
