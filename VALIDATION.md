# MotionLab validation

Reviewed on 26 October 2026. The application has no production dependencies or build step.

## Automated checks

Run with Node.js 22.7 or later:

```sh
node --test tests/*.test.mjs
```

All 63 tests pass. Coverage includes model validation, rotated geometry, sparse interpolation, easing, playback scheduling, keyframe edits, all 24 presets, persistence serialization, grouped history, native CSS/HTML generation, export settings, and sample portability/independence. These tests do not substitute for browser rendering checks.

The three distributed samples match their canonical generators and pass project normalization and JSON round trips. Each contains three independently editable animated layers.

A development-only engine workload evaluated 500 elements over 600 timestamps (300,000 evaluations) in approximately 1,021 ms on this machine, with finite results. This measures interpolation only; it is not a browser rendering or frame-rate benchmark.

## Browser checks

The in-app browser was used for the following checks during development:

- Element creation and selection, pointer move/resize/rotate, property edits, image import, layers, zoom/pan/fit, and keyboard shortcuts.
- Playback, seeking, reverse/speed/loop/stop, independent sparse tracks, auto-key editing, marker movement/deletion, duration rescaling, and timeline zoom.
- All preset families and actual typewriter clipping, staggered dots, spinner stroke, glow, shimmer, 3D flip, and easing graph editing.
- IndexedDB save/autosave/reload, retained image assets/keyframes, import rejection, project duplicate/Trash/Restore, field/drag undo and redo.
- Native export midpoint values, clipboard copy, parsed JSON download, persisted export settings, and matching independent native CSS tracks.

Additional browser checks:

- All three samples open as fresh locally saved documents. Existing review documents remain in the library.
- Loading sample has seven layers and 15 dot keyframes. At 450 ms its dots have distinct Y values (approximately 276.143, 299.413, 300).
- Motion sample at 900 ms places the square at (300, 210), rotated 78 degrees.
- Text entrance is fully visible at 1,800 ms with readable supporting text.
- Desktop panel separator responds to an arrow key (240 to 250 px).
- A real snapped canvas drag ends at (848, 112), both multiples of 16. One Undo restores (800, 72).
- At 320, 390, and 768 px iframe viewport widths, document scroll width equals viewport width. At 390 px, the properties drawer opens beneath the 112 px wrapped toolbar and Escape closes it.
- The compact desktop layout fits 1280 × 720 without document overflow in either direction.
- Final browser warning/error log is empty.

For repeatable responsive review, serve the repository and open `tests/responsive.html`. Its width control resizes a real instance of the editor; the report shows viewport width, scroll width, toolbar height, and drawer position. The editor uses the same local project storage as the main app.

For independent native CSS rendering review, generate a paused export fixture:

```sh
node tests/build-export-fixture.mjs
python3 -m http.server 8001 --bind 127.0.0.1 --directory /tmp/motionlab-export-check
```

Compare rendered properties at 1,500 ms against the generated `expected.json`.

## Remaining verification and product boundaries

Native Google Chrome access was not approved by the computer-use tool. Independent Chromium testing remains unverified. Safari/Firefox and physical mobile-device testing were not performed. No browser frame-rate claim is made for the maximum project size.

Native CSS export uses registered custom properties and requires a modern browser. The editor is local-first: storage belongs to the browser and origin; JSON backups are portable. Export timing preferences apply to the composition. Workspace transport preferences are separate. Turned 3D poses use numerical property editing rather than 2D resize handles.
