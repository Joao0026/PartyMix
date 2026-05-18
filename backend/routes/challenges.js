const router = require('express').Router();
const requireAdmin = require('../middleware/requireAdmin');
const Challenge = require('../models/Challenge');
const { asyncRoute, bool, cleanString, intInRange, mongoId, oneOf } = require('../lib/validate');

const CATEGORIES = ['telepatia','perguntas','desenho','mimica','proibido','caos','palavra','acao','verdade','consequencia','cultura','desporto','musica','cinema','erotico','romantico','picante','roleplay','dados','casal_pergunta'];
const MODES = ['couple','friends','family','all'];
const DIFFICULTIES = ['facil','medio','dificil'];

function categoryFilter(value) {
  if (!value) return undefined;
  return String(value)
    .split(',')
    .map((c) => oneOf(c.trim(), CATEGORIES, { field: 'category' }));
}

router.get('/', asyncRoute(async (req, res) => {
  const { category, mode_type, difficulty } = req.query;
  const f = {};
  const cats = categoryFilter(category);
  if (cats) f.category = { $in: cats };
  if (mode_type) f.mode_type = { $in: [oneOf(mode_type, MODES, { field: 'mode_type' }), 'all'] };
  if (difficulty) f.difficulty = oneOf(difficulty, DIFFICULTIES, { field: 'difficulty' });
  res.json(await Challenge.find(f));
}));

router.get('/random', asyncRoute(async (req, res) => {
  const { category, mode_type } = req.query;
  const f = {};
  const cats = categoryFilter(category);
  if (cats) f.category = { $in: cats };
  if (mode_type) f.mode_type = { $in: [oneOf(mode_type, MODES, { field: 'mode_type' }), 'all'] };
  const count = await Challenge.countDocuments(f);
  if (!count) return res.status(404).json({ error: 'No challenges found' });
  res.json(await Challenge.findOne(f).skip(Math.floor(Math.random() * count)));
}));

router.post('/', requireAdmin, asyncRoute(async (req, res) => {
  const payload = {
    text: cleanString(req.body.text, { field: 'text', max: 300, required: true }),
    category: oneOf(req.body.category, CATEGORIES, { field: 'category', required: true }),
    mode_type: oneOf(req.body.mode_type, MODES, { field: 'mode_type', required: true }),
    difficulty: oneOf(req.body.difficulty, DIFFICULTIES, { field: 'difficulty', defaultValue: 'medio' }),
    answer: cleanString(req.body.answer, { field: 'answer', max: 200 }),
    choices: Array.isArray(req.body.choices)
      ? req.body.choices.map((choice) => cleanString(choice, { field: 'choice', max: 120 })).filter(Boolean).slice(0, 4)
      : [],
    forbiddenWords: Array.isArray(req.body.forbiddenWords)
      ? req.body.forbiddenWords.map((w) => cleanString(w, { field: 'forbiddenWord', max: 40 })).filter(Boolean).slice(0, 5)
      : [],
    sips_penalty: intInRange(req.body.sips_penalty, { field: 'sips_penalty', min: 0, max: 20, defaultValue: 2 }),
    time_limit: intInRange(req.body.time_limit, { field: 'time_limit', min: 0, max: 600, defaultValue: 0 }),
    is_ongoing: bool(req.body.is_ongoing),
    ongoing_rounds: intInRange(req.body.ongoing_rounds, { field: 'ongoing_rounds', min: 0, max: 20, defaultValue: 0 }),
    ongoing_instruction: cleanString(req.body.ongoing_instruction, { field: 'ongoing_instruction', max: 300 }),
    pack: cleanString(req.body.pack, { field: 'pack', max: 60, defaultValue: 'base' }),
    audience: oneOf(req.body.audience, ['family','adult','all',''], { field: 'audience', defaultValue: '' }),
  };
  res.status(201).json(await new Challenge(payload).save());
}));

router.delete('/:id', requireAdmin, asyncRoute(async (req, res) => {
  await Challenge.findByIdAndDelete(mongoId(req.params.id));
  res.json({ deleted: true });
}));

module.exports = router;
