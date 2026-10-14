# FocusLab · 专注力实验室

**A science-based attention training lab — measure, train, and apply focus.**
基于认知科学的专注力训练：测量、训练、应用。

👉 **Live app: https://chaoyue0307.github.io/focuslab/**

No account, no server, no tracking — all data stays in your browser. Works offline and can be installed as an app (PWA). 中文 / English.

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
| **9 exercises** | PVT · SART · Flanker · Stroop · Task switching · Dual N-Back · Multiple Object Tracking · Schulte table · Breath counting |
| **Assessment** | 15-min standardized battery with fixed difficulty — retest every 2 weeks and compare benchmarks |
| **Deep focus** | Intention + if-then plan, pre-flight checklist, 1-min slow-breathing primer, distraction logging (`D`), brown/pink/white/rain noise, breaks, endurance suggestions, survives reloads |
| **Progress** | Focus Index, attention profile vs. baseline, per-exercise trends, deep-focus chart, practice calendar, time-of-day profile, assessment benchmarks |
| **Personal insights** | Sleep, exercise, stress, caffeine and time-of-day effects computed from *your* data |
| **Learn** | 7 dimensions of attention, 12 evidence-rated habits, an in-the-moment toolkit, references |

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

Timing-critical tasks (PVT, SART) update the DOM directly on animation frames and use event timestamps, so reaction times aren't distorted by rendering. Leaving the page mid-task invalidates and restarts that task.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # scoring & analytics unit tests
npm run build    # static build in dist/
```

Stack: React 19 + TypeScript + Vite. No UI or chart libraries — charts are hand-built SVG with hover tooltips and table views. Deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Project layout

```
src/
  tasks/       9 exercises, the shared runner (intro → countdown → task → results), metadata, feedback
  pages/       Today, Train, Focus, Progress, Learn, Settings, Onboarding, Flow (plan / assessment)
  lib/         scoring, analytics (focus index, plan, insights), store, audio, i18n, stats
  components/  charts, icons, UI primitives
  content/     habits, toolkit and references for the Learn page
```

## Disclaimer

FocusLab is not a medical device and does not diagnose anything. If attention problems persistently affect your life, please talk to a professional.

## License

MIT
