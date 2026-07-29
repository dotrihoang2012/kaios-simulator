// KaiOS Settings host — serves the REAL settings app (unmodified) plus its
// shared resources, and injects a compatibility shim so the Gaia app boots in
// a normal browser (no Gecko/b2g, no api-daemon). Nothing under the settings
// source tree is edited; the shim is injected into HTML responses on the fly.
//
//   node settings-host/server.js
//   → app:    http://localhost:9080/
//   → shared: http://shared.localhost:8081/  and  http://127.0.0.1:8081/
//
// Run both from the repo root. The app's absolute shared.localhost:8081 URLs
// resolve to the shared server; its relative js/style/locales-obj resolve to
// the app server.

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'kaiosrt/gaia/profile/webapps/installed/settings');
const SHARED_DIR = path.join(ROOT, 'kaiosrt/gaia/profile/webapps/installed/shared');
const SYSTEM_DIR = path.join(ROOT, 'kaiosrt/gaia/profile/webapps/installed/system');
const FONTS_DIR = path.join(ROOT, 'kaiosrt/fonts');
const HOST_DIR = __dirname; // settings-host/ — where the shim files live

const APP_PORT = 9080;
const SHARED_PORT = 8081;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon',
};
const mimeFor = p => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

// Shared files we replace with a localStorage-backed version (the source file
// on disk is never touched — we just answer these URLs from settings-host/overrides/).
const OVERRIDES = {
  '/js/session/settings/settings_observer.js': 'settings_observer.js',
};
function overrideFor(pathname) {
  var name = OVERRIDES[pathname.split('?')[0]];
  return name ? path.join(HOST_DIR, 'overrides', name) : null;
}

// Shim scripts injected (in order) right after <head> so they run before any
// app script. l10n first (defines document.l10n / navigator.mozL10n), then b2g.
// "Open Sans" is the Gaia system font; the platform provides it but a browser
// doesn't, so gaia-theme's `*{font-family:"Open Sans"}` falls back to serif.
// Supply @font-face from the bundled OpenSans files.
// font-display:swap — with the default (block) the first paint after a cold
// start renders text INVISIBLE until the .ttf arrives; a panel opened in that
// window shows e.g. a blank header until it's re-entered.
const FONT_FACE = '<style>' +
  '@font-face{font-family:"Open Sans";font-style:normal;font-weight:300;src:url("/__fonts/OpenSans-Light.ttf");font-display:swap}' +
  '@font-face{font-family:"Open Sans";font-style:normal;font-weight:400;src:url("/__fonts/OpenSans-Regular.ttf");font-display:swap}' +
  '@font-face{font-family:"Open Sans";font-style:normal;font-weight:600;src:url("/__fonts/OpenSans-Semibold.ttf");font-display:swap}' +
  '@font-face{font-family:"Open Sans";font-style:normal;font-weight:700;src:url("/__fonts/OpenSans-Bold.ttf");font-display:swap}' +
  '*::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}*{scrollbar-width:none!important}' +
  '</style>';
// NB: system/style/date_selector.css is deliberately NOT injected — it's the
// old dark Firefox-OS skin (tried it; looks nothing like KaiOS 3 Settings).
// datetime-ui.js styles the spinner to match the rest of the app instead.
const SELECT_UI_CSS = '<link rel="stylesheet" href="http://shared.localhost:8081/style/gaia_icons/gaia-icons-embedded.css">' +
  // Gaia's animated loading bar (progress.pack-activity, used by the
  // Application Data scan) — the app never links this itself.
  '<link rel="stylesheet" href="http://shared.localhost:8081/style/commons/progress_activity.css">' +
  // Options softkey menu (group-menu) — the app never links this itself, so the
  // menu DOM was created but invisible/unstyled
  '<link rel="stylesheet" href="http://shared.localhost:8081/style/commons/option_menu.css">' +
  '<link rel="stylesheet" href="/__system/value_selector.css">';
// The date/time spinners are the system app's own components (the Settings app
// only ever opens them, it doesn't ship them), so pull them in as-is.
const INJECT = FONT_FACE + SELECT_UI_CSS +
  '<script src="/__shim/l10n.js"></script><script src="/__shim/b2g.js"></script>' +
  '<script src="/__system/value_picker_nt.js"></script>' +
  '<script src="/__shim/select-ui.js"></script><script src="/__shim/datetime-ui.js"></script>' +
  '<script src="/__shim/activity-ui.js"></script><script src="/__shim/account-fake-ui.js"></script>';

function injectShim(html) {
  if (/__shim\/b2g\.js/.test(html)) return html;
  if (/<head[^>]*>/i.test(html)) return html.replace(/(<head[^>]*>)/i, '$1' + INJECT);
  return INJECT + html;
}

function serveFile(res, filePath, { html = false } = {}) {
  fs.readFile(filePath, (err, buf) => {
    if (err) { res.writeHead(404); res.end('Not found: ' + filePath); return; }
    if (html) buf = Buffer.from(injectShim(buf.toString('utf8')), 'utf8');
    res.writeHead(200, { 'Content-Type': mimeFor(filePath), 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}

// Resolve a request pathname to a file inside a base dir, guarding traversal.
function resolveIn(baseDir, pathname) {
  let p = decodeURIComponent(pathname.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const full = path.normalize(path.join(baseDir, p));
  if (!full.startsWith(baseDir)) return null;
  return full;
}

// ── App server (settings app itself) ──────────────────────────────
http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname;
  // shim files come from settings-host/
  if (pathname.startsWith('/__shim/')) {
    return serveFile(res, path.join(HOST_DIR, pathname.replace('/__shim/', '')));
  }
  // bundled OpenSans (Gaia system font)
  if (pathname.startsWith('/__fonts/')) {
    return serveFile(res, path.join(FONTS_DIR, path.basename(pathname)));
  }
  // System app's real value-selector assets: the <select> popup stylesheet plus
  // the date/time spinner (stylesheet + components) — see select-ui.js /
  // datetime-ui.js, which reuse them instead of reinventing the look.
  const SYSTEM_ASSETS = {
    '/__system/value_selector.css': 'style/value_selector/value_selector.css',
    '/__system/date_selector.css': 'style/date_selector/date_selector.css',
    '/__system/value_picker_nt.js': 'js/value_selector/value_picker_nt.js',
    '/__system/spin_date_picker.js': 'js/value_selector/spin_date_picker.js',
    // browser scroll-mode edge arrows (account-fake-ui's Google window)
    '/__system/arrow_up.png': 'style/browser_frame/images/arrow_up.png',
    '/__system/arrow_down.png': 'style/browser_frame/images/arrow_down.png',
    '/__system/arrow_left.png': 'style/browser_frame/images/arrow_left.png',
    '/__system/arrow_right.png': 'style/browser_frame/images/arrow_right.png',
  };
  if (SYSTEM_ASSETS[pathname]) {
    return serveFile(res, path.join(SYSTEM_DIR, SYSTEM_ASSETS[pathname]));
  }
  const full = resolveIn(APP_DIR, pathname);
  if (!full) { res.writeHead(403); res.end('Forbidden'); return; }
  serveFile(res, full, { html: full.endsWith('.html') });
}).listen(APP_PORT, () => console.log(`[settings] app    → http://localhost:${APP_PORT}/`))
  // another instance (e.g. the standalone preview) already serving is fine
  .on('error', e => { if (e.code === 'EADDRINUSE') console.warn(`[settings] :${APP_PORT} already served — reusing`); else throw e; });

// ── Shared server (shared.localhost:8081 / 127.0.0.1:8081) ────────
// A WebSocket upgrade here would be the api-daemon; we don't run it (the shim
// fakes services), so just refuse upgrades cleanly.
const sharedSrv = http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname;
  const ov = overrideFor(pathname);
  if (ov) return serveFile(res, ov);
  const full = resolveIn(SHARED_DIR, pathname);
  if (!full) { res.writeHead(403); res.end('Forbidden'); return; }
  serveFile(res, full, { html: full.endsWith('.html') });
});
sharedSrv.on('upgrade', (req, socket) => socket.destroy()); // no daemon WS
sharedSrv.listen(SHARED_PORT, () => console.log(`[settings] shared → http://shared.localhost:${SHARED_PORT}/  (also 127.0.0.1)`));
sharedSrv.on('error', e => { if (e.code === 'EADDRINUSE') console.warn(`[settings] :${SHARED_PORT} already served — reusing`); else throw e; });
