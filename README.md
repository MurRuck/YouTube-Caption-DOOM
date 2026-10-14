# YouTube Caption DOOM

**Play DOOM with draggable YouTube captions—and render gameplay as ASCII inside YouTube's native caption elements.**

YouTube Caption DOOM is an experimental Chrome extension that uses YouTube closed captions as both a **game controller** and a **text-based display**.

It runs a WebAssembly port of DOOM with Freedoom game data in the browser. Dragging the YouTube caption box is mapped to movement and turning. In v0.4, the extension can also convert game frames into ASCII characters and inject them into YouTube's existing caption DOM (`.ytp-caption-segment`).

> **Status: Proof of Concept (v0.4.0).** Caption-drag input has been confirmed working in a user test. ASCII injection, restoration, and reconnection passed mock-DOM tests, but end-to-end gameplay with live DOOM-to-YouTube ASCII rendering has **not yet been verified** in a real Chrome/YouTube session.

## Features

- **Drag-to-control:** Move the YouTube caption box to walk forward/backward and turn left/right.
- **Mouse controls:** Left-click an empty area of the video to fire; right-click to use/interact.
- **WebAssembly runtime:** Run a browser-based DOOM engine with Freedoom assets.
- **Native caption ASCII:** Convert a DOOM Canvas frame into text and write it into real YouTube caption elements.
- **ASCII test mode:** Test caption injection without starting the game engine.
- **Adjustable text resolution:** 32×14, 48×20, or 56×24 characters.
- **Caption restoration:** Attempt to restore original captions when ASCII rendering is disabled.

## How It Works

1. Open a YouTube video with visible closed captions.
2. The extension tracks the position of the caption box and translates it into game input.
3. A WebAssembly DOOM port runs inside the extension's embedded game page.
4. The game frame is downscaled and converted into ASCII based on pixel brightness.
5. The ASCII output is injected into YouTube's existing `.ytp-caption-segment` element.

**Important:** DOOM does **not** run on YouTube's servers, and this does **not** modify the video's actual caption track. Rendering and controls work locally, only in a browser with the extension installed.

## Requirements

- Desktop **Google Chrome** with Developer Mode enabled for extensions
- **Python 3** or **Windows PowerShell** to download engine assets
- Internet access for the initial engine and Freedoom download
- A YouTube watch page (`youtube.com/watch?...`) with captions enabled and currently visible

## Installation

1. Download or clone this repository.
2. Download the WebAssembly engine and Freedoom assets:
   - **Windows:** Run `setup.cmd` in the project directory.
   - **Cross-platform:** Run `python setup.py` (or `python3 setup.py`).
3. Wait for the installer to populate `engine/` with the WASM runtime, `freedoom1.wad`, and accompanying files.
4. Open `chrome://extensions` in Chrome.
5. Enable **Developer mode**.
6. Click **Load unpacked** and select the project folder containing `manifest.json`.
7. Open a regular YouTube video page and turn on **CC**.

**Upgrading from v0.3:** You can copy your existing `engine/` directory into the v0.4 project folder. Disable the older extension and reload YouTube to avoid conflicts.

## Getting Started

1. Click **Test ASCII**. A moving ASCII test pattern should appear in the actual YouTube caption area.
2. Click **Stop test** to restore the original caption display.
3. Click **START DOOM** in the game panel.
4. Enable **ASCII CC: ON** to render live game frames as caption text.
5. Click **Start tracking**, then drag the YouTube caption box to control movement.
6. Optionally click **Hide preview** to hide the regular game preview. If ASCII capture stops working, use **Show preview** again.

The ASCII test is a useful way to isolate caption-DOM issues from game-engine or Canvas-capture issues.

## Controls

| Input | Action |
| --- | --- |
| Move caption box upward | Move forward |
| Move caption box downward | Move backward |
| Move caption box left | Turn left |
| Move caption box right | Turn right |
| Place caption box near the center | Stop |
| Left-click / hold on an empty video area | Fire / continuous fire |
| Right-click on an empty video area | Use / interact |
| `Z` / `X` | Alternative fire / use keys |
| **ENTER** / **ESC** buttons | Game menu controls |

While dragging captions with the left mouse button, use `Z` to fire: one mouse button cannot simultaneously drag the caption box and click to shoot. **There is no sprint feature.**

## Project Structure

| File or directory | Purpose |
| --- | --- |
| `manifest.json` | Chrome Manifest V3 extension configuration |
| `content.js` | YouTube UI, caption-position tracking, mouse/keyboard input |
| `ascii-caption.js` | ASCII injection into native YouTube caption DOM, restoration and reconnection |
| `game.html`, `game.js` | WASM game loader, input handling, Canvas-to-ASCII conversion |
| `setup.cmd`, `setup.ps1`, `setup.py` | Engine and Freedoom asset download scripts |
| `engine/` | Downloaded engine and game data (not bundled in the release ZIP) |
| `tests/` | Mock-DOM caption tests |

## Testing Status

| Component | Status |
| --- | --- |
| Caption-drag movement controls | **Confirmed in a user environment** |
| ASCII DOM injection, updates, and restoration | **Passed mock-DOM tests** |
| Reconnecting after caption segment changes | **Passed mock-DOM tests** |
| Live DOOM framebuffer displayed as YouTube CC ASCII | **Not yet verified in a real browser** |
| Combined dragging, shooting, and live ASCII output | **Not yet verified end-to-end** |

If Node.js is installed, run the DOM smoke test:

```bash
node tests/smoke-dom.js
```

## Known Limitations

- The extension needs **visible YouTube CC elements** to display ASCII in the native caption area.
- YouTube's internal DOM is **not a stable public API**; site updates may break the integration.
- YouTube may recreate caption nodes during playback, causing flicker or temporary display loss.
- Canvas capture may fail, resulting in blank or black ASCII output.
- The current **8 FPS** target is an initial implementation setting, **not a verified performance guarantee**.
- Low ASCII resolution may make fast-paced gameplay difficult to read.
- A Chrome extension is required. An uploaded `.srt` or `.vtt` file alone cannot run DOOM or process live player input.

## Troubleshooting

| Issue | What to check |
| --- | --- |
| **Test ASCII** does nothing | Verify CC is on, a caption is currently visible, and the YouTube page has been reloaded. |
| **START DOOM** is unavailable | Run the setup script and verify the downloaded files exist in `engine/`. |
| Test ASCII works, but game ASCII is blank | Check the normal game preview and whether Canvas capture is returning frames. |
| Dragging does not control the game | Confirm that YouTube's caption box itself can be dragged and tracking is enabled. |
| Captions look wrong after disabling ASCII | Reload the YouTube page and try again. |

## Roadmap

- [x] Map draggable YouTube captions to movement controls.
- [x] Add mouse-based fire and interact input handling.
- [x] Integrate a WebAssembly game loader.
- [x] Implement native-caption ASCII injection prototype.
- [ ] Verify complete live ASCII gameplay in Chrome and YouTube.
- [ ] Improve ASCII performance and readability.
- [ ] Improve resilience to YouTube caption-DOM updates.
- [ ] Explore encoding WAD map data into video frames and recovering it during playback.

## Credits and Licensing

This is an **unofficial fan and technical experiment**. It is not affiliated with or endorsed by YouTube, Google, or id Software.

- [Chocolate Doom](https://www.chocolate-doom.org/) — open-source DOOM engine port (GPL-2.0 family).
- [danborden1/doom-web](https://github.com/danborden1/doom-web) — distribution source used by the asset downloader for the WebAssembly engine and Freedoom data.
- [Freedoom](https://freedoom.github.io/) — freely redistributable game assets (BSD-3-Clause).
- [Original DOOM source](https://github.com/id-Software/DOOM) — source release for the original engine.

This repository does **not** bundle proprietary commercial DOOM WAD files. Preserve applicable copyright notices and comply with the licenses of downloaded third-party components. **A license for this project's own code has not yet been finalized**; add and review a `LICENSE` file before publishing a release.

---

*Making YouTube captions do something they were never designed to do.*
