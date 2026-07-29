// WebActivity shim — the app fires activities (ActivityHelper.start →
// new WebActivity(name, data).start()) expecting the SYSTEM app to service
// them. There is no system app here and Chromium has no WebActivity, so the
// Display panel's Wallpaper row just threw and did nothing.
//
// The real flow for `pick` of a wallpaper is two-stage and both stages are
// reproduced here:
//   1. the system's activity chooser — the standard value-selector sheet
//      (same markup/classes as the <select> popup, so value_selector.css
//      styles it) listing the apps that can serve the pick: Wallpaper, Camera.
//      Camera has no hardware here, so pressing it does nothing — same dead
//      end as on the real device without a camera.
//   2. the Wallpaper app's own picker — a full-screen 3-column thumbnail grid
//      over the bundled wallpapers (shared/resources/media/wallpapers).
// Selecting resolves with { filename } on the shared origin; the panel's own
// code saves wallpaper.image and shows its "Changes saved" toast.
(function () {
  'use strict';

  var SHARED = '../shared';
  var WP_DIR = SHARED + '/resources/media/wallpapers/';

  function el(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }

  var resolveFn = null, rejectFn = null, restoreRow = null;
  function finish(result) {
    var res = resolveFn, rej = rejectFn;
    resolveFn = rejectFn = null;
    if (restoreRow) { restoreRow.classList.add('focus'); restoreRow.focus(); restoreRow = null; }
    if (result) { if (res) res(result); }
    else if (rej) rej(new Error('ActivityCanceled'));
  }

  // ── stage 1: app chooser (value-selector sheet) ──────────────────────
  var chooser = null, chooserList = null, chooserIdx = 0;
  function buildChooser() {
    if (chooser) return;
    var style = document.createElement('style');
    style.textContent =
      // Sits above the settings softkey bar so our own black Cancel/SELECT bar
      // (like the real activity chooser's) replaces it.
      '.wp-chooser{z-index:100000!important}' +
      '.wp-chooser .value-selector-header{font-weight:400!important}' +
      '.wp-chooser .vs-keys{position:absolute;left:0;right:0;bottom:0;display:grid;' +
      'grid-template-columns:1fr auto 1fr;align-items:center;height:var(--softkeybar-height,3rem);' +
      'margin:0;padding:0 .8rem;background:#000;color:#fff}' +
      '.wp-chooser .vs-keys .lsk{text-align:left;font-size:1.4rem;font-weight:600;cursor:pointer}' +
      '.wp-chooser .vs-keys .csk{text-align:center;font-size:1.6rem;font-weight:700;text-transform:uppercase;cursor:pointer}' +
      // Leave room for the bar under the sheet.
      '.wp-chooser .value-selector-select-option-popup{bottom:var(--softkeybar-height,3rem)!important}';
    document.head.appendChild(style);

    chooser = document.createElement('div');
    chooser.className = 'value-selector wp-chooser'; // scrim + sheet styling from select-ui/value_selector.css
    chooser.hidden = true;
    chooser.innerHTML =
      '<div role="dialog" data-type="value-selector" class="value-selector-select-option-popup">' +
      // value_selector.css styles the header by ID; select-ui's own popup is
      // hidden whenever this sheet is up, so the duplicated id never collides
      // visually.
      '  <div class="h1 value-selector-header" id="value-selector-header">Select from</div>' +
      '  <section class="value-selector-container">' +
      '    <ol class="value-selector-options-container" role="listbox"></ol>' +
      '  </section>' +
      '</div>' +
      '<menu class="vs-keys"><span class="lsk">Cancel</span><span class="csk">Select</span><span></span></menu>';
    chooserList = chooser.querySelector('ol');
    chooser.querySelector('.lsk').addEventListener('mousedown', function (e) {
      e.preventDefault(); closeChooser(); finish(null);
    });
    chooser.querySelector('.csk').addEventListener('mousedown', function (e) {
      e.preventDefault();
      if (chooserIdx === 2) { closeChooser(); openGrid(); }
    });
    document.body.appendChild(chooser);
  }
  function chooserFocus(i) {
    var lis = chooserList.children;
    chooserIdx = (i + lis.length) % lis.length;
    for (var k = 0; k < lis.length; k++) lis[k].classList.toggle('focus', k === chooserIdx);
  }
  function closeChooser() {
    window.removeEventListener('keydown', onChooserKey, true);
    chooser.classList.remove('showing');
    chooser.hidden = true;
  }
  function onChooserKey(e) {
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); chooserFocus(chooserIdx - 1); break;
      case 'ArrowDown': e.preventDefault(); chooserFocus(chooserIdx + 1); break;
      case 'Enter': case 'Accept':
        e.preventDefault();
        // Gallery/Camera: present, but with no such apps here pressing them
        // goes nowhere — the same dead end as on a device without them.
        if (chooserIdx === 2) { closeChooser(); openGrid(); }
        break;
      case 'Backspace': case 'SoftLeft': case 'Escape':
        e.preventDefault(); closeChooser(); finish(null); break;
      default: return;
    }
    e.stopPropagation();
  }
  function openChooser() {
    buildChooser();
    chooserList.innerHTML = '';
    ['Gallery', 'Camera', 'Wallpaper'].forEach(function (name, i) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      var label = el('label', null, li);
      var span = el('span', null, label);
      span.textContent = name;
      li.addEventListener('mousedown', function (e) {
        e.preventDefault();
        chooserFocus(i);
        if (i === 2) { closeChooser(); openGrid(); }
      });
      chooserList.appendChild(li);
    });
    chooserFocus(2); // Wallpaper — the only serviceable provider
    chooser.hidden = false;
    requestAnimationFrame(function () { chooser.classList.add('showing'); });
    window.addEventListener('keydown', onChooserKey, true);
  }

  // ── stage 2: wallpaper grid (the Wallpaper app's picker) ─────────────
  var grid = null, gridWrap = null;
  var cells = [], gridIdx = 0;
  var COLS = 3;
  function buildGrid() {
    if (grid) return;
    var style = document.createElement('style');
    style.textContent =
      // Chrome copied from the real picker: theme-coloured "Select a Wallpaper"
      // header with white text; square tiles butted together over hairline
      // seams; a green focus ring; Cancel | Save softkeys.
      '.wp-grid{position:fixed;inset:0;z-index:100000;background:#000;display:flex;flex-direction:column}' +
      '.wp-grid[hidden]{display:none}' +
      // Dark-red header like the real Wallpaper app (Ubuntu-aubergine-ish).
      // font-weight needs !important: the global shim rule bolds every h1.
      '.wp-grid h1{margin:0;padding:.4rem 1rem;text-align:center;background:#772953;color:#fff;' +
      'font-size:1.7rem;font-weight:400!important;flex:0 0 auto}' +
      '.wp-grid .wp-cells{flex:1;overflow-y:auto;scrollbar-width:none;display:grid;' +
      'grid-template-columns:repeat(3,1fr);gap:.1rem;align-content:start;background:#000}' +
      '.wp-grid .wp-cells::-webkit-scrollbar{display:none}' +
      // Inset outline: hugs the tile without shifting or shrinking the image.
      '.wp-grid .wp-cell{aspect-ratio:3/4;background-size:cover;background-position:center}' +
      '.wp-grid .wp-cell.focused{outline:.3rem solid #00d640;outline-offset:-.3rem}' +
      '.wp-grid .wp-keys{flex:0 0 auto;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;' +
      'height:var(--softkeybar-height,3rem);margin:0;padding:0 .8rem;background:#e6e6e6;color:#323232}' +
      '.wp-grid .wp-keys .lsk{text-align:left;font-size:1.4rem;font-weight:600;cursor:pointer}' +
      '.wp-grid .wp-keys .rsk{text-align:right;font-size:1.4rem;font-weight:600;cursor:pointer}';
    document.head.appendChild(style);

    grid = el('div', 'wp-grid');
    grid.hidden = true;
    var h = el('h1', null, grid); h.textContent = 'Select a Wallpaper';
    gridWrap = el('div', 'wp-cells', grid);
    // Softkeys: Cancel (left) | Save (right) — nothing in the centre.
    var keys = el('menu', 'wp-keys', grid);
    var lsk = el('span', 'lsk', keys); lsk.textContent = 'Cancel';
    el('span', null, keys);
    var rsk = el('span', 'rsk', keys); rsk.textContent = 'Save';
    lsk.addEventListener('mousedown', function (e) { e.preventDefault(); closeGrid(); finish(null); });
    rsk.addEventListener('mousedown', function (e) { e.preventDefault(); chooseCell(); });
    document.body.appendChild(grid);
  }
  function focusCell(i) {
    if (!cells.length) return;
    gridIdx = Math.max(0, Math.min(cells.length - 1, i));
    cells.forEach(function (c, k) { c.node.classList.toggle('focused', k === gridIdx); });
    cells[gridIdx].node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function chooseCell() {
    closeGrid();
    finish({ filename: WP_DIR + cells[gridIdx].file });
  }
  function closeGrid() {
    window.removeEventListener('keydown', onGridKey, true);
    grid.hidden = true;
  }
  function onGridKey(e) {
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); focusCell(gridIdx - 1); break;
      case 'ArrowRight': e.preventDefault(); focusCell(gridIdx + 1); break;
      case 'ArrowUp': e.preventDefault(); focusCell(gridIdx - COLS); break;
      case 'ArrowDown': e.preventDefault(); focusCell(gridIdx + COLS); break;
      // Save is the RIGHT softkey on the real picker; keep Enter working too.
      case 'SoftRight': case 'F2': case 'BrowserSearch':
      case 'Enter': case 'Accept': e.preventDefault(); chooseCell(); break;
      case 'Backspace': case 'SoftLeft': case 'Escape':
        e.preventDefault(); closeGrid(); finish(null); break; // cancel the whole pick
      default: return;
    }
    e.stopPropagation();
  }
  function openGrid() {
    buildGrid();
    // XHR, not fetch — fetch() rejects file: URLs (Electron loads the static
    // bundle over file://).
    new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open('GET', WP_DIR + 'list.json');
      x.onload = function () { try { resolve(JSON.parse(x.responseText)); } catch (e) { reject(e); } };
      x.onerror = function () { reject(new Error('XHR failed')); };
      x.send();
    }).then(function (files) {
      gridWrap.textContent = '';
      cells = files.map(function (f, i) {
        var node = el('div', 'wp-cell', gridWrap);
        node.style.backgroundImage = 'url("' + WP_DIR + f + '")';
        node.addEventListener('mousedown', function (e) { e.preventDefault(); focusCell(i); chooseCell(); });
        return { file: f, node: node };
      });
      window.__kaiSettings.get('wallpaper.image').then(function (v) {
        var i = files.findIndex(function (f) { return v && String(v).indexOf(f) !== -1; });
        focusCell(i >= 0 ? i : 0);
      }).catch(function () { focusCell(0); });
      grid.hidden = false;
      window.addEventListener('keydown', onGridKey, true);
    }).catch(function (e) { finish(null); });
  }

  // ── WebActivity ───────────────────────────────────────────────────────
  function WebActivity(name, data) {
    this.name = name;
    this.data = data || {};
  }
  WebActivity.prototype.start = function () {
    var type = this.data.type;
    var wantsWallpaper = this.name === 'pick' &&
      (Array.isArray(type) ? type.indexOf('wallpaper') !== -1 : type === 'wallpaper');
    if (wantsWallpaper) {
      return new Promise(function (resolve, reject) {
        resolveFn = resolve; rejectFn = reject;
        restoreRow = document.querySelector('li.focus');
        openChooser();
      });
    }
    return Promise.reject(new Error('NO_PROVIDER: ' + this.name));
  };
  WebActivity.prototype.cancel = function () {};

  window.WebActivity = window.WebActivity || WebActivity;
})();
