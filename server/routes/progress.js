const router = require('express').Router();

// Real Mongo, or the in-memory sandbox store — see server/db.js.
const { getDb } = require('../db');
const { languageLocale } = require('../workspace');

// ── SM-2 algorithm ───────────────────────────────────────────
// A project is not a longer lesson. It asks the concept to be used under a
// constraint it was never taught under, which makes its evidence asymmetric:
// passing says more than a teach-back at the same score, so the interval goes
// further. Failing says less — see the loop below.
const PROJECT_BOOST = 1.5;

function sm2(score, current, { project = false } = {}) {
  let interval_days = current?.interval_days ?? 1;
  let ease_factor   = current?.ease_factor   ?? 2.5;
  const boost = project ? PROJECT_BOOST : 1;

  if (score >= 90) {
    interval_days = Math.round(interval_days * ease_factor * boost);
    ease_factor   = Math.min(ease_factor + (project ? 0.15 : 0.1), 4.0);
  } else if (score >= 75) {
    interval_days = Math.round(interval_days * ease_factor * boost);
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
    concepts_missed = [],
    sections = [],
    kind = 'lesson'
  } = req.body;

  if (!lesson_id || final_score === undefined) {
    return res.status(400).json({ error: 'lesson_id and final_score are required' });
  }

  const isProject = kind === 'project';
  const missed    = new Set(concepts_missed);

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
          kind,
          completed_at: new Date(),
          final_score,
          sections: allSections
        }
      },
      { upsert: true }
    );

    // Update SM-2 for each demonstrated concept
    const source  = isProject ? 'project' : 'ai_validation';
    const updates = [];
    for (const concept_id of concepts_demonstrated) {
      const existing = await db.collection('concepts').findOne({ concept_id });

      // A weak project only demotes the concepts it can name. The deliverable
      // touched several at once and does not say which one broke, so resetting
      // all of them would throw away weeks of evidence on a guess. The score is
      // still recorded — the history shows the dip, the schedule does not move.
      if (isProject && final_score < 75 && !missed.has(concept_id)) {
        await db.collection('concepts').updateOne(
          { concept_id },
          { $push: { history: { date: new Date(), score: final_score, source } } }
        );
        continue;
      }

      const { interval_days, ease_factor, next_review } =
        sm2(final_score, existing, { project: isProject });

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
            mastery_source: source,
            ...(existing ? {} : { first_seen: new Date() })
          },
          $push: {
            history: {
              date:   new Date(),
              score:  final_score,
              source
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
      ? earliest.toLocaleDateString(languageLocale(), { weekday: 'long', day: 'numeric', month: 'long' })
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

// ── misconceptions ───────────────────────────────────────────
// /api/validate has been writing what the user got wrong, per section, since
// the beginning, and nothing ever read it back. It is the most valuable data
// here — a concept missed twice for the same reason is worth more than any
// score — so the grouping happens on the way out.
//
// Grouped in JS rather than with an aggregation pipeline: the sandbox store has
// find/updateOne/insertOne and nothing else, and a dashboard that only works
// against real Mongo is a dashboard that cannot be developed against fixtures.

// The text comes from a model, so "janela deslizante" and "Janela Deslizante."
// are the same mistake spelled two ways and have to collapse into one row.
const normalise = s => String(s)
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

function groupMisconceptions(sections) {
  const byKey = new Map();

  for (const s of sections) {
    for (const text of s.misconceptions || []) {
      const key = normalise(text);
      if (!key) continue;

      const at  = s.recorded_at ? new Date(s.recorded_at) : null;
      const hit = byKey.get(key) || { key, text, count: 0, concepts: [], lessons: [], last_seen: null };

      hit.count += 1;
      // The most recent phrasing wins the label: it is the one the user last
      // read in their feedback.
      if (!hit.last_seen || (at && at > hit.last_seen)) { hit.last_seen = at; hit.text = text; }
      if (s.concept_id && !hit.concepts.includes(s.concept_id)) hit.concepts.push(s.concept_id);
      if (s.lesson_id  && !hit.lessons.includes(s.lesson_id))   hit.lessons.push(s.lesson_id);

      byKey.set(key, hit);
    }
  }

  return [...byKey.values()].sort((a, b) =>
    b.count - a.count || new Date(b.last_seen ?? 0) - new Date(a.last_seen ?? 0));
}

// ── GET /api/progress ────────────────────────────────────────
// Read full mastery state — used by the dashboard (my-learning.html)
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const today = new Date();

    const [concepts, lessons, conversations, sections] = await Promise.all([
      db.collection('concepts').find({}).toArray(),
      db.collection('lessons').find({}).sort({ completed_at: -1 }).limit(20).toArray(),
      db.collection('conversations').find({}).sort({ recorded_at: -1 }).toArray(),
      db.collection('section_results').find({}).toArray()
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

    res.json({
      concepts,
      lessons,
      conversations,
      pending_reviews,
      misconceptions: groupMisconceptions(sections)
    });

  } catch (err) {
    console.error('progress GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
