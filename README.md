# MotionLab

A browser-based visual CSS animation studio built with HTML, CSS, and vanilla JavaScript ES modules. No build step, frontend framework, or production dependencies.

The canvas editor, keyframe engine, interactive timeline, 24 animation presets, and graphical easing editor are implemented. Persistence, history, and export are the next internal development batch. The product interface contains only working tools and product guidance; build checkpoints live in [PHASES.md](PHASES.md).

## Run locally

From the repository directory:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. Use HTTP instead of opening `index.html` through `file://`, because ES modules require HTTP. Python only serves files during development; the application itself runs entirely in the browser. The same files can be deployed to a static host.

## Canvas editor

- Add rectangles, circles, text, and local images from the Elements panel, Add element menu, or keyboard.
- Select elements on the canvas or in Layers. Click empty workspace or press Escape to deselect.
- Drag to reposition, resize with eight edge/corner handles, and rotate with the round handle. Hold Shift while rotating to snap to 15°.
- Edit position, dimensions, rotation, independent X/Y scale, opacity, and transform origin numerically.
- Customize fill, transparent fill, border width/style/color/radius, and drop shadow offsets/blur/spread/color.
- Edit text content, family, size, weight, and color. Text preserves line breaks and renders as literal text.
- Align transformed element bounds to the canvas edges or center.
- Rename, duplicate, hide, lock, delete, and reorder layers. Layers list front to back; project elements are stored back to front.
- Locked layers remain selectable and renameable, but their appearance, transforms, order, content, and deletion are protected. Duplicate creates an unlocked copy. Hidden elements remain available through Layers.
- Choose canvas dimensions, presets, and background color. Zoom from 5% to 200%, pan, fit, and toggle the workspace grid.
- At narrow widths, the Layers button opens the project panel and Properties moves below the canvas.

Image import supports PNG, JPEG, WebP, and GIF files up to 5 MB and 40 megapixels. Files are decoded before adding; invalid files produce a notification. Image data lives in the project model as a data URL with no remote asset dependency.

**Changes currently live in memory and reset on reload.** Persistence, autosave, JSON import/export, CSS/HTML export, and undo/redo are not yet implemented. Do not use this development build for work that needs saving. The empty-canvas artwork is editor guidance, not a project element.

## Animate a composition

1. Add an element and design its starting pose with **Animate off** (base mode).
2. Click **+ Keyframe** or press `K` to capture a keyframe at time zero.
3. Seek to another time using the ruler, playhead, or **Time** field in milliseconds.
4. Edit position, rotation, scale, opacity, size, or color in Properties, or drag/resize/rotate on the canvas. **Animate mode automatically records these edits at the playhead.**
5. Select a keyframe diamond to edit its pose, exact timestamp, and easing. Drag diamonds to move them; Shift snaps to 100 ms. Occupied timestamps are protected from move collisions. Capturing an existing timestamp updates that keyframe.
6. Press **Play** or `Space`. Pause resumes from the current position; Stop returns to time zero; Restart plays again from the start in the current direction. Reverse, 0.5×/1×/2× speed, and Loop affect the preview.

Each element has an independent track. Scrubbing always evaluates the actual animation. The playhead supports Left/Right by 10 ms, Shift + Left/Right by 100 ms, and Home/End. Focus a keyframe marker to move it with those keys. Delete/Backspace inside the timeline deletes the selected keyframe; outside the timeline it deletes the selected element.

The **Duration** field uses seconds (0.001–120). Enter or blur commits the value, rescales all keyframe timestamps and the playhead proportionally, and preserves the current pose. Timeline zoom changes the horizontal editing scale and provides horizontal scrolling. Previous/next keyframe buttons navigate the selected track, or all tracks when no element is selected.

**Base mode** edits the element's underlying styles and shows those styles at time zero. Explicit keyframes remain unchanged. Seeking or playing enters Animate mode; turn Animate off to return to base editing. Transform (including the 3D turn), dimensions, opacity, reveal, glow, shimmer position, fill/text/border colors, border width/radius, and font size can be keyed. Text content, font family/weight, transparent fill, border style, shadow, shimmer/spinner enable switches, and transform origin apply across the whole element.

Keyframes contain independent property values. Missing values interpolate between that property's surrounding keys; a missing starting value uses the base style at zero, and the final keyed value holds to the project end. Easing belongs to the starting key of each property segment. Standard CSS easings and validated `cubic-bezier(x1, y1, x2, y2)` values are supported. The graph editor and preset library are connected to these same editable tracks.

Playback uses one `requestAnimationFrame` scheduler and a shared evaluator for preview and scrubbing. Compiled property tracks and current poses are cached per immutable element. Hidden elements retain their keyframes; locked elements can play but cannot have keyframes edited. Playback pauses when the tab becomes hidden or a property field receives focus.

## Preset library

Open **Presets** in the canvas toolbar or **Browse animation presets** in the Elements panel. Search by name/description or filter by category, choose a card, set duration (0.1–30 seconds), delay (0–30 seconds), and easing, then apply.

| Category | Presets |
| --- | --- |
| Entrance | Fade in, Slide in, Scale in, Rotate in, Bounce in |
| Exit | Fade out, Slide out, Zoom out, Rotate out |
| Attention | Shake, Pulse, Wobble, Swing, Rubber band, Heartbeat |
| Loading | Spinner, Bouncing dots, Skeleton shimmer, Pulsating circle |
| Creative | Floating, Neon glow, Flip, Elastic movement, Typewriter |

Presets replace the target element's keyframes and leave other existing layers intact. Delay is expressed as a held starting pose followed by editable animation keys. The composition extends when the preset ends beyond its current duration; otherwise the final pose holds for the remaining timeline. Timeline Loop repeats the composition. The duration defaults to the current composition length, up to 30 seconds.

- **Bouncing dots** requires a circle and creates three independent 32 px filled circle layers with staggered editable bounces.
- **Pulsating circle** requires a circle. **Skeleton shimmer** requires a rectangle or circle and enables a moving gradient fill.
- **Spinner** enables a transparent fill and a 6 px notched stroke so rotation remains visible on a circle. Fill, border, and Spinner stroke remain editable.
- **Typewriter** requires text, sets a monospaced font, and uses `steps(n, end)` with one step per character (up to 1000). A text-sized inner span provides the reveal independently of the element box width. It works best on a single line.
- **Neon glow** animates actual drop-shadow filters. **Flip** animates a full 3D turn with perspective. Reveal, glow, shimmer, and 3D turn values are editable in Properties.

Resize/rotate handles and canvas alignment are disabled while the element is turned in 3D; use its numerical transform controls at those poses. Returning the 3D turn to a multiple of 360° restores the handles.

Hover or focus a preset card to preview using native Web Animations; the selected card also previews. Previews stop on dialog close and respect reduced-motion preferences. Applying a preset creates actual editable project data; thumbnails are never the only implementation of an effect.

## Visual easing editor

Select a timeline keyframe to reveal its easing graph in Properties. Drag either control point, edit X1/Y1/X2/Y2 numerically, choose a standard easing, or enter a custom CSS easing value. X coordinates stay within 0–1; Y allows overshoot from −10 to 10. Arrow keys adjust a focused handle by 0.01; Shift changes it by 0.1. Escape cancels an active drag.

The graph, generated CSS value, and actual keyframe easing update together. A dot previews the selected easing; **Replay** runs it again. Automatic preview respects reduced motion, with explicit Replay still available. Stepped easing displays a staircase graph and disables cubic control points; change to a cubic easing to use the handles.

## Keyboard shortcuts

Shortcuts do not intercept typing in fields or normal modified browser shortcuts, except the editor's documented duplicate command.

| Key | Action |
| --- | --- |
| `R` / `C` / `T` / `I` | Add rectangle / circle / text / image |
| `V` / `H` | Select / pan tool |
| Space | Play / pause outside form fields |
| `K` | Capture selected element at the playhead |
| Arrow keys | Move selection by 1 px |
| Shift + Arrow keys | Move selection by 10 px |
| Ctrl/Cmd + D | Duplicate selection |
| Delete / Backspace | Delete selected keyframe inside the timeline; otherwise delete unlocked element |
| `F` | Fit canvas and reset pan |
| `G` | Toggle grid |
| `+` / `=` / `-` | Zoom in / out |
| `?` | Open shortcuts |
| Escape | Cancel active gesture, deselect, or close a dialog/menu |

Middle-drag also pans. Escape and pointer cancellation restore the starting geometry of a drag, resize, or rotate gesture. Enter commits a project/layer rename; Escape cancels an uncommitted rename.

## Architecture

```text
index.html                         Semantic application shell
css/variables.css                  Theme tokens and base styles
css/layout.css                     Responsive panel layout
css/components.css                 Shared controls and dialog
css/canvas.css                     Artboard, elements, selection handles
css/editor.css                     Editor tools, layers, properties
css/timeline.css                   Timeline, transport, tracks, markers
css/motion-tools.css               Preset library and visual easing controls
js/main.js                         App composition and notifications
js/state/store.js                  Validated immutable project/view/selection state
js/elements/model.js               Element factory and style validation
js/elements/styles.js              Shared CSS composition for elements/previews
js/elements/controller.js          Element actions, image decoding, shortcuts
js/canvas/renderer.js              Keyed element rendering and responsive fit
js/canvas/geometry.js              Rotated/scaled coordinates, resize, bounds
js/canvas/interactions.js          Pointer capture, drag, resize, rotate, pan, nudge
js/panels/properties.js            Canvas settings bindings
js/panels/element-properties.js     Element appearance and alignment bindings
js/panels/layers.js                Keyed layer list and selection actions
js/panels/toolbar.js               Project name, view controls, shortcuts dialog
js/panels/keyframe-properties.js    Keyframe timestamp and easing inspector
js/panels/easing-editor.js          Draggable easing graph and live preview
js/panels/presets.js                Search, filtering, native previews, application
js/animation/reducer.js            Timeline/keyframe actions and auto-key routing
js/animation/interpolation.js      Cached numerical/color property evaluation
js/animation/easing.js             CSS easing parsing and cubic-bezier solver
js/animation/keyframes.js          Frame validation, upsert, duration scaling
js/animation/presets.js            Pure preset-to-keyframe generators
js/animation/easing-geometry.js    Graph coordinate mapping and constraints
js/animation/engine.js             Single playback scheduler and transport
js/animation/timeline.js           Tracks, seeking, marker interaction, timeline UI
```

Project data remains serializable and separate from transient selection, playback, zoom, and pan. Rendering, pointer geometry, animation evaluation, and playback scheduling are separate modules. Export and history will be added in their designated batches.

## Verification

The app has no Node runtime dependency. With Node.js 22.7+, run the optional development tests:

```sh
node --test tests/*.test.mjs
```

47 tests cover all 24 preset generators, delayed starts, multi-element presets, stepped text reveals, effect CSS, compatibility/lock constraints, easing graph coordinates, and sparse property interpolation, endpoints, missing/duplicate timestamps, color transitions, custom easing, single-scheduler pause/resume, reverse/loop/stop/restart, auto-key isolation, frame operations, duration rescaling/collisions, animated duplication, gesture rollback, and state validation, immutable updates, project serialization, zoom/pan bounds, element creation, lock protection, duplication/deletion, layer order, plain-text content, style injection rejection, rotated resizing across all handles and origins, size clamping, rotation snapping, and transformed bounds.

Browser checks verify preset search/application/timing, visual easing inputs and dragging, real 3D/shimmer/glow effects, text-sized typewriter reveals, and exact midpoint animation values, easing effects, independent element tracks, duration rescaling, keyframe-time editing, invalid easing feedback, marker and playhead dragging, keyframe deletion, playback/reverse/speed/stop, timeline zoom, and actual element creation, dragging/resizing/rotation at non-100% zoom, text editing, image import, appearance controls, transformed alignment, layer visibility/locking/renaming/reordering, duplication/deletion, pan/fit, and keyboard shortcuts. Full Chromium compatibility and cross-feature validation remain on the internal roadmap.

See the [original project brief](docs/PROJECT-BRIEF.md) for full intended functionality and [batch checkpoints](PHASES.md) for development progress.
