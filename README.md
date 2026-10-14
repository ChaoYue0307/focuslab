# FocusLab · 专注力实验室

**A science-based attention training lab — measure, train, and apply focus.**
基于认知科学的专注力训练：测量、训练、应用。

👉 **Live app: https://chaoyue0307.github.io/focuslab/**

No account, no server, no tracking — all data stays in your browser. Works offline and can be installed as an app (PWA).

**10 languages:** 简体中文 · 繁體中文 · English · 日本語 · 한국어 · Español · Français · Deutsch · Português · Русский — defaults to 简体中文; switch anytime from the sidebar, the globe icon on mobile, or Settings, and `?lang=ja` links open a specific language.

---

## Why FocusLab is different

Most "brain games" promise that playing makes you smarter. The research says gains on trained tasks are real, but transfer to everyday life is limited ([Simons et al., 2016](https://scholar.google.com/scholar?q=%22Do+brain-training+programs+work%22)). FocusLab is built around that honest finding:

1. **Measure** — classic, validated paradigms give you objective numbers for 7 dimensions of attention, plus a daily alertness check (PVT) that tracks your *state*.
2. **Train** — adaptive difficulty keeps every drill at the edge of your ability.
3. **Transfer** — the things with stronger evidence of real-world benefit get first-class support: breath-counting mindfulness, deep-focus sessions on real work, distraction parking, and daily check-ins (sleep, exercise, stress, caffeine) that reveal what drives *your* focus.

## Features

| Area | What you get |
| --- | --- |
| **Daily plan** | ~15 min: PVT state check → 3 core drills picked by weakness & recency → breath counting cool-down |
| **Readiness** | Today's focus state from your check-in and PVT vs. your own baseline, with a concrete plan-your-day recommendation |
| **9 exercises** | PVT · SART · Flanker · Stroop · Task switching · Dual N-Back · Multiple Object Tracking · Schulte table · Breath counting — adaptive difficulty, unscored practice round on first use, colour-vision-friendly Stroop |
| **Session timeline** | Every reaction-time task shows trial-by-trial RTs, errors and misses, plus first-half vs second-half drift (vigilance decrement) |
| **Assessment** | 15-min standardized battery with fixed difficulty — retest every 2 weeks and compare benchmarks |
| **Deep focus** | Intention + if-then plan, pre-flight checklist, slow-breathing primer, **attention probes** (experience sampling: "where is your attention right now?"), distraction logging by type, brown/pink/white/rain noise, breaks, endurance suggestions, survives reloads |
| **Personal experiments** | 14-day n-of-1 experiments with randomized ON/OFF days (phone out of the room, outdoor breaks, extra meditation, exercise first, social-media-free mornings) and an ON-vs-OFF comparison of performance, focus ratings, distraction rate and on-task rate |
| **Habit tags** | Tag each day (built-in or your own); insights estimate each habit's effect on *your* focus |
| **Weekly review** | Week-over-week stats, top distraction source, insights, achievements, and a 3-question reflection |
| **Progress** | Focus Index, attention profile vs. baseline, per-exercise trends, deep-focus chart, probe results, distraction sources, practice calendar, time-of-day profile, benchmarks, 21 achievements |
| **Learn** | 7 dimensions of attention, 12 evidence-rated habits, an in-the-moment toolkit, references |
| **Reliability** | Offline-first PWA (all chunks precached), error boundary with data rescue, storage-failure warnings, backup reminders, daily calendar reminder (.ics) |

### The exercises

| Domain | Exercise | Key metric | Based on |
| --- | --- | --- | --- |
| Alertness | Psychomotor Vigilance Task | Median RT, lapses (≥500 ms) | Dinges & Powell 1985; Basner et al. 2011 |
| Sustained attention | Sustained Attention to Response Task | Commission errors, RT variability | Robertson et al. 1997 |
| Interference control | Arrow Flanker | Conflict cost | Eriksen & Eriksen 1974 |
| Interference control | Color-word Stroop | Interference cost | Stroop 1935 |
| Cognitive flexibility | Cued task switching | Switch cost | Monsell 2003 |
| Working memory | Dual N-Back (Jaeggi adaptive rule) | Mean N, d′ | Jaeggi et al. 2008 |
| Attentional breadth | Multiple Object Tracking | Guess-corrected capacity | Pylyshyn & Storm 1988 |
| Attentional breadth | Schulte table | Seconds per cell | — |
| Meta-awareness | Breath counting | Count accuracy, self-caught resets | Levinson et al. 2014 |

Timing-critical tasks (PVT, SART) update the DOM directly on animation frames and use event timestamps, so reaction times aren't distorted by rendering. Leaving the page mid-task invalidates and restarts that task. Breath counting penalizes press rates far above natural breathing so it can't be gamed.

### How the personal experiments work

Each experiment randomizes 14 days into 7 ON and 7 OFF days (no runs longer than 3), so "I only did it on good days" can't bias the result. For each outcome FocusLab reports the ON and OFF means, Cohen's *d* and a Welch *t*: |t| ≥ 2 is labelled a clear difference, |d| ≥ 0.5 a possible one. Logged compliance overrides the schedule. Fourteen days is a small sample — results are personal guidance, not proof.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests: scoring, analytics, experiments, readiness, probes, achievements
npm run build    # static build in dist/
```

Stack: React 19 + TypeScript + Vite. No UI or chart libraries — charts are hand-built SVG with hover tooltips and table views. Deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Translations

Strings are authored inline as Chinese/English pairs — `t('中文', 'English', {n})` or `{ zh, en }` content objects — so the two source languages never drift apart. Every other language is a dictionary in `src/locales/<code>.json` keyed by a hash of the English string and loaded on demand (~20 KB gzipped each).

```bash
npm run i18n     # re-extract source strings (TypeScript AST) and regenerate 繁體中文 via OpenCC
node scripts/i18n-merge.mjs ja   # merge scripts/i18n-parts/ja.*.tsv sheets into src/locales/ja.json
npm run i18n:audit   # heuristic check: numbers, placeholders, key names, untranslated or colliding strings
npm test         # fails if any language misses a string or breaks a {placeholder}
```

Stroop color words are shown in the user's language, because the interference effect depends on automatic reading.

## Project layout

```
src/
  tasks/       9 exercises, the shared runner (intro → countdown → task → results), metadata, feedback
  pages/       Today, Train, Focus, Progress, Learn, Settings, Onboarding, Flow (plan / assessment)
  lib/         scoring, analytics (focus index, plan, insights), personal (experiments, readiness,
               weekly review, habit effects), achievements, focus-session state, store, audio, i18n, stats
  components/  charts, icons, UI primitives
  content/     habits, toolkit and references; habit tags, experiment templates, distraction types
```

## Disclaimer

FocusLab is not a medical device and does not diagnose anything. If attention problems persistently affect your life, please talk to a professional.

## License

MIT
