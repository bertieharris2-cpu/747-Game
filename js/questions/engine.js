/*
 * The maths engine.
 *
 * Topics register a generator: generate(level) → raw question, where level is
 * 1 (easiest) to 5 (hardest). A raw question looks like:
 *
 *   {
 *     key: 'mul:7x8',          // unique id, used to avoid repeats in a flight
 *     prompt: '7 × 8 = ?',     // HTML (generated internally, numbers only)
 *     answer: 56,              // always a number
 *     distractors: [48, 63],   // plausible wrong answers (optional)
 *     explain: '7 × 8 = 56 …', // short, kind explanation shown after a miss
 *   }
 *
 * The quiz master adds the level, answer style, multiple-choice options and
 * time limit, and makes sure nothing repeats within a flight.
 */
(function (EL) {
  'use strict';

  const U = EL.util;
  const topics = {};
  const order = [];

  // Seconds allowed per question at each level (normal timer).
  const TIME_BY_LEVEL = { 1: 15, 2: 18, 3: 22, 4: 28, 5: 35 };
  const TYPED_EXTRA_SECONDS = 5;

  function registerTopic(topic) {
    if (!topics[topic.id]) order.push(topic.id);
    topics[topic.id] = topic;
  }

  function listTopics() {
    return order.map((id) => topics[id]);
  }

  /*
   * Build n options including the answer. Uses the topic's own distractors
   * first, then fills with near misses. If correctIndex is given, the answer is
   * placed there (the bird-strike lanes need this).
   */
  function makeChoices(answer, distractors, n = 4, correctIndex = null) {
    answer = U.round(answer);
    const isInt = Number.isInteger(answer);
    const allowNegative = answer < 0;
    const seen = new Set([String(answer)]);
    const wrong = [];

    const accept = (v) => {
      if (typeof v !== 'number' || !isFinite(v)) return false;
      v = U.round(v);
      if (!allowNegative && v < 0) return false;
      if (isInt && !Number.isInteger(v)) return false;
      if (seen.has(String(v))) return false;
      seen.add(String(v));
      wrong.push(v);
      return true;
    };

    for (const v of U.shuffle(distractors || [])) {
      if (wrong.length >= n - 1) break;
      accept(v);
    }

    const step = isInt ? (Math.abs(answer) >= 100 ? 10 : 1) : Math.pow(10, -U.decimals(answer));
    for (let k = 1; wrong.length < n - 1 && k < 500; k++) {
      for (const sign of U.shuffle([1, -1])) {
        if (wrong.length >= n - 1) break;
        accept(answer + sign * k * step);
      }
    }

    const all = U.shuffle([answer, ...wrong]);
    if (correctIndex != null && correctIndex >= 0 && correctIndex < all.length) {
      all.splice(all.indexOf(answer), 1);
      all.splice(correctIndex, 0, answer);
    }
    return all;
  }

  // Accepts "1,234", "1 234", " 0.5", ".5", "−3". Returns NaN for anything else.
  function parseAnswer(text) {
    const cleaned = String(text).replace(/[,\s]/g, '').replace(/−/g, '-');
    if (!/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return NaN;
    return Number(cleaned);
  }

  function isCorrect(question, value) {
    return typeof value === 'number' && isFinite(value) && Math.abs(value - question.answer) < 1e-9;
  }

  /*
   * settings: { topic, answerStyle: 'auto'|'choice'|'typed', timer: 'normal'|'relaxed'|'off' }
   */
  function createQuizMaster(settings) {
    const used = new Set();

    function styleFor(level) {
      if (settings.answerStyle === 'choice' || settings.answerStyle === 'typed') return settings.answerStyle;
      return level >= 4 ? 'typed' : 'choice'; // default: typed answers only for the hardest questions
    }

    function timeFor(level, style) {
      if (settings.timer === 'off') return null;
      let t = TIME_BY_LEVEL[level] + (style === 'typed' ? TYPED_EXTRA_SECONDS : 0);
      if (settings.timer === 'relaxed') t *= 2;
      return t;
    }

    return {
      next(level, opts = {}) {
        level = U.clamp(Math.round(level), 1, 5);
        const topic = topics[settings.topic] || topics.mixed || topics[order[0]];
        let q;
        for (let tries = 0; tries < 60; tries++) {
          q = topic.generate(level);
          if (!used.has(q.key)) break;
        }
        used.add(q.key);
        const style = opts.style || styleFor(level);
        const answer = U.round(q.answer);
        return {
          ...q,
          answer,
          level,
          style,
          choices: style === 'choice' ? makeChoices(answer, q.distractors, opts.numChoices || 4, opts.correctIndex) : null,
          timeLimit: timeFor(level, style),
        };
      },
    };
  }

  EL.questions = {
    registerTopic,
    listTopics,
    get: (id) => topics[id],
    makeChoices,
    parseAnswer,
    isCorrect,
    createQuizMaster,
    TIME_BY_LEVEL,
  };
})(window.EL);
