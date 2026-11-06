# Antigravity entry rules

Read and obey [`AGENTS.md`](../AGENTS.md) before every change. It is the repository's authoritative contract.

Key reminders:

1. Edit React/Three source in `src/app/(frontend)` and deployed CSS in `src/styles.css`.
2. Never edit generated `dist/app.bundle.js`, `js/app.bundle.js`, or `css/modern-ui.css` directly.
3. First visit requires a real profile; never generate sample identity data.
4. Mobile/tablet gameplay requires landscape; desktop is never blocked. Fullscreen requires a user gesture.
5. Preserve browser storage keys and realtime event contracts.
6. Run `npm run build` and `npm test` after changes.
7. Do not auto-push during build or local sync.
