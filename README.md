# MotionLab

A browser-based visual CSS animation studio built with HTML, CSS, and vanilla JavaScript ES modules. No build step, frontend framework, or production dependencies.

The canvas editor is implemented. Keyframes, playback, persistence, and export are the next internal development batches. The product interface contains only working tools and product guidance; build checkpoints live in [PHASES.md](PHASES.md).

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

## Keyboard shortcuts

Shortcuts do not intercept typing in fields or normal modified browser shortcuts, except the editor's documented duplicate command.

| Key | Action |
| --- | --- |
| `R` / `C` / `T` / `I` | Add rectangle / circle / text / image |
| `V` / `H` | Select / pan tool |
| Arrow keys | Move selection by 1 px |
| Shift + Arrow keys | Move selection by 10 px |
| Ctrl/Cmd + D | Duplicate selection |
| Delete / Backspace | Delete unlocked selection |
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
js/main.js                         App composition and notifications
js/state/store.js                  Validated immutable project/view/selection state
js/elements/model.js               Element factory and style validation
js/elements/controller.js          Element actions, image decoding, shortcuts
js/canvas/renderer.js              Keyed element rendering and responsive fit
js/canvas/geometry.js              Rotated/scaled coordinates, resize, bounds
js/canvas/interactions.js          Pointer capture, drag, resize, rotate, pan, nudge
js/panels/properties.js            Canvas settings bindings
js/panels/element-properties.js     Element appearance and alignment bindings
js/panels/layers.js                Keyed layer list and selection actions
js/panels/toolbar.js               Project name, view controls, shortcuts dialog
```

Project data remains serializable and separate from transient selection, zoom, and pan. Rendering and pointer geometry are separate modules. Future animation/export/history modules will be added in their designated batches.

## Verification

The app has no Node runtime dependency. With Node.js 22.7+, run the optional development tests:

```sh
node --test tests/*.test.mjs
```

Tests cover state validation, immutable updates, project serialization, zoom/pan bounds, element creation, lock protection, duplication/deletion, layer order, plain-text content, style injection rejection, rotated resizing across all handles and origins, size clamping, rotation snapping, and transformed bounds.

Browser checks cover actual element creation, dragging/resizing/rotation at non-100% zoom, text editing, image import, appearance controls, transformed alignment, layer visibility/locking/renaming/reordering, duplication/deletion, pan/fit, and keyboard shortcuts. Full Chromium compatibility and cross-feature validation remain on the internal roadmap.

See the [original project brief](docs/PROJECT-BRIEF.md) for full intended functionality and [batch checkpoints](PHASES.md) for development progress.
