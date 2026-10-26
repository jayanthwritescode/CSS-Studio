# MotionLab

A visual CSS animation studio, built incrementally with HTML, CSS, and vanilla JavaScript ES modules. No build step, frontend framework, or production dependencies.

**Current batch: Phase 1 — Foundation.** This is the working workspace foundation; animation editing is still to come. Each phase pauses for a manual GitHub push before the next phase starts.

## Run locally

From the repository directory:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. Use a static HTTP server rather than opening `index.html` through `file://`, because browser ES modules require HTTP. Python only serves files during development; the application itself is browser-only. Deploy the same files to any static host.

## Available now

- Responsive charcoal workspace with project, canvas properties, and timeline regions.
- Editable project name (Enter commits; Escape cancels).
- Canvas presets: HD, Full HD, square, portrait, and custom sizes (64–4096 px).
- Live canvas background color picker.
- Zoom from 5% to 200%, fit to available space, grid toggle, and view reset.
- Fit mode follows viewport and canvas size changes; manual zoom stays fixed.
- Accessible labels, focus indicators, native guide dialog, and reduced-motion styles.
- Immutable state store separating serializable project data from workspace view state.

Project changes currently live **in memory** and reset on reload. Save/load and autosave arrive in Phase 5. The empty canvas message is editor guidance, not a project element. Timeline markings are a clearly labeled foundation, not playable animation.

### Workspace shortcuts

| Key | Action |
| --- | --- |
| `F` | Fit canvas |
| `G` | Toggle grid |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `?` | Open build guide |
| `Escape` | Close guide / cancel project rename |

Shortcuts do not intercept typing in fields or modified browser shortcuts.

## Architecture

```text
index.html                  Semantic application shell
css/variables.css           Theme tokens and base styles
css/layout.css              Panel layout and responsive behavior
css/components.css          Controls, fields, dialog, empty states
css/canvas.css              Workspace grid and artboard
js/main.js                  App composition
js/state/store.js           Project/view state, validated actions, subscriptions
js/canvas/renderer.js       Artboard rendering and responsive fit
js/panels/properties.js     Canvas settings bindings
js/panels/toolbar.js        Project name, view controls, shortcuts, guide
assets/favicon.svg          Local app icon
```

Future animation, export, history, and persistence modules will be added when their phases begin; there are no stub implementations for them.

## Phase checkpoints

1. **Foundation (current):** structure, dark shell, panels, canvas, basic state.
2. **Canvas editor:** create/remove elements, selection, drag/resize/rotate, layers, properties.
3. **Animation engine:** keyframe model, interpolation, playback, scrubbing, timeline editing.
4. **Advanced animation:** editable presets, easing editor, multi-element refinements.
5. **Persistence and export:** local projects, JSON import/export, CSS/HTML generation, undo/redo.
6. **Polish and validation:** responsive refinements, accessibility, sample projects, export checks, documentation.

See [PHASES.md](PHASES.md) for batch handoff and validation, and [the original brief](docs/PROJECT-BRIEF.md) for the full project requirements.

## Verification

The app has no Node runtime dependency. For optional state tests, Node.js 22.7+ can run:

```sh
node --test tests/store.test.mjs
```

Browser validation should cover changing canvas presets/dimensions/background, rename including HTML-like input, zoom/fit/grid, keyboard focus, guide dismissal, and narrow layouts. Later phases will add tests for their engine and export logic.
