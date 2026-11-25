# Wolf's Party — handoff

_Last updated: 2026-11-25._

## What this is
A modular multiplayer party-game suite. You drop a game folder into `games/` and it shows up in the menu.

- **Stack:** Node (Express + socket.io) serving plain ES-module frontend files. There is no build step.
- **Access:** players join through a Cloudflare tunnel (`npm run tunnel`). There is no room code; everyone who opens the link is in the same party.
- **Language:** UI text is in Portuguese (pt-BR). The user is Brazilian and writes in PT or EN.

**Run:** `npm install` → `npm start` (http://localhost:3000)

**Tools:**
- `/tools/cabinet-studio.html`: the cabinet editor.
- `/tools/sprites.html`: a catalog of every character part.

**Preview page:** an artifact at https://claude.ai/artifact/96xSrueGw2XEhPFDpdsVew (slug `419dff73-daba-43f0-9854-8e408c029af8`). It is a static copy of `public/`, so it has no server: no game list and no multiplayer.

## Current screen (page 1): character creator inside an arcade cabinet
- **Fixed stage:** 1280×1000, scaled to fit the window. The page never scrolls.
  - `js/core/viewport.js` does the scaling and also exposes `--rig-transform`.
- **Look:** neon-purple arcade in a night room (`css/tokens.css` holds all colors).
  - Title: `PARTY PARTY FOREVER`. The user likes it; it is set in `js/ui/marquee.js` (`TITLE`).
  - Day/dusk/night toggle in the room; default is night.
- **Screen tabs:**
  - MONTAR: build a character from parts.
  - DESENHAR: a 16×17 pixel editor for drawing your own character.
- **Footer:** NOME field and the PRONTO button. PRONTO zooms into the screen and opens a placeholder lounge.
- **Controls:**
  - Joystick: draggable, with repeat while held.
  - Compact keyboard: the user said to keep it as it is.
  - A/B buttons.
  - Lever: drag-physics on the right of the deck. A flick goes all the way, a slow pull that doesn't reach the bottom springs back, and reaching the bottom triggers the part-by-part randomizer (`js/ui/lever.js`, `js/ui/randomizer.js`).
- **Characters:** 3/4 view facing right, 3-tone shading, auto outline (`js/character/*`). Profiles are saved to localStorage.
- **Code layout:**
  - `core/`: input (semantic actions), audio (synthesized SFX), storage, viewport.
  - `character/`: model, parts, palettes, renderer.
  - `ui/`: cabinet, joystick, lever, creatorScreen, drawPanel, room, marquee.
  - `cabinet/`: studio integration.
  - `studio/`: the editor.
  - `net/party.js`

## Lounge (page 2, after PRONTO)
Everything for the lounge lives in `lounge/` (modular rule: lounge-only things go there).
- `lounge/client/` is served at `/lounge/`: `index.js` (mountLounge), `room.js` (map: FLOOR, SOLIDS, SEATS, HOTSPOTS, DOOR_ICON, TV_LIGHT — shared with the server), `items.js` (what each unlocked item does — empty on purpose), `sounds.js`, `lounge.css`, `room.png` (the user's room art v2, 1639×959; v1 is in `_old/`).
- `lounge/server.js` (`attachLounge(io, registry)`): positions + sit flag (client-sent, clamped), punches (server picks who got hit, sends knockback), votes per game, points per player. Returns `{ givePoints(socketId, n) }` for games to award points (not wired yet).
- Controls: arrows/WASD walk, SPACE punch, E interacts: controller door = vote panel, orange sofa = sit (any move key stands up), items = locked until the player has `cost` points (HOTSPOTS kind 'item'); then the server confirms with 'lounge:used' and `ITEM_ACTIONS[id]` runs.
- Art effects: the controller icon on the door is a crop of room.png that bobs over a black patch; the TV beam is an SVG polygon (TV_LIGHT) with screen blend + flicker.
- Sounds: footsteps every ~62px, punch, hit, sit/stand, prompt blip, locked, use.
- Round cycle (`lounge/voting.js` server, `lounge/client/round.js` client): idle (banner counts 30 s, then voting starts by itself; E at the door starts it now and the banner/announcement say "<NAME> COMEÇOU A VOTAÇÃO") → voting (20 s, or ends early when everyone voted; panel opens for everyone) → rolling (weighted pick: one chance per vote; nobody voted = every game equal; one game only = no spin) → playing (game opens in a fullscreen iframe for everyone in the lounge; late joiners use the door "ENTRAR NO JOGO"; when everyone pressed VOLTAR AO LOUNGE → idle). Server sends time remaining (`left` ms), not clock times. Self-check: `node lounge/voting.test.js`.
- Games: no back button — the lounge returns only when the game ends. Contract documented in `games/README.md`: page uses `/lounge/game-api.js` (postMessage bridge through `round.js`); optional `"server": "server.js"` in game.json is imported by `voting.js` and gets `api { players, on, send, end(ranking) }`; ranking awards points (10/5/3/1). Games without server.js end via `game.end()` from the page. The roll only includes games whose min/max players fit the lounge count.
- **Minigame visual rule (user request):** every minigame is pixel art and uses only the illu32 palette (32 colours, sampled from the user's reference). Shared, in `games/_shared/` (underscore = not listed as a game): `palette.js` (PALETTE, PAL names, RAMPS 3-tone, PLAYER_RAMPS red/blue/orange/green), `pixel.js` (`createPixels(canvas)`: buffer drawing, no anti-aliasing, `ball`/`bar` with ink outline + 3-tone), `theme.css` (CSS vars, pixel fonts, `.px-box`, `.px-btn`).
- `games/pinball/` (Pinball Duelo, 1–4): square table, each player defends a side with two flippers + two slingshots, 3 lives, eliminated sides become walls, last alive wins (solo = score/time). Table inspired by classic pinball parts (pop bumpers 100, posts 10, slingshots 10, 3 drop targets per side 500 + bank 2000, resets after 6 s); points go to whoever last flipped the ball (shown on tags; ranking is still by survival). Physics on the server (`server.js`, 240 Hz substeps, state at 30/s; ball speed 440–1250 px/s), `table.js` shared geometry, `client.js` draws with `_shared/pixel.js` on a 320×320 canvas, rotated so your side is at the bottom. Keys ←/→, A/D, Z/M; touch left/right half. Headless sim used for testing: run the loop with a fake api.
- Not done yet: touch controls for the lounge itself, item behaviours. Points live in memory per connection (reload resets).
- The old placeholder lounge was moved to `_old/`.

## Cabinet Studio (the user draws the cabinet themselves)
- **Canvas:** 320×250, where 1 pixel = 4×4 on the stage. Three layers:
  - `base`: behind everything.
  - `neon`: gets a blurred glow copy in the game.
  - `front`: drawn above the controls, with no pointer events.
- **Tools:** brush 1–10px, mirror mode, shapes, fill, a reference image for tracing, a trash button that clears all layers, and draggable "peças" (screen, marquee, joystick, keyboard, buttons, lever, sound) with positions in stage px.
- **Saving:**
  - It autosaves to localStorage under the key `wolfsparty:cabinet:v1` (`js/cabinet/design.js`).
  - "SALVAR NO JOGO" also POSTs to `/api/cabinet`, which writes `public/cabinet/cabinet.json`. This only works from the PC itself; requests coming through the tunnel (`cf-connecting-ip` header) are rejected.
- **Game side:** `js/cabinet/apply.js` loads the newest design (localStorage vs. file), hides the SVG shell, adds pixel canvases and moves the pieces. `?gabinete=padrao` ignores the saved design.

## ⚠️ Open task (where we stopped)
The user asked to **"remove the cats you made and integrate the gabinete I made better, it's the way it should be now."**

- **Done:** all of my cats are removed (marquee, deck, wall poster → gold star). This is committed and published.
- **Not done: their cabinet drawing has not been retrieved.**
  - It exists only in the localStorage of whatever browser they drew it in.
  - `public/cabinet/cabinet.json` does not exist in their folder, so they have not saved it to the project yet.
  - The user said "clicked it" after being offered three options; it's unclear which button.
  - Reading the clipboard via computer use failed: no app could be resolved, and the user interrupted.
  - The built-in browser pane is not signed in to claude.ai, so the artifact page isn't readable from there.
- **Next step:** ask the user, simply and once, to do one of these:
  - (a) run `npm start`, open http://localhost:3000/tools/cabinet-studio.html in the **same browser they drew in**, and click **SALVAR NO JOGO**. This creates `public/cabinet/cabinet.json`, which you can read with device_bash.
  - (b) **MAIS → COPIAR DESENHO (JSON)** and paste it into the chat.
  - (c) attach a screenshot.
- **Then "integrate better":**
  - Make their drawing the shipped default by committing `public/cabinet/cabinet.json`.
  - Fit the layout of the screen, marquee, controls and lever to their art, and tune the screen corner radius and glass to their bezel.
  - Hide default decorations that clash (set `autoDeco` false if needed).
  - Check the glow intensity on their neon layer.
  - Verify with screenshots before claiming it's done.

## User preferences learned
- Wants polished pixel art; "the secret is in the little things".
- Compares against reference images closely. Follow references exactly when asked.
- Disliked: synthwave grids, flat colors, a flag-like rainbow palette, clickable levers (they want physical drag).
- Likes: the PARTY PARTY FOREVER title, the compact keyboard, the lever feel.
- Wants to run and click things themselves: keep the preview artifact updated and open it with `Claude_Browser__preview_start`.

## Housekeeping
- `_gemini_backup/`: files from a failed Gemini attempt (canvas `shell.js`, etc.), moved aside. They are not used.
- File deletion in the user's folder is off by default. Use `mv` within the folder, or ask for deletion permission.
- Still to do eventually:
  - README screenshots.
  - The `games/` contract for multiplayer games (only presence and game-list sockets exist today).
