# smiley-monster-app

Small React (Vite) playground under `sites/` where “clean” smileys and “filthy” monsters spawn, collide, and eat each other; optional Web Audio cues fire on each eat.

## Added

- Vite 5 + React 18 app at `sites/smiley-monster-app`
- **Clean** / **Filthy** controls: spout 😊 smileys or 👹 monsters from the bottom of the playfield
- **Last button wins** predator rule: overlap removes monsters if **Clean** was pressed last, or smileys if **Filthy** was pressed last
- **Stop smileys** / **Stop monsters** to halt each spout independently
- **Eat sounds** via Web Audio API: “good” bright three-note chime when smileys eat monsters; “bad” harsh falling square tone when monsters eat smileys
- Staggered bursts (capped per tick) so many simultaneous eats do not clip
- **Audio output** dropdown and **Refresh list** when the browser exposes `audiooutput` devices; `AudioContext.setSinkId` where supported (e.g. Chrome/Edge)
- `resumeEatAudio()` on **Clean** / **Filthy** so `AudioContext` can unlock after user gesture (autoplay policy)

## Changed

- Pinned **Vite 5** and **React 18** for compatibility with Node 20.18.x (avoids Vite 8 / rolldown engine requirements)

## Notes

### Run locally

```bash
cd smiley-monster-app
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Production build

```bash
npm run build
npm run preview
```

### Audio / interfaces

Browser playback uses the **system default output** unless you select another device in **Audio output** (when listed). To feed a specific interface, set it as the OS default or use a browser that supports `setSinkId`. Device **labels** may stay empty until permission or prior media use; use **Refresh list** after interacting with the page.

### Changelog-style layout

This README follows the same **section vocabulary** as `splashtop/changelogs/README.md` (title + one-line summary, then `## Added`, `## Changed`, `## Fixed`, `## Removed`, `## Security`, `## Notes`). Sections with nothing to report are omitted here; when you ship a notable fix or removal, add `## Fixed` / `## Removed` / `## Security` bullets in that format.

## Summary

**smiley-monster-app**: React/Vite 5 sandbox in `sites/`. **Clean**/**Filthy** spawn fighters; last press wins collisions. Optional Web Audio eat signals. Stack: Vite 5, React 18, Node 20.18.x. README echoes Splashtop `changelogs/README.md` headings (Added/Changed/Notes).
