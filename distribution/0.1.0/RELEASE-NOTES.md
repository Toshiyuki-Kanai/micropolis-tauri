# Micropolis v0.1.0

Initial macOS release powered by Tauri.

- Initial macOS release for Apple Silicon Macs (arm64).
- Tauri-based desktop application using the existing Micropolis gameplay and interface.
- Offline gameplay with the game engine and required runtime assets bundled locally.
- No development server, external browser, or Node.js installation required to play.
- City save and load through native macOS file dialogs.
- Graphics and icon from the original GPL Micropolis release; unverified add-on tile sets are excluded.
- Bundled license notices and complete corresponding source.

Requires macOS 13 or later. Intel Macs are not included in this release.

The maintainer has successfully installed the final signed and notarized DMG and checked gameplay manually. Automated WebKit checks cover map rendering, residential construction, simulation time advancing, save/load round trips, and blocked external network requests. This does not constitute testing on every Mac or a guarantee of long-term stability.

Micropolis is a registered trademark of Micropolis GmbH, used under the Micropolis Public Name License. This is a modified distribution based on MicropolisCore, not an endorsement by Electronic Arts, Maxis, or Micropolis GmbH.

Copyright © 1989–2007 Electronic Arts Inc. and Micropolis contributors. The engine is distributed under GPL-3.0-or-later with the original additional terms. Third-party components retain their respective licenses.

Asset: `Micropolis-0.1.0-arm64.dmg`.

The application and DMG are signed with Developer ID, notarized by Apple, and stapled. The disk image includes an Applications link for drag-and-drop installation.
Complete corresponding source is included in the DMG’s Source folder. The source snapshot includes the build scripts, original GPL graphics, and dependency source archives. A tagged repository link can be added after the maintainer approves the release commit and tag.

---

LOCAL RELEASE DRAFT — Final DMG installation and manual gameplay checks are complete. Publication remains a separate manual step after PR review. No GitHub tag, release, or asset upload has been created.
