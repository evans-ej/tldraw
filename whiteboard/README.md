# Whiteboard

A native Mac and iPad/iPhone whiteboard built on the tldraw SDK. The canvas is a web app (`web/`) that runs inside a small SwiftUI app (`apple/`) using Apple's WebKit view, so one codebase covers macOS and iOS and works offline.

## What's in the prototype

- tldraw canvas with all default tools, saved automatically on the device.
- **Video player shape**: drop an MP4, MOV or WebM onto the board. It plays with sound and always-visible controls. Drag it by its top bar.
- **Hold Option to ink** (Mac): hold the Option key and move your finger on the trackpad to write, without pressing the trackpad down. Release Option to finish the stroke. Pressing another key while holding Option cancels the stroke, so Option shortcuts still work.
- **Highlighter** (Shift+D): pick from ten highlighter colors, set opacity and a continuous size. It keeps its own settings, so it never changes the pen's color or size.
- **Laser pointer** (K): a glowing dot follows the pointer; drag to draw a trail that fades. Pick its color, width and how long the trail lingers.
- **Spotlight** (I): dims the board around what you're talking about. Click an item to spotlight it, Shift-click to add more, drag to light an area, click empty board or press Esc to clear. With nothing picked, a round torch follows the pointer. The spotlight stays on when you switch to the pen or laser, so you can write inside it.
- Holding Option works with all three drawing tools: glide to ink, highlight or laser without pressing the trackpad.
- **Apple Pencil** (iPad): real pressure and palm rejection come from tldraw.
- Fonts, icons and translations are bundled, so nothing loads from the internet.

## Requirements

- macOS with Xcode 15 or later
- Node.js 20 or later
- [XcodeGen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`

## Run the web app in a browser

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173. This is the fastest way to work on canvas features.

## Run the Mac and iPad apps

```bash
cd web
npm install
npm run build:app        # builds the canvas into apple/Web

cd ../apple
xcodegen                 # generates Whiteboard.xcodeproj
open Whiteboard.xcodeproj
```

In Xcode, pick the `Whiteboard-macOS` scheme and run it on "My Mac", or pick `Whiteboard-iOS` and run it on an iPad or the simulator. To install on a real iPad, choose your team under Signing & Capabilities for the iOS target.

While developing on the Mac, keep `npm run dev` running: Debug builds of the Mac app load the dev server, so web changes appear on reload. If the dev server isn't running, the app uses the bundled build. The iPad app always uses the bundled build, so run `npm run build:app` again after web changes.

Re-run `xcodegen` after adding or removing Swift files. Safari's Develop menu can inspect the web view in Debug builds.

## Licensing

tldraw is free to use in development. `npm run build:app` makes a development build, which is fine for testing on your own devices. Shipping to other people needs a tldraw license key: put it in `web/.env.local` as `VITE_TLDRAW_LICENSE_KEY=...` and build with `npm run build` instead. See https://tldraw.dev/community/license.

## Project layout

| Path | What it is |
| --- | --- |
| `web/src/App.tsx` | The tldraw canvas and its configuration |
| `web/src/HoldToInk.tsx` | Hold Option to write without pressing the trackpad |
| `web/src/PlayerVideoShapeUtil.tsx` | Video player shape |
| `web/src/tools/` | Highlighter, laser pointer and spotlight (see below) |
| `web/src/nativeBridge.ts` | Messages from the canvas to the Swift app |
| `apple/project.yml` | XcodeGen project for the Mac and iOS targets |
| `apple/Sources/WhiteboardView.swift` | The WebKit view, dev server fallback and message handler |
| `apple/Sources/BundleSchemeHandler.swift` | Serves the bundled canvas at `whiteboard://app` |

## How the presenting tools fit in

Each tool uses the tldraw extension point that matches what it is, so none of them patch tldraw itself:

- **Highlighter** is tldraw's own highlight tool and shape. A side effect (`tools/highlighter.ts`) gives each new stroke the color, opacity and size from the highlighter panel. Strokes are normal shapes: they save with the page, undo, and can be selected and restyled later.
- **Laser pointer** (`tools/LaserPointerTool.ts`) replaces tldraw's laser tool under the same id, so the toolbar button and K shortcut still work. Its trail is a temporary scribble that never becomes part of the board, so it doesn't touch undo or saving. The trail color is set on the theme's laser color.
- **Spotlight** (`tools/SpotlightTool.ts`) is a new tool. What's lit is kept in memory, not on the board, so it never changes your content or undo history. The dimmed layer (`tools/CanvasOverlays.tsx`) is drawn in front of the canvas and lets the pointer through.
- `tools/ToolPanels.tsx` swaps tldraw's style panel for the active tool's own panel, and `tools/toolbar.tsx` puts the three tools next to the pen. Settings are remembered on the device (`tools/settings.ts`).

To add another tool, follow the same pattern: a `StateNode` in `tools/`, an entry in `uiOverrides` and the toolbar, and a panel in `ToolPanels.tsx` if it has settings.

On iPhone-sized screens tldraw shows its compact style menu instead of the side panel, so the tools work there with their saved settings but their panels don't appear yet.

## Next ideas

- Use the trackpad as a mini drawing tablet by reading raw finger positions (`NSTouch`) in Swift.
- Save boards as files (Files app and iCloud) through the native bridge.
- Store large videos as files next to the board instead of in browser storage.
