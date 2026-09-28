# Emergency Landing ✈️

A browser maths game set in the cockpit of a Boeing 747 in trouble. Every emergency (birds, engine fire, decompression, a door blowing open, weight and balance, finding a runway, the final landing) is solved by answering maths questions. Right answers keep the plane flying and the passengers on board.

> Boeing 747. You're in the cockpit. Dodge the birds, put out the engine fire, save the passengers falling out, and land the plane. You'll need maths to do it. Come on down to the 747!

## Running it

Open `index.html` in a browser. You don't need a server, an internet connection or a build step, so it can run straight from a USB stick or a shared drive. It works with a mouse, a keyboard and touch, on laptops and tablets.

To run the maths-engine checks (needs Node.js):

```sh
npm test
```

## How a flight works

1. **Start screen.** The **Teacher settings** panel sets the topic, difficulty, answer style, timer, flight length, sound and captions. Settings are remembered on the device.
2. **Take-off**, then 3, 4 or 6 random emergencies (short, normal or long flight). Each type appears once before any repeats.
3. Each emergency starts with an alarm, then 3–4 questions. Every answer changes something right away: the plane dodges a flock, a checklist step is ticked off, passengers parachute out, the altitude drops, fuel is dumped, and so on.
4. **Find a place to land.** Each right answer gets the radio facts (distance and runway length) for one airport. Then the player picks one that is in range and has a runway of at least 3,000 m.
5. **Final approach.** Five of the hardest questions. Right answers, minus up to 2 for tricky conditions (short runway, no engines, unbalanced plane), decide the ending:

| Approach score | Ending |
|---|---|
| 5 | ⭐⭐⭐ Butter-smooth landing |
| 4 | ⭐⭐ Smooth landing |
| 3 | ⭐ Bumpy but safe |
| 2 | Cabbage field short of the runway (or the duck pond, if out of fuel) |
| 0–1 right, or nothing left after penalties | Straight into the control tower |
| every passenger gone | The empty-plane ending |

6. **Results** show passengers on board, landing stars, accuracy, score, best streak, and every missed question with the right answer and a short explanation.

Chains and knock-on effects: a second bird strike in one flock sets an engine on fire (the fire checklist comes next). Losing every engine, or running out of fuel, sends you straight to landing as a glider. Dumping fuel shrinks your range when you look for an airport.

Passenger loss is never graphic. Passengers "grab parachutes and jump", and the ending cartoons are silly rather than scary.

## The maths

| Topic | Level 1 (easiest) → Level 5 (hardest) |
|---|---|
| **Mixed number work** (default) | A weighted mix of the four below |
| Adding & subtracting | bonds to 20 → 2-digit → 3-digit → 4-digit and missing numbers |
| Times tables & dividing | ×2, ×5, ×10 → all tables to 12 → 2-digit × 1-digit → 2-digit × teens, 3-digit ÷ 1-digit |
| Place value & rounding | 10 more/less, digit values → rounding to 10/100/1000 → × and ÷ by 10 and 100 with decimals |
| Fractions & percentages | halves and quarters → unit fractions → non-unit fractions → percentages of amounts |

- **Difficulty** sets the starting level: Cadet = 1, Pilot = 2, Captain = 3. Questions go up one level halfway through the emergencies, up one more for finding a runway, and up two for the final landing (capped at 5).
- **Answers**: the default is multiple choice, with typed answers for level 4 and 5 questions. You can also choose always multiple choice or always typed. Typed answers use an on-screen keypad, so no tablet keyboard pops up.
- **Timer**: normal (15–35 s depending on level, +5 s for typed), relaxed (double time) or off.
- No question repeats within a flight. Wrong answers show the correct answer and a quick, kind tip (for example "Split 38 into 30 and 8…").

## Accessibility

- Relaxed timer or no timer.
- Warning colours come from the Okabe–Ito colour-blind-safe palette. Every warning also has an icon, a word and a striped pattern, so nothing relies on colour alone.
- Sound on/off, with separate captions for every sound (for example "🔔 Fire bell ringing!").
- Big text and big touch targets. Keys <kbd>1</kbd>–<kbd>4</kbd> pick answers, the arrow keys pick bird lanes, and <kbd>P</kbd> pauses.
- Respects "reduce motion" (no flashing or shaking).
- Nothing personal is stored, only settings and a best score per difficulty (in `localStorage`).

## Project structure

```
index.html            screens + script tags (plain scripts, so it runs from file://)
css/style.css
js/core/              util.js (helpers, EL namespace), clock.js (pausable game clock)
js/questions/         engine.js (quiz master, choices, answer checking)
js/questions/topics/  addsub.js, times.js, placevalue.js, fractions.js, mixed.js
js/events/            registry.js + one file per emergency
js/ui/                audio.js, art.js, scene.js (windscreen), dashboard.js, challenge.js, screens.js
js/game.js            flight loop, plane state, scoring, endings
js/main.js            boot, pause/quit wiring
tests/                questions.test.js (node)
```

### Adding a maths topic

Create `js/questions/topics/mytopic.js`:

```js
(function (EL) {
  EL.questions.registerTopic({
    id: 'mytopic',
    name: 'My topic',
    description: 'Shown in the teacher settings.',
    generate(level) {           // level 1–5
      const a = EL.util.randInt(2, 9);
      return {
        key: `my:${a}`,         // unique, for no-repeats
        prompt: `${a} squared = ?`,
        answer: a * a,
        distractors: [a * 2, a * a + a],
        explain: `${a} × ${a} = ${a * a}.`,
      };
    },
  });
})(window.EL);
```

Then add a `<script>` tag in `index.html`. It will appear in the teacher settings automatically. To include it in "Mixed", add it to `MIX` in `mixed.js`, and add its key format to `tests/questions.test.js` so its answers are checked.

### Adding an emergency

Create `js/events/myEvent.js` and call `EL.events.register({ id, title, icon, random: true, canRun(state), async run(ctx) })`, then add a `<script>` tag. The `ctx` object (see `makeContext` in `js/game.js`) gives you `alarm`, `ask`, `message`, `choose`, `losePassengers`, `setEngine`, `changeAltitude`, `changeFuel`, `insertNext`, the `scene` and the plane `state`. `random: true` puts it into the random pool.

## Decisions I made where the brief left things open

These are easy to change:

- **Year group / progression step**: three difficulties, labelled roughly as progression step 2, step 3, and step 3 into 4.
- **Topics**: mixed number work by default, plus four single-topic options.
- **Answer style**: multiple choice, typed for the hardest questions (configurable).
- **Flights**: one-off flights, not a campaign.
- **Prime Hack**: I treated this brief's design as the source of truth for the pace and format.
- **The "crocodile sign"**: not built. The brief says it would be clarified first.
