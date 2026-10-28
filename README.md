# 장르게임들

정적 게임 모음 사이트입니다. Cloudflare Pages에서 `public/` 폴더를 배포하면 됩니다.

## Cloudflare Pages

- Framework preset: **None**
- Build command: **비워 두기**
- Build output directory: **`public`**

게임 목록은 `public/api/games.json`에 있으며, `public/_redirects`가 `/api/games` 요청을 해당 JSON 파일로 연결합니다.
