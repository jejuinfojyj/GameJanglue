# Game feedback regression checks

Run from the repository root with Node.js:

```sh
node tests/feedback/run.cjs
```

No packages or server are required. The runner checks actual game updates for collision rules, physics, match resolution, combat/input, energy restoration, and directional stair controls. It also simulates longer sessions and 30/60/120 Hz updates.

Browser checks and screenshots from the local review session are stored separately in `게임 피드백/검증/` and require that session's Playwright/Edge setup.
