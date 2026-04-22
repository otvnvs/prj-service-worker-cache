# SW Cache Demo

A service worker cache demo for a shooter game using HTML and CSS that can be loaded when offline.

## Service Worker

`sw.js` pre-caches every CSS file listed above during the `install` event. After the first load the game runs entirely from cache — disconnect your network and reload to verify.

Cache operations are exposed via `postMessage`:
- `CLEAN_UP` — wipe all caches
- `REFRESH_ALL` — wipe then re-fetch all precache assets
