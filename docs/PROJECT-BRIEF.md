# Project: MotionLab | Visual CSS Animation Studio

Build a complete, production-quality web application called **MotionLab**, a browser-based visual CSS animation editor that allows users to create, preview, customize, and export CSS animations without manually writing code.

The application should resemble a professional creative tool such as Figma, Adobe After Effects, or Rive, but focused specifically on CSS animations.

## 1. Technical requirements

**Mandatory tech stack:**
- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- Browser-native APIs where appropriate

**Restrictions:**
- Do not use React, Vue, Angular, Svelte, or other frontend frameworks.
- Do not use Node.js or a backend for application functionality.
- Do not use Tailwind, Bootstrap, or component libraries.
- Avoid unnecessary dependencies.
- Use modular JavaScript with ES modules.
- The application should run as a static website.
- Persist projects using IndexedDB or localStorage.
- Use the Web Animations API for interactive previews where appropriate.
- Use native CSS animations for exported results.

Prioritize clean architecture, maintainability, performance, and polished UI/UX.

## 2. Design and interface

Create a premium dark-themed interface with a visual style inspired by professional creative software.

**Design direction:**
- Dark charcoal backgrounds with subtle contrast between panels.
- Purple or indigo accent colors.
- Clean typography and consistent spacing.
- Minimal, modern icons.
- Subtle hover effects and micro-interactions.
- Smooth transitions.
- Resizable panels where practical.
- Professional, responsive layouts.
- No generic SaaS landing-page design.

### Main layout

**Top toolbar**
- Application logo and project title.
- Editable project name.
- Undo and redo.
- Save project.
- Import project.
- Export animation.
- Preview button.
- Keyboard shortcut hints.

**Left sidebar**
- Elements panel.
- Layers panel.
- Animation presets panel.
- Add rectangle, circle, text, and image.
- Reorder, rename, duplicate, hide, lock, and delete layers.
- Select elements from the layer tree.
- Search available presets.

**Central canvas**
- Large interactive design canvas.
- Drag elements to reposition them.
- Select elements by clicking.
- Resize and rotate using visible handles.
- Display bounding boxes for selected elements.
- Grid background.
- Optional snap-to-grid.
- Zoom in and out.
- Fit-to-screen.
- Pan the canvas.
- Toggle grid visibility.
- Show alignment guides where feasible.

**Right properties panel**
Show editable properties for the selected element.

Include:
- X and Y position.
- Width and height.
- Rotation.
- Scale.
- Opacity.
- Background color.
- Text color.
- Border width, style, color, and radius.
- Box shadow.
- Font family, size, and weight for text.
- Transform origin.
- Animation duration.
- Animation delay.
- Iteration count.
- Animation direction.
- Fill mode.
- Easing function.

Use intuitive sliders, numerical fields, color pickers, dropdowns, and switches.

All changes must immediately update the canvas.

**Bottom animation timeline**
Build a functional animation timeline inspired by professional motion design software.

Include:
- Horizontal timeline with time markers.
- Play, pause, stop, and restart.
- Current playback position.
- Draggable playhead.
- Animation duration controls.
- Keyframe markers.
- Separate animation tracks for each element.
- Editable keyframes for position, rotation, scale, and opacity.
- Add, delete, and move keyframes.
- Select a keyframe to edit its values.
- Timeline zoom.
- Loop playback option.
- Precise seeking and scrubbing.

Ensure timeline interactions affect the actual animation, not just its visual representation.

## 3. Core animation engine

Implement a proper keyframe-based animation system.

Every animatable element should support multiple keyframes with independent property values.

Example internal project structure:

```javascript
const project = {
  id: "project-001",
  name: "Untitled Animation",
  canvas: {
    width: 1280,
    height: 720,
    background: "#ffffff"
  },
  duration: 3000,
  elements: [
    {
      id: "element-001",
      type: "rectangle",
      name: "Rectangle 1",
      styles: {
        x: 100,
        y: 150,
        width: 120,
        height: 120,
        backgroundColor: "#8b5cf6",
        opacity: 1,
        rotation: 0,
        scaleX: 1,
        scaleY: 1
      },
      keyframes: [
        {
          time: 0,
          properties: {
            x: 100,
            rotation: 0,
            opacity: 1
          },
          easing: "ease-in-out"
        },
        {
          time: 1500,
          properties: {
            x: 500,
            rotation: 180,
            opacity: 0.5
          },
          easing: "ease-in-out"
        },
        {
          time: 3000,
          properties: {
            x: 100,
            rotation: 360,
            opacity: 1
          },
          easing: "ease-in-out"
        }
      ]
    }
  ]
};
```

You may refine this schema if a better architecture is needed.

### Engine requirements

- Support multiple elements with independent animation tracks.
- Interpolate numerical properties between keyframes.
- Support color transitions.
- Support transform animations.
- Implement standard CSS easing functions.
- Support custom cubic-bezier easing.
- Allow animations to be paused, resumed, reversed, and replayed.
- Keep timeline playback synchronized with the canvas.
- Ensure seeking to arbitrary timestamps displays the correct state.
- Avoid duplicate or conflicting animation loops.
- Maintain a clear separation between element properties, timeline state, animation evaluation, and rendering.

Use the Web Animations API where it improves playback reliability, but ensure the editor can accurately evaluate animation state at any timestamp.

## 4. Animation preset library

Include a library of ready-to-use CSS animation presets.

Categories:

**Entrance**
- Fade in.
- Slide in.
- Scale in.
- Rotate in.
- Bounce in.

**Exit**
- Fade out.
- Slide out.
- Zoom out.
- Rotate out.

**Attention**
- Shake.
- Pulse.
- Wobble.
- Swing.
- Rubber band.
- Heartbeat.

**Loading**
- Spinner.
- Bouncing dots.
- Skeleton shimmer.
- Pulsating circle.

**Creative**
- Floating.
- Neon glow.
- Flip.
- Elastic movement.
- Typewriter effect.

Each preset should:
- Have an animated thumbnail or preview.
- Be applicable to selected elements.
- Generate editable keyframes where the animation engine supports them.
- Permit customization of duration, delay, and easing.
- Export working CSS.

Do not implement presets as visual-only demos disconnected from the timeline.

## 5. Visual easing editor

Create an interactive cubic-bezier editor.

Features:
- Graph displaying the easing curve.
- Two draggable control points.
- Presets such as linear, ease, ease-in, ease-out, and ease-in-out.
- Custom `cubic-bezier(x1, y1, x2, y2)` support.
- Live animation preview.
- Generated CSS easing value.

The graph should update immediately as users modify control points.

## 6. CSS code generator

Build an export system that converts animation projects into actual reusable CSS.

Generate:
- `@keyframes` declarations.
- Corresponding animation properties.
- Element styles.
- Transform properties.
- Timing functions.
- Iteration settings.
- Animation delays.

Example:

```css
@keyframes motionlab-rectangle {
  0% {
    transform: translate(0px, 0px) rotate(0deg);
    opacity: 1;
  }

  50% {
    transform: translate(400px, 0px) rotate(180deg);
    opacity: 0.5;
  }

  100% {
    transform: translate(0px, 0px) rotate(360deg);
    opacity: 1;
  }
}

.animated-rectangle {
  animation: motionlab-rectangle 3s ease-in-out infinite;
}
```

Export options:
1. Copy CSS.
2. Download CSS file.
3. Copy HTML.
4. Download a self-contained HTML demo with its CSS.
5. Export the editable MotionLab project as JSON.

Provide a code-preview modal with syntax highlighting and copy functionality.

Generated code must faithfully reproduce the animation shown in the editor.

Pay special attention to coordinate systems, transform composition, property interpolation, and timing differences between preview and export.

## 7. Project persistence

Implement a complete local project management system.

Features:
- Create new project.
- Save project.
- Rename project.
- Duplicate project.
- Delete project.
- Open existing project.
- Autosave changes.
- Export project JSON.
- Import previously exported JSON.

Use IndexedDB for larger projects or localStorage for lightweight data.

Validate imported JSON and handle corrupted or unsupported projects gracefully.

Store imported image assets in a way that survives page reloads.

## 8. Undo and redo system

Implement a command-based or snapshot-based history system.

Support undo/redo for:
- Element creation and deletion.
- Position changes.
- Resizing.
- Rotation.
- Property modifications.
- Keyframe operations.
- Layer ordering.
- Preset application.

Keyboard shortcuts:
- Ctrl/Cmd + Z: Undo.
- Ctrl/Cmd + Shift + Z: Redo.
- Delete/Backspace: Delete selected element.
- Ctrl/Cmd + D: Duplicate.
- Space: Play/pause when not editing text.
- Ctrl/Cmd + S: Save project.

Avoid creating a separate history entry for every pixel moved during a drag operation. Group continuous interactions into single undoable actions.

## 9. Additional quality-of-life features

Implement the following if feasible after the core functionality is complete:

- Multiple element selection.
- Grouping and ungrouping.
- Layer locking and visibility controls.
- Snap-to-grid.
- Smart alignment guides.
- Canvas background customization.
- Light and dark workspace themes.
- Reduced-motion accessibility support.
- Context menus.
- Editable keyboard shortcuts documentation.
- Helpful empty states.
- Tooltips.
- Built-in sample projects demonstrating different animations.

Include at least three sample projects:
1. Animated loading indicator.
2. Text entrance animation.
3. Multi-element motion sequence.

## 10. Architecture

Organize the application into a maintainable structure similar to:

```text
motionlab/
├── index.html
├── css/
│   ├── variables.css
│   ├── layout.css
│   ├── components.css
│   ├── canvas.css
│   └── timeline.css
├── js/
│   ├── main.js
│   ├── state/
│   │   ├── store.js
│   │   └── history.js
│   ├── canvas/
│   │   ├── renderer.js
│   │   ├── interactions.js
│   │   └── selection.js
│   ├── animation/
│   │   ├── engine.js
│   │   ├── timeline.js
│   │   ├── interpolation.js
│   │   └── presets.js
│   ├── panels/
│   │   ├── properties.js
│   │   ├── layers.js
│   │   └── toolbar.js
│   ├── export/
│   │   ├── css-generator.js
│   │   └── html-generator.js
│   └── storage/
│       └── projects.js
├── assets/
│   └── icons/
└── README.md
```

Modify this architecture when justified, but avoid placing the entire application into one enormous JavaScript file.

Use clear module boundaries and reusable functions.

## 11. Interaction and quality requirements

This is extremely important.

**Do not create a static prototype with buttons that do nothing.**

Every visible interactive control should have real functionality.

Requirements:
- Creating an element adds it to the canvas and layers panel.
- Selecting an element updates the properties panel.
- Changing a property immediately affects the correct element.
- Adding a keyframe updates the timeline and playback.
- Dragging the playhead seeks the actual animation.
- Presets create real, editable animations.
- Undo and redo restore the correct state.
- Saving and reopening preserves the complete project.
- Exported CSS reproduces the intended animation.
- Keyboard shortcuts function correctly.
- UI states remain consistent across the application.

If a feature cannot be completed reliably, simplify it rather than introducing a misleading nonfunctional control.

Use semantic HTML, accessible form labels, visible focus states, and sensible keyboard interactions.

## 12. Development process

Implement the project incrementally in the following order:

**Phase 1: Foundation**
- Project structure.
- Dark-themed application shell.
- Toolbar and panels.
- Canvas.
- Basic state management.

**Phase 2: Canvas editor**
- Add and remove elements.
- Selection.
- Dragging.
- Resizing.
- Rotation.
- Layer management.
- Property controls.

**Phase 3: Animation engine**
- Keyframe data model.
- Property interpolation.
- Playback.
- Pause/resume.
- Scrubbing.
- Timeline rendering and editing.

**Phase 4: Advanced animation features**
- Preset library.
- Easing editor.
- Multi-element animation support.
- Playback refinements.

**Phase 5: Persistence and export**
- Save/load.
- Import/export JSON.
- CSS generation.
- HTML generation.
- Undo/redo.

**Phase 6: Polish and validation**
- Improve responsiveness.
- Refine animations and transitions.
- Fix interaction bugs.
- Add empty states.
- Validate exports.
- Test keyboard shortcuts.
- Add sample projects.
- Complete documentation.

## 13. Testing

Use browser-native tests or lightweight testing tools without introducing unnecessary production dependencies.

Test:
- Keyframe interpolation.
- Timeline boundary conditions.
- Multiple property animations.
- Playback pause/resume.
- Undo/redo.
- Project serialization.
- Import validation.
- CSS generation.
- Export correctness.

Verify that the application works in current Chromium-based browsers and handle browser limitations gracefully.

Pay particular attention to:
- Keyframes at 0% and 100%.
- Missing values in intermediate keyframes.
- Zero-duration or invalid animations.
- Duplicate keyframe timestamps.
- Custom easing curves.
- Conflicting transform values.
- Deleted or hidden elements.
- Imported user content.
- Invalid image files.
- Accidental HTML injection.
- Large projects and rendering performance.

## 14. Final deliverables

Deliver a complete, functional project containing:

- All HTML, CSS, and JavaScript source files.
- Working interactive animation editor.
- Functional timeline and keyframe system.
- CSS and HTML export.
- Local project management.
- Animation presets.
- Three sample projects.
- Professional interface.
- README with installation and usage instructions.

The README should explain how to run the project using a simple static HTTP server, since ES modules may not work correctly when opening `index.html` directly through `file://`.

## Final instructions

Build the actual application, not just a design mockup or development plan.

Start by inspecting the existing repository, if any. Preserve relevant existing work, then implement the application in logically organized modules.

Work through the implementation phases, verifying the functionality of each major component before proceeding.

Do not silently skip core features, leave placeholder buttons, or claim functionality is complete unless it works.

Prioritize, in order:

1. Functional accuracy.
2. A genuinely usable visual animation editor.
3. Faithful CSS export.
4. Excellent visual design.
5. Clean and maintainable code.
6. Smooth performance.
7. Additional creative features.

Make the final result feel like a polished standalone web application that someone could genuinely use to create CSS animations.