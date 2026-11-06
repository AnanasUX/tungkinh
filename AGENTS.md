# Tungkinh Agent Contract

This file is the authoritative instruction set for Antigravity, Gemini and other coding agents working in this repository. Read it before editing source.

## 1. Canonical source and generated output

| Purpose | Canonical source | Generated/runtime output |
|---|---|---|
| React UI and 3D scene | `src/app/(frontend)/*.tsx`, `*.ts` | `dist/app.bundle.js`, `js/app.bundle.js` |
| Deployed website CSS | `src/styles.css` | `css/modern-ui.css` |
| Realtime/WebRTC bridge | `js/room-chat.js`, `js/realtime-sanctuary.js`, `js/supabase-sanctuary.js` | loaded directly by `index.html` |
| HTML boot/profile bridge | `index.html` | copied to the host by `copy_to_anx.js` |
| Local Node server | `server.js` | runtime only |

Never hand-edit `dist/app.bundle.js`, `js/app.bundle.js` or `css/modern-ui.css`. Run `npm run build`.

`src/app/(frontend)/styles.css`, `page.tsx`, `layout.tsx`, `actions.ts` and Payload-oriented comments are retained for upstream Figma compatibility, but the standalone deployment reads `src/styles.css` and `entry.tsx`.

Legacy `js/app.js`, `css/style.css` and `index_bundle.html` are not loaded by `index.html`. Do not add new behavior there.

## 2. Required product behavior

### First browser visit

- Never generate a fake person profile.
- `OnboardingGate.tsx` must require full name, birth date and hometown.
- Age is derived from birth date, rejects future/invalid dates, and is never directly editable.
- Store the validated profile under `chua_an_nhien_user_profile` in `localStorage`; mirror it to `sessionStorage` only for compatibility.
- Returning users with a valid stored profile skip onboarding.

### Orientation and fullscreen

- Desktop/laptop with a fine pointer and width at least 1024px enters directly.
- Mobile/tablet portrait shows `OrientationGuard` after onboarding.
- Fullscreen and `screen.orientation.lock('landscape')` may only run from a user click/tap.
- Mobile/tablet landscape is the primary layout. Portrait onboarding must remain usable.

### Responsive acceptance matrix

- Mobile portrait: 390×844 and 430×932; onboarding works, then orientation guard blocks the game.
- Mobile landscape: 844×390 and 932×430; no horizontal page scroll, dock and joystick remain reachable.
- Tablet portrait: 768×1024; onboarding works, then orientation guard.
- Tablet landscape: 1024×768 and 1180×820; panels fit without clipping.
- Desktop: 1440×900 and 1920×1080; controls do not overlap the scene.

All modal shells use a flex column, `min-height: 0` for scroll children and `100dvh`/`100svh`; never fix a content area's height without its own overflow.

### Community chat and video

- `CommunityOverlay.tsx` owns the three tabs: common room, private messages and presence.
- Realtime messages use `ROOM_CHAT`; UI must also dispatch `community_chat_message` for the 3D speech bubble.
- `TempleScene.tsx` displays chat over the matching player for exactly 5 seconds.
- Chat text is untrusted. Use `textContent`/React text nodes; never assign user chat to `innerHTML`.
- Camera, microphone and screen tracks must stop on close/unmount.
- Permission denial is a normal UI state, not an uncaught error.

### Zones and map travel

The five zones are defined only in `temple-zones.ts`:

1. Sân Đạo Tràng Trung Tâm
2. Chùa Yên Phúc
3. Chùa Phúc Duyên
4. Chùa Thiên Phú
5. Chùa Tịnh Gia

Add/change a zone in that registry, then consume it from `ZoneNavigator` and `TempleScene`. Never duplicate zone names in random files. Zone travel preserves profile and merit, clears the current seat, remounts the scene and broadcasts `CHANGE_ZONE`.

### Reverence animation

The player's head/body bows automatically when:

- manually crossing the central front threshold of the temple;
- opening scripture while seated and facing the temple;
- finishing incense offering;
- performing the bow ritual;
- before ringing the bell.

Do not trigger repeated bows every animation frame. Gate proximity actions with a one-shot state.

## 3. State and compatibility keys

Do not rename existing browser keys without a migration:

- `chua_an_nhien_user_profile`
- `chua_an_nhien_zone`
- `chua-sen-progress`
- `chua_an_nhien_cid`

`window.currentUserProfile` remains the compatibility bridge for realtime scripts. React owns validation and UI state; bridge scripts may read it but must not invent fallback identity data.

## 4. Commands

```bash
npm install
npm run build
npm test
npm start
```

After source changes:

1. Run `npm run build`.
2. Run `npm test`.
3. Start `node server.js` and verify `/`, `/api/sanctuary/state`, chat connection and static assets.
4. Test the responsive matrix above.
5. Run `npm run sync:anx` for a local copy only.
6. Only run `npm run deploy` when an explicit push to the website repository is intended.

## 5. Safety constraints

- Do not commit secrets or print Supabase/LiveKit credentials.
- Do not insert personal absolute Windows paths into source or Markdown links.
- Do not auto-commit/push from a normal build or local sync.
- Do not edit compiled bundles to fix a source bug.
- Preserve realtime event names unless all publishers/subscribers and this contract are migrated together.
