# Chùa Yên Phúc / Tungkinh System Configuration

`AGENTS.md` is authoritative. This document explains runtime and deployment wiring.

## Architecture

The deployed page is a standalone React 19/Three.js application mounted from `index.html`.

Load order:

1. `index.html` creates the client ID, restores a validated profile if available and initializes 24 seat records.
2. `js/supabase-sanctuary.js` provides cloud presence/realtime.
3. `js/room-chat.js` provides the realtime/WebRTC bridge.
4. `js/app.bundle.js`, generated from `src/app/(frontend)/entry.tsx`, mounts React.
5. React owns onboarding, game UI, map travel, 3D rendering, local progress, chat presentation and local media UI.

The local Node server exposes static files, REST state/events, SSE and WebSocket transport. Supabase and browser BroadcastChannel/localStorage are fallbacks/bridges, not separate UI implementations.

## Source ownership

- UI: `src/app/(frontend)`
- Production CSS input: `src/styles.css`
- Generated JS: `dist/app.bundle.js`, copied to `js/app.bundle.js`
- Generated CSS: `css/modern-ui.css`
- Realtime bridge: `js/room-chat.js`, `js/realtime-sanctuary.js`, `js/supabase-sanctuary.js`
- Server: `server.js`
- Deployment copy: `copy_to_anx.js`

If behavior appears in a generated bundle but not source, rebuild first; never patch the bundle.

## Profile contract

```ts
type DevoteeProfile = {
  registered: true
  fullName: string
  birthDate: string // YYYY-MM-DD
  hometown: string
  age: number // derived on load and submit
  dharmaName: string
  assignedSeatNo: number | null
  avatarType: 'monk'
  meritScore: number
  wish: string
  zoneId?: TempleZoneId
}
```

Storage key: `chua_an_nhien_user_profile`. The app recalculates age rather than trusting a stored age.

## Orientation lifecycle

1. Onboarding is usable in either orientation.
2. Submitting is a user gesture; the app saves profile, requests fullscreen, and attempts landscape lock.
3. If a coarse-pointer device remains portrait, `OrientationGuard` covers the game.
4. Desktop/fine-pointer devices bypass the guard.

## Zone lifecycle

Zone registry: `src/app/(frontend)/temple-zones.ts`.

Travel actions:

1. save `chua_an_nhien_zone`;
2. clear the occupied local seat;
3. remount `TempleScene` with the zone key;
4. update `window.currentUserProfile.zoneId`;
5. broadcast `CHANGE_ZONE` and refresh presence.

Each zone has its own sign, palette and landmark configuration. Shared rituals remain identical.

## Chat event

```json
{
  "type": "ROOM_CHAT",
  "senderId": "client-id",
  "name": "Đạo hữu",
  "text": "Nam mô A Di Đà Phật",
  "timestamp": 1730600000000
}
```

React dispatches `community_chat_message` locally after send. Three.js matches sender ID/name to a player and displays a text-only bubble for 5 seconds.

## Build and verification

```bash
npm install
npm run build
npm test
node server.js
```

Verify:

- first visit and returning visit;
- age calculation at birthday boundary;
- portrait guard versus desktop bypass;
- fullscreen only after tap;
- all five zones;
- chat send, private/presence tabs and 5-second bubble;
- camera/mic denial and cleanup;
- ritual bow sequencing;
- responsive matrix from `AGENTS.md`.

## Deployment

`npm run sync:anx` builds and copies files locally but must not push.

`npm run deploy` is the explicit push path. It may commit/push the separate website repository only when requested by the operator.

Do not hard-code a new machine path. Set `ANX_TUNGKINH_DEST` when the destination is not one of the known local candidates:

```powershell
$env:ANX_TUNGKINH_DEST = 'E:\path\to\website\public\tung-kinh'
npm run sync:anx
```
