# Whiteboard

A native Mac and iPad/iPhone whiteboard built on the tldraw SDK. The canvas is a web app (`web/`) that runs inside a small SwiftUI app (`apple/`) using Apple's WebKit view, so one codebase covers macOS and iOS and works offline.

## What's in the prototype

- tldraw canvas with all default tools, saved automatically on the device.
- **Video player shape**: drop an MP4, MOV or WebM onto the board. It plays with sound and always-visible controls. Drag it by its top bar.
- **Hold Option to ink** (Mac): hold the Option key and move your finger on the trackpad to write, without pressing the trackpad down. Release Option to finish the stroke. Pressing another key while holding Option cancels the stroke, so Option shortcuts still work.
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
| `web/src/nativeBridge.ts` | Messages from the canvas to the Swift app |
| `apple/project.yml` | XcodeGen project for the Mac and iOS targets |
| `apple/Sources/WhiteboardView.swift` | The WebKit view, dev server fallback and message handler |
| `apple/Sources/BundleSchemeHandler.swift` | Serves the bundled canvas at `whiteboard://app` |

## Next ideas

- Use the trackpad as a mini drawing tablet by reading raw finger positions (`NSTouch`) in Swift.
- Save boards as files (Files app and iCloud) through the native bridge.
- Store large videos as files next to the board instead of in browser storage.
