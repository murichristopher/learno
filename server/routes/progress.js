const { MongoClient } = require('mongodb');
const router = require('express').Router();

// ── MongoDB connection (lazy, reused) ────────────────────────
let _db;
async function getDb() {
  if (!_db) {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    _db = client.db(process.env.MONGODB_DB || 'system_design_learn');
    console.log('MongoDB connected');
  }
  return _db;
}

// ── SM-2 algorithm ───────────────────────────────────────────
function sm2(score, current) {
  let interval_days = current?.interval_days ?? 1;
  let ease_factor   = current?.ease_factor   ?? 2.5;

  if (score >= 90) {
    interval_days = Math.round(interval_days * ease_factor);
    ease_factor   = Math.min(ease_factor + 0.1, 4.0);
  } else if (score >= 75) {
    interval_days = Math.round(interval_days * ease_factor);
    // ease_factor unchanged
  } else if (score >= 41) {
    interval_days = 1;
    ease_factor   = Math.max(ease_factor - 0.15, 1.3);
  } else {
    interval_days = 0; // review today
    ease_factor   = Math.max(ease_factor - 0.2, 1.3);
  }

  const next_review = new Date();
  next_review.setDate(next_review.getDate() + interval_days);

  return { interval_days, ease_factor, next_review };
}

// ── POST /api/progress ───────────────────────────────────────
// Saves a completed lesson and updates SM-2 for each concept demonstrated
router.post('/', async (req, res) => {
  const {
    lesson_id,
    final_score,
    concepts_demonstrated = [],
    sections = []
  } = req.body;

  if (!lesson_id || final_score === undefined) {
    return res.status(400).json({ error: 'lesson_id and final_score are required' });
  }

  try {
    const db = await getDb();

    // Pull all section results already saved by /api/validate for this lesson
    const savedSections = await db.collection('section_results')
      .find({ lesson_id })
      .sort({ recorded_at: 1 })
      .toArray();

    const allSections = savedSections.length ? savedSections : sections;

    // Save or update lesson record
    await db.collection('lessons').updateOne(
      { lesson_id },
      {
        $set: {
          lesson_id,
          completed_at: new Date(),
          final_score,
          sections: allSections
        }
      },
      { upsert: true }
    );

    // Update SM-2 for each demonstrated concept
    const updates = [];
    for (const concept_id of concepts_demonstrated) {
      const existing = await db.collection('concepts').findOne({ concept_id });
      const { interval_days, ease_factor, next_review } = sm2(final_score, existing);

      await db.collection('concepts').updateOne(
        { concept_id },
        {
          $set: {
            lesson_id,
            last_reviewed:  new Date(),
            next_review,
            interval_days,
            ease_factor,
            mastered:       final_score >= 75,
            mastery_source: 'ai_validation',
            ...(existing ? {} : { first_seen: new Date() })
          },
          $push: {
            history: {
              date:   new Date(),
              score:  final_score,
              source: 'ai_validation'
            }
          }
        },
        { upsert: true }
      );

      updates.push({ concept_id, next_review, interval_days });
    }

    // Return the earliest next_review for display in the lesson
    const earliest = updates.reduce(
      (min, c) => (c.next_review < min ? c.next_review : min),
      updates[0]?.next_review ?? new Date()
    );

    const next_review_label = updates.length
      ? earliest.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
      : null;

    res.json({
      ok: true,
      concepts_updated: updates.length,
      next_review: next_review_label
    });

  } catch (err) {
    console.error('progress POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/progress ────────────────────────────────────────
// Read full mastery state — used by the dashboard (my-learning.html)
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const today = new Date();

    const [concepts, lessons, conversations] = await Promise.all([
      db.collection('concepts').find({}).toArray(),
      db.collection('lessons').find({}).sort({ completed_at: -1 }).limit(20).toArray(),
      db.collection('conversations').find({}).sort({ recorded_at: -1 }).toArray()
    ]);

    // Attach section_results to each lesson
    for (const lesson of lessons) {
      if (!lesson.sections?.length) {
        lesson.sections = await db.collection('section_results')
          .find({ lesson_id: lesson.lesson_id })
          .sort({ recorded_at: 1 })
          .toArray();
      }
    }

    const pending_reviews = concepts.filter(
      c => c.next_review && new Date(c.next_review) <= today
    );

    res.json({ concepts, lessons, conversations, pending_reviews });

  } catch (err) {
    console.error('progress GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
