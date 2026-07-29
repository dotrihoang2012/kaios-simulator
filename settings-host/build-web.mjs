// Build a fully static bundle of the real Gaia Settings app for GitHub Pages.
//
// The Electron path serves the app through settings-host/server.js (host-resolver
// hack + two ports + on-the-fly shim injection). None of that exists on static
// hosting, so this pre-bakes an equivalent:
//   * copies settings + shared + the handful of system files into web-settings/
//     as sibling dirs, so the app's cross-app URLs resolve as ../<app>;
//   * rewrites every `http://<app>.localhost:8081` to a document-relative
//     `../<app>` in JS/HTML (FileLoader/LazyLoader set these on src/href/XHR,
//     which resolve against the document = settings/index.html), and to a
//     per-file relative path in CSS (url()/@import resolve against the CSS file);
//   * replaces AppOrigin (returns those origins) with a relative version, and
//     settings_observer.js with the localStorage-backed override;
//   * injects the shims (l10n, b2g, select-ui, datetime-ui, activity-ui,
//     ValuePickerNt) + fonts + extra stylesheets straight into index.html.
//
// Output: web-settings/  (commit it; the simulator's browser build iframes
// web-settings/settings/index.html).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const INSTALLED = path.join(ROOT, 'kaiosrt/gaia/profile/webapps/installed');
const OUT = path.join(ROOT, 'web-settings');

const rm = p => fs.rmSync(p, { recursive: true, force: true });
const isText = p => /\.(js|css|html|json|webmanifest|properties|svg)$/i.test(p);

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (e.isFile()) fs.copyFileSync(s, d);
  }
}
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
// path from `fromDir` up to OUT/<app>, as a URL prefix (posix separators)
function relApp(fromDir, appDir) {
  let r = path.relative(fromDir, appDir).split(path.sep).join('/');
  if (!r.startsWith('.')) r = './' + r;
  return r;
}

const ORIGIN_RE = /https?:\/\/([a-z0-9-]+)\.localhost:8081/g;

console.log('· clean', path.relative(ROOT, OUT));
rm(OUT);

// ── copy the trees (system: only what the shims/app pull in) ──────────
console.log('· copy settings + shared + system subset');
copyDir(path.join(INSTALLED, 'settings'), path.join(OUT, 'settings'));
copyDir(path.join(INSTALLED, 'shared'), path.join(OUT, 'shared'));
for (const rel of [
  'js/value_selector/value_picker_nt.js',
  'style/value_selector/value_selector.css',
  'style/date_selector/date_selector.css',
]) {
  const s = path.join(INSTALLED, 'system', rel), d = path.join(OUT, 'system', rel);
  fs.mkdirSync(path.dirname(d), { recursive: true });
  fs.copyFileSync(s, d);
}

// ── patch settings.js — guard SettingsService init() delay ──────────────
// Settings.init() runs async via Alameda boot. If the user presses Enter
// before it completes, setCurrentPanel crashes on:
//   this.SettingsService.navigate(...)  // SettingsService = undefined
// The patch adds a _pendingNav queue so early clicks are deferred and
// automatically replayed when init() finishes.
console.log('· patch settings.js — pending-nav queue for early clicks');
{
  const sf = path.join(OUT, 'settings/js/modules/settings.js');
  let s = fs.readFileSync(sf, 'utf8');

  // Add _pendingNav field after isBackHref
  s = s.replace(
    'isBackHref: false,',
    'isBackHref: false,\n  _pendingNav: null,'
  );

  // Guard the navigate call + queue pending
  s = s.replace(
    'this.currentPanel = hash;\n    this.SettingsService.navigate(panelID, config);',
    'this.currentPanel = hash;\n' +
    '    if (this.SettingsService) {\n' +
    '      this.SettingsService.navigate(panelID, config);\n' +
    '    } else {\n' +
    '      this._pendingNav = { id: panelID, config: config };\n' +
    '    }'
  );

  // Add pending-nav replay after SettingsService is assigned in init()
  s = s.replace(
    'this.SettingsService = options.SettingsService;\n    this.ScreenLayout = options.ScreenLayout;',
    'this.SettingsService = options.SettingsService;\n' +
    '    this.ScreenLayout = options.ScreenLayout;\n\n' +
    '    // Replay pending navigation from before init.\n' +
    '    if (this._pendingNav) {\n' +
    '      var p = this._pendingNav;\n' +
    '      this._pendingNav = null;\n' +
    '      this.currentPanel = null;\n' +
    '      this.SettingsService.navigate(p.id, p.config);\n' +
    '      this.currentPanel = \'#\' + p.id;\n' +
    '    }'
  );

  fs.writeFileSync(sf, s);
}

// ── overwrite the two files the Electron server substitutes ───────────
console.log('· web AppOrigin + settings_observer override');
fs.writeFileSync(
  path.join(OUT, 'shared/js/utils/common/app_origin.js'),
  // getOrigin("shared") → "../shared" (resolved against the settings document).
  `!function(e){const r={"kaios-plus":"kaios-store"};function o(n){return "../"+(r[n]||n);}` +
  `e.AppOrigin={getOrigin:function(n){if(n)return o(n);throw new TypeError('"appName" is required for getOrigin().');},` +
  `getManifestURL:function(n){if(n)return o(n)+"/manifest.webmanifest";throw new TypeError('"appName" is required for getManifestURL().');},` +
  `getManifestName:function(){return"manifest.webmanifest";},getScheme:function(){return location.protocol+"//";},` +
  `getProtocol:function(){return location.protocol.replace(":","");},getRootDomain:function(){return location.host;}}}(window);\n`
);
fs.copyFileSync(
  path.join(HERE, 'overrides/settings_observer.js'),
  path.join(OUT, 'shared/js/session/settings/settings_observer.js')
);

// ── copy shims / fonts / system components into settings/ ─────────────
console.log('· shims + fonts');
const shimDir = path.join(OUT, 'settings/__shim');
fs.mkdirSync(shimDir, { recursive: true });
for (const f of ['l10n.js', 'b2g.js', 'select-ui.js', 'datetime-ui.js', 'activity-ui.js', 'account-fake-ui.js']) {
  fs.copyFileSync(path.join(HERE, f), path.join(shimDir, f));
}
// Bake the en-US locale into the bundle so the l10n shim can read it via
// `window.__KAIOS_L10N_ENUS` instead of XHR — works on file:// (the simulator
// loads the bundle over file:// and the webview can't XHR its own origin) and
// from a github.io subpath where `/locales-obj/…` would miss.
{
  const localePath = path.join(INSTALLED, 'settings/locales-obj/en-US.json');
  const raw = fs.readFileSync(localePath, 'utf8');
  fs.writeFileSync(path.join(shimDir, 'l10n-data.js'),
    '// Auto-generated from settings/locales-obj/en-US.json by build-web.mjs.\n' +
    'window.__KAIOS_L10N_ENUS = ' + raw + ';\n');
}
copyDir(path.join(HERE, 'fake-apps'), path.join(shimDir, 'fake-apps'));
// ValuePickerNt for the date/time spinner + browser scroll-mode edge arrows
// (account-fake-ui's Google window)
const sysShim = path.join(OUT, 'settings/__system');
fs.mkdirSync(sysShim, { recursive: true });
fs.copyFileSync(path.join(INSTALLED, 'system/js/value_selector/value_picker_nt.js'),
  path.join(sysShim, 'value_picker_nt.js'));
for (const a of ['arrow_up', 'arrow_down', 'arrow_left', 'arrow_right']) {
  fs.copyFileSync(path.join(INSTALLED, 'system/style/browser_frame/images', a + '.png'),
    path.join(sysShim, a + '.png'));
}
// fonts (Open Sans) from kaiosrt/fonts
const fontDir = path.join(OUT, 'settings/__fonts');
fs.mkdirSync(fontDir, { recursive: true });
for (const [w, file] of [[300, 'OpenSans-Light'], [400, 'OpenSans-Regular'], [600, 'OpenSans-Semibold'], [700, 'OpenSans-Bold']]) {
  const src = path.join(ROOT, 'kaiosrt/fonts', file + '.ttf');
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(fontDir, file + '.ttf'));
}

// ── neutralize Gaia's own l10n runtime ──────────────────────────────
// The app's `shared/js/utils/l10n/l10n.js` (Gecko's Fluent) is loaded via
// AMD `require('js/utils/l10n/l10n')`. In Chromium it works over an http
// origin but fails over file:// (XHR for each locale). Our shim does the
// same job using inline locale data baked in by build-web.mjs, so replace
// the file with a no-op stub. Same for the date-picker helper that depends
// on the same locale flow.
{
  const gaiaL10n = path.join(OUT, 'shared/js/utils/l10n/l10n.js');
  if (fs.existsSync(gaiaL10n)) {
    fs.writeFileSync(gaiaL10n, '// Replaced by settings-host/l10n.js shim (see build-web.mjs).\n');
    console.log('  stubbed shared/js/utils/l10n/l10n.js');
  }
  const l10nDate = path.join(OUT, 'shared/js/utils/l10n/l10n_date.js');
  if (fs.existsSync(l10nDate)) {
    fs.writeFileSync(l10nDate, 'window.L10nDate || (window.L10nDate = { format: function(){return "";}, parse: function(){return new Date();} });\n');
    console.log('  stubbed shared/js/utils/l10n/l10n_date.js');
  }
}

// ── rewrite .localhost origins across the bundle ──────────────────────
console.log('· rewrite localhost origins');
const sharedRoot = path.join(OUT, 'shared');
let rewritten = 0;
for (const file of walk(OUT)) {
  if (!isText(file)) continue;
  let txt = fs.readFileSync(file, 'utf8');
  if (!ORIGIN_RE.test(txt)) continue;
  ORIGIN_RE.lastIndex = 0;
  if (file.endsWith('.css')) {
    // CSS url()/@import resolve against the CSS file → per-file relative prefix.
    txt = txt.replace(ORIGIN_RE, (_m, appName) => relApp(path.dirname(file), path.join(OUT, appName)));
  } else {
    // JS/HTML: FileLoader/LazyLoader/XHR resolve against the settings document.
    txt = txt.replace(ORIGIN_RE, (_m, appName) => '../' + appName);
  }
  fs.writeFileSync(file, txt);
  rewritten++;
}
console.log('  rewrote', rewritten, 'files');

// ── de-absolutize origin-root paths (the app assumes it's served at "/") ──
// On localhost:9080 the settings app sits at the origin root, so it uses
// absolute paths (alameda baseUrl '/js', <link href="/locales-obj/…">,
// "/shared/…"). On a GitHub Pages project page the app lives under /<repo>/…,
// where those resolve to the wrong place. Rewrite the handful that exist so
// they resolve against the settings document instead. (Manifest "/style/icons"
// paths are left alone — icons aren't loaded during boot.)
console.log('· de-absolutize origin-root paths');
// alameda baseUrl: '/js' → 'js'  (require('utils') then resolves to js/utils.js)
{
  const mainJs = path.join(OUT, 'settings/js/main.js');
  let m = fs.readFileSync(mainJs, 'utf8');
  const before = m;
  m = m.replace(/baseUrl:\s*'\/js'/, "baseUrl: 'js'").replace(/baseUrl:\s*"\/js"/, 'baseUrl: "js"');
  if (m !== before) { fs.writeFileSync(mainJs, m); console.log('  main.js baseUrl → js'); }
}
// index.html + a few panel JS: "/locales-obj/" → "locales-obj/", "/shared/" → "../shared/"
for (const rel of [
  'settings/index.html',
  'settings/js/modules/apn/apn_const.js',
  'settings/js/panels/downloads/download_helper.js',
  'settings/js/panels/downloads/download_item.js',
]) {
  const f = path.join(OUT, rel);
  if (!fs.existsSync(f)) continue;
  let t = fs.readFileSync(f, 'utf8');
  const before = t;
  t = t.replace(/(["'`(])\/locales-obj\//g, '$1locales-obj/')
       .replace(/(["'`(])\/shared\//g, '$1../shared/');
  if (t !== before) { fs.writeFileSync(f, t); console.log('  ' + rel); }
}

// ── inject shims into the entry HTML ──────────────────────────────────
console.log('· inject entry index.html');
const idxPath = path.join(OUT, 'settings/index.html');
let idx = fs.readFileSync(idxPath, 'utf8'); // origins already rewritten above
// The <link rel="localization"> tag would let the browser fetch the locale
// itself; in Chromium it interferes with our shim's hand-rolled translation.
// Remove it (the shim already has the data inline).
idx = idx.replace(/\s*<link\s+[^>]*rel=["']localization["'][^>]*>\s*/gi, '');
// Inline the shim scripts directly. Loading them via <script src=…> in
// Chromium over file:// fails (404 net::ERR_FILE_NOT_FOUND even with paths
// that look fine) so we read each file and embed its source in the page.
// Order matters: l10n-data first (sets window.__KAIOS_L10N_ENUS), then l10n
// (consumes it), then b2g / value_picker_nt / select / datetime / activity
// / account-fake — same order they were loaded as external scripts.
function inlineScript(p) {
  var src = fs.readFileSync(p, 'utf8');
  // Replace </script> sequences with Unicode safe variant; the < expands
  // hides < from HTML parser, preventing premature script close; only literal
  // `</script>` (generated below) closes each inline script block.
  src = src.replace(/<\/script>/gi, '<\\u003c/script>');
  return '<script>' + src + '</script>';
}
const INJECT =
  '<style>' +
  ['300;OpenSans-Light', '400;OpenSans-Regular', '600;OpenSans-Semibold', '700;OpenSans-Bold'].map(x => {
    const [w, f] = x.split(';');
    return `@font-face{font-family:"Open Sans";font-style:normal;font-weight:${w};src:url("__fonts/${f}.ttf");font-display:swap}`;
  }).join('') +
  '*::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}*{scrollbar-width:none!important}' +
  '</style>' +
  '<link rel="stylesheet" href="../shared/style/gaia_icons/gaia-icons-embedded.css">' +
  '<link rel="stylesheet" href="../shared/style/commons/progress_activity.css">' +
  '<link rel="stylesheet" href="../shared/style/commons/option_menu.css">' +
  '<link rel="stylesheet" href="../system/style/value_selector/value_selector.css">' +
  inlineScript(path.join(shimDir, 'l10n-data.js')) +
  inlineScript(path.join(shimDir, 'l10n.js')) +
  inlineScript(path.join(shimDir, 'b2g.js')) +
  inlineScript(path.join(sysShim, 'value_picker_nt.js')) +
  inlineScript(path.join(shimDir, 'select-ui.js')) +
  inlineScript(path.join(shimDir, 'datetime-ui.js')) +
  inlineScript(path.join(shimDir, 'activity-ui.js')) +
  inlineScript(path.join(shimDir, 'account-fake-ui.js')) +
   // Key-forwarding bridge — __stInjectKey (see parent stKey).
   // Pre-load modules/settings.js as a global script. In the original Gaia
   // build this file is wrapped in define() by the build system, but here
   // it arrives as a plain script (const Settings = {…}).  main.js line 243
   // define("modules/settings", function(){}) would otherwise prevent Alameda
   // from ever fetching the file → Settings stays undefined → click handlers
   // that call Settings.setCurrentPanel throw silently.
   '<script src="js/modules/settings.js"></script>' +
   '<script>' +
     'window.__stInjectKey=function(k){' +
       'var t=document.querySelector(".focus")||document.activeElement||document.body;' +
       'if(k==="Enter"){' +
         'var a=t.querySelector("a[href],a.menu-item");' +
         'if(!a&&t.tagName==="A")a=t;' +
         'if(a){' +
           'a.click();' +
         '}' +
         'try{t.click();}catch(e){}' +
       '}' +
       'var ev=new KeyboardEvent("keydown",{key:k,code:k,bubbles:true,cancelable:true});' +
       't.dispatchEvent(ev);' +
       't.dispatchEvent(new KeyboardEvent("keyup",{key:k,code:k,bubbles:true,cancelable:true}));' +
     '};' +
   '</script>';
idx = idx.replace(/(<head[^>]*>)/i, '$1' + INJECT);
fs.writeFileSync(idxPath, idx);

const files = walk(OUT).length;
console.log(`✓ built ${path.relative(ROOT, OUT)} (${files} files)`);
