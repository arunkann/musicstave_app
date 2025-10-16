# Music Stave App (Piano Sight‑Reading Practice)

This is a browser-based practice tool for students learning to sight‑read music on piano. It renders treble and bass staves and generates practice measures with either “less random” musical phrasing or “more random” patterns for variety. It is designed to be quick to run (just open the HTML file) and easy to customize.

## Features

- Two staves (treble and bass) rendered with VexFlow
- Time signature selection: 4/4 and 3/4
- Configurable number of measures
- Pitch range controls around a chosen “center” note for each clef
- Display toggles for:
  - Show Treble Clef
  - Show Bass Clef
  - Less Random (musical, motif-based)
  - More Random (fully random, independent by clef)
- Alignment pass to ensure treble/bass columns stay vertically aligned, even with rests and whole notes
- Default mode (both “Less Random” and “More Random” unchecked): identical measure pattern across clefs (useful for beginner practice)

## Modes

- Less Random (recommended for sight‑reading):
  - Uses a single base rhythm for both treble and bass across the measure(s)
  - Treble plays a simple stepwise motif with small, bounded variation
  - Bass follows a deterministic pattern: root → fifth → root → third (repeating)
  - Produces more musical, less jarring phrases that are suitable for early practice

- More Random:
  - Fully independent random generation per clef using quarter, half, and whole durations
  - Good for variety and later practice stages

- Both Unchecked:
  - The two clefs share the same underlying rhythmic pattern, yielding identical structure for simpler, parallel sight‑reading

Mutual exclusivity is enforced: selecting one option automatically unselects the other. You can also deselect both.

## Getting Started

- Live demo: https://arunkann.github.io/musicstave_app/
- Prerequisites: a modern browser (Chrome, Firefox, Edge, or Safari)
- Run:
  1. Open `index.html` in your browser
  2. Set time signature, number of measures, and pitch range
  3. Choose “Less Random” (musical) or “More Random”, or leave both unchecked for identical patterns
  4. Click “Generate”

No build step is required. The app uses VexFlow via CDN.

## Development

- Project layout:
  - `index.html` — UI and script loading
  - `main.js` — core generation/rendering logic
  - `spec/` — Jasmine test(s)
  - `main.test.js` — Jest tests
  - `.gitignore` — includes both `cline_storage/` and `.cline_storage/`

- Rendering details:
  - Stave notes are attached to their staves explicitly
  - Voices are formatted with a shared formatter per measure to share tick contexts
  - A post-format alignment pass matches treble/bass columns by cumulative beat position

- Testing:
  - Install: `npm install`
  - Run: `npm test`
  - Jest uses jsdom for minimal DOM; tests cover pitch conversion, stem direction, measure generation, and mode-specific guarantees

## Contributing

- File issues/PRs for:
  - New rhythmic patterns (eighth notes, dotted rhythms)
  - Scale/mode selection (e.g., C Major, A Minor)
  - Chord progressions to drive multi-measure practice
  - Visual connectors/barlines across the grand staff

## Notes

- This app focuses on sight‑reading practice for piano students; it intentionally keeps the UI simple and the rhythms basic (quarters/halves/wholes).
- If you fork this repo, keep `cline_storage/` and `.cline_storage/` ignored; they’re tool-local state.

## Credits

- Rendering powered by [VexFlow](https://github.com/0xfe/vexflow).

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.
