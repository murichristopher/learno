const { MongoClient } = require('mongodb');
const router = require('express').Router();

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

let _db;
async function getDb() {
  if (!_db) {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    _db = client.db(process.env.MONGODB_DB || 'system_design_learn');
  }
  return _db;
}

router.post('/', async (req, res) => {
  const {
    concept_id,
    section_summary,
    user_answer,
    valid_concept_ids = [],
    is_teachback = false,
    lesson_id
  } = req.body;

  if (!user_answer?.trim()) {
    return res.status(400).json({ error: 'user_answer is required' });
  }

  const conceptList = valid_concept_ids.length
    ? valid_concept_ids.join(', ')
    : concept_id;

  const prompt = `You are a learning validator for a system design course.
The student is learning: ${concept_id}.

Lesson context:
${section_summary || 'No additional context provided.'}

Canonical concept vocabulary — use ONLY these exact IDs in concepts_demonstrated:
${conceptList}

Student's explanation:
${user_answer}

Score 0–100:
- 0–40:  concept not understood
- 41–74: partial understanding, important gaps
- 75–89: solid understanding, minor inaccuracies
- 90–100: clear mastery

Return JSON only (no markdown wrapper, no explanation outside the JSON):
{
  "score": <number>,
  "feedback": "<2-3 sentences in the same language the student used>",
  "concepts_demonstrated": ["<IDs from canonical vocabulary only>"],
  "misconceptions": ["<brief description of each misconception found, or empty array>"]
}`;

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!geminiRes.ok) {
      const detail = await geminiRes.text();
      console.error('Gemini error:', geminiRes.status, detail);
      return res.status(502).json({ error: 'Gemini API error', status: geminiRes.status });
    }

    const data  = await geminiRes.json();
    const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!raw) {
      return res.status(502).json({ error: 'Empty response from Gemini' });
    }

    const parsed = JSON.parse(raw);

    // Enforce canonical vocabulary — drop any ID Gemini invented
    if (valid_concept_ids.length && Array.isArray(parsed.concepts_demonstrated)) {
      parsed.concepts_demonstrated = parsed.concepts_demonstrated.filter(id =>
        valid_concept_ids.includes(id)
      );
    }

    // Persist section result to MongoDB (fire-and-forget — does not block response)
    if (lesson_id) {
      getDb().then(db => db.collection('section_results').insertOne({
        lesson_id,
        concept_id,
        is_teachback: !!is_teachback,
        score:                   parsed.score,
        feedback:                parsed.feedback,
        concepts_demonstrated:   parsed.concepts_demonstrated,
        misconceptions:          parsed.misconceptions || [],
        recorded_at:             new Date()
      })).catch(err => console.error('section_results save error:', err));
    }

    res.json(parsed);

  } catch (err) {
    console.error('validate error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
