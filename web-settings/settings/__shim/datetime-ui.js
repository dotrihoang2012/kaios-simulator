// Date/Time value selector — the KaiOS spinner picker.
//
// The Settings app never ships this UI: it focuses a hidden <input type="date"/
// "time"> and the *system* app pops its spinner over the web-view. There's no
// system app here, and Chromium's stand-in (a desktop calendar dropdown) looks
// nothing like KaiOS. So build the spinner out of the system app's own
// primitive, system/js/value_selector/value_picker_nt.js — the exact component
// its date and time selectors are made of.
//
// (Neither of the system's dressings is reusable: spin_date_picker.js drives
// focus through the system's NavigationPropHelper, only binds keys inside a
// <web-view>, and its internal index desyncs when driven from outside; and
// style/date_selector/date_selector.css is the old dark Firefox-OS skin, which
// clashes with the light KaiOS 3 Settings — tried and rejected on sight. The
// light skin below matches the app's own dialogs instead.)
//
// On SAVE we write the chosen value into the panel's hidden input and dispatch
// 'change' — exactly what the panel's own handler expects: it calls
// ApiManager.time.set(), and the (virtual) clock moves.
(function () {
  'use strict';

  var overlay = null, popup = null, titleEl = null, container = null;
  var cols = [], focusIdx = 0;
  var activeInput = null, restoreRow = null, mode = null; // 'date' | 'time'

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function el(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }
  function range(from, to, fmt) {
    var out = [];
    for (var i = from; i <= to; i++) out.push(fmt ? fmt(i) : String(i));
    return out;
  }
  function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
  function monthNames() {
    var lang = navigator.language || 'en-US', out = [];
    for (var m = 0; m < 12; m++) out.push(new Date(2000, m, 1).toLocaleDateString(lang, { month: 'short' }));
    return out;
  }

  function build() {
    if (overlay) return;
    var style = document.createElement('style');
    style.textContent =
      // Sits above the settings softkey bar (99999) so Cancel/SAVE replace it.
      '.dt-selector{position:fixed;inset:0;z-index:100000;background-color:rgba(0,0,0,0);' +
      'transition:background-color .17s ease;display:flex;flex-direction:column;justify-content:flex-end}' +
      '.dt-selector[hidden]{display:none}' +
      '.dt-selector.showing{background-color:rgba(0,0,0,.88)}' +
      '.dt-selector .dt-popup{background:#fff}' +
      '.dt-selector h1{margin:0;padding:.5rem 1rem;text-align:center;background:#cccccc;color:#323232;' +
      'font-size:1.7rem;font-weight:600}' +
      '.dt-selector .picker-frame{position:relative;height:14rem;overflow:hidden;background:#fff}' +
      '.dt-selector .picker-container{position:relative;height:100%;display:flex}' +
      '.dt-selector .picker-container>div{position:relative;flex:1;display:flex;flex-direction:column;' +
      'align-items:stretch;justify-content:center}' +
      // Column separators per the spec sheet: thin dark lines, inset from the
      // top and bottom edges (they don't run the full height).
      '.dt-selector .picker-container>div:not(:last-child)::after{content:"";position:absolute;' +
      'right:0;top:1.4rem;bottom:1.4rem;width:.1rem;background:#4d4d4d}' +
      // Per the KaiOS spec sheet: every column's selected value is theme-colored
      // text; the FOCUSED column's is a solid theme-colored block with white
      // text; neighbours above/below are grey. No cross-column band.
      '.dt-selector .picker-container label{display:block;font-size:2.2rem;' +
      'font-weight:600;color:#0073e6;line-height:4.6rem;height:4.6rem;text-align:center}' +
      // 300, not 400: white-on-blue antialiasing visually fattens the glyphs,
      // so regular still reads as bold there.
      '.dt-selector .picker-container>div.focused label{background:#0073e6;color:#fff;font-weight:300}' +
      '.dt-selector .picker-container .focus-indicator{font-size:1.8rem;color:#9e9e9e;line-height:3.4rem;' +
      'height:3.4rem;text-align:center}' +
      // margin:0 kills <menu>'s UA default block margins (dark gaps around the bar).
      '.dt-selector .dt-softkeys{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;' +
      'height:var(--softkeybar-height,3rem);margin:0;padding:0 .8rem;background:#e6e6e6;color:#323232}' +
      '.dt-selector .dt-softkeys .lsk{text-align:left;font-size:1.4rem;font-weight:600;cursor:pointer}' +
      '.dt-selector .dt-softkeys .csk{text-align:center;font-size:1.6rem;font-weight:700;' +
      'text-transform:uppercase;cursor:pointer}';
    document.head.appendChild(style);

    overlay = el('div', 'dt-selector');
    overlay.hidden = true;
    popup = el('div', 'dt-popup', overlay);
    popup.setAttribute('role', 'dialog');
    titleEl = el('h1', null, popup);
    var frame = el('div', 'picker-frame', popup);
    container = el('div', 'picker-container', frame);

    var keys = el('menu', 'dt-softkeys', overlay);
    var lsk = el('span', 'lsk', keys); lsk.textContent = 'Cancel';
    var csk = el('span', 'csk', keys); csk.textContent = 'Save';
    el('span', null, keys);
    lsk.addEventListener('mousedown', function (e) { e.preventDefault(); close(); });
    csk.addEventListener('mousedown', function (e) { e.preventDefault(); save(); });

    document.body.appendChild(overlay);
  }

  // ── columns ──────────────────────────────────────────────────────────
  function addColumn(values, selected, name) {
    var host = el('div', 'value-picker-' + name, container);
    var picker = new window.ValuePickerNt(host, { valueDisplayedText: values, className: 'picker-unit' });
    picker.setSelectedIndex(Math.max(0, Math.min(selected, values.length - 1)));
    var c = { name: name, host: host, picker: picker, values: values };
    cols.push(c);
    return c;
  }
  function col(name) { for (var i = 0; i < cols.length; i++) if (cols[i].name === name) return cols[i]; return null; }
  function focusCol(i) {
    focusIdx = (i + cols.length) % cols.length;
    cols.forEach(function (c, idx) {
      c.host.classList.toggle('focused', idx === focusIdx);
      if (idx === focusIdx) c.picker.focused(); else c.picker.unfocused();
    });
  }
  // ValuePickerNt's own keydownHandler wraps against `_upper`, which it seeds to
  // values.length — one past the end — so rolling off the bottom renders an
  // undefined label. Roll with real bounds instead.
  function roll(c, dir) {
    var i = c.picker.getSelectedIndex() + dir;
    if (c.name === 'ampm') {
      i = Math.max(0, Math.min(c.values.length - 1, i)); // AM/PM doesn't cycle
    } else if (i >= c.values.length) i = 0;
    else if (i < 0) i = c.values.length - 1;
    c.picker.setSelectedIndex(i);
    if (mode === 'date' && (c.name === 'month' || c.name === 'year')) clampDay();
  }
  // Feb 30 doesn't exist: keep the day column within the selected month.
  function clampDay() {
    var day = col('date'), month = col('month'), year = col('year');
    if (!day || !month || !year) return;
    var max = daysInMonth(parseInt(year.values[year.picker.getSelectedIndex()], 10), month.picker.getSelectedIndex());
    if (day.picker.getSelectedIndex() > max - 1) day.picker.setSelectedIndex(max - 1);
  }

  function buildDate(now) {
    // Fixed DD | MM | YYYY column order (per request; the en-US locale would
    // otherwise give MDY).
    var order = ['date', 'month', 'year'];

    var built = {
      month: function () { return addColumn(monthNames(), now.getMonth(), 'month'); },
      date: function () { return addColumn(range(1, 31, pad2), now.getDate() - 1, 'date'); },
      year: function () { return addColumn(range(1970, 2035), now.getFullYear() - 1970, 'year'); },
    };
    order.forEach(function (k) { built[k](); });
    clampDay();
  }

  function buildTime(now) {
    var use12 = !!(window.api && window.api.hour12);
    var h = now.getHours();
    addColumn(use12 ? range(1, 12, pad2) : range(0, 23, pad2), use12 ? ((h % 12) || 12) - 1 : h, 'hour');
    addColumn(range(0, 59, pad2), now.getMinutes(), 'minute');
    if (use12) {
      var ampm = addColumn(['AM', 'PM'], h < 12 ? 0 : 1, 'ampm');
      // With only two values, wrap-around makes both neighbours show the OTHER
      // value ("AM / PM / AM"). Point _upper at the true last index so
      // ValuePickerNt blanks the edge rows, like the spec sheet shows.
      ampm.picker._upper = 1;
    }
  }

  function chosenDate() {
    var y = parseInt(col('year').values[col('year').picker.getSelectedIndex()], 10);
    var m = col('month').picker.getSelectedIndex();
    var d = col('date').picker.getSelectedIndex() + 1;
    return y + '-' + pad2(m + 1) + '-' + pad2(Math.min(d, daysInMonth(y, m)));
  }
  function chosenTime() {
    var h = parseInt(col('hour').picker.getSelectedDisplayedText(), 10);
    var m = parseInt(col('minute').picker.getSelectedDisplayedText(), 10);
    var ampm = col('ampm');
    if (ampm) h = (h % 12) + (ampm.picker.getSelectedDisplayedText() === 'PM' ? 12 : 0);
    return pad2(h) + ':' + pad2(m);
  }

  // ── open / close / save ──────────────────────────────────────────────
  function open(input) {
    build();
    activeInput = input;
    restoreRow = input.closest('li');
    mode = input.type === 'date' ? 'date' : 'time';

    container.textContent = '';
    cols = [];
    titleEl.textContent = mode === 'date' ? 'Set Date' : 'Set Time';

    // Unhide BEFORE building the columns: ValuePickerNt.updateUI() writes an
    // inline line-height equal to the label's clientHeight, and in a hidden
    // overlay that height is 0 — the text then paints hard against the top of
    // its box, off the highlight band.
    overlay.hidden = false;
    var now = new Date();
    if (mode === 'date') buildDate(now); else buildTime(now);
    cols.forEach(function (c) { c.picker.updateUI(); }); // re-measure, now visible
    focusCol(0);

    requestAnimationFrame(function () { overlay.classList.add('showing'); });
    window.addEventListener('keydown', onKey, true);
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    window.removeEventListener('keydown', onKey, true);
    overlay.classList.remove('showing');
    overlay.hidden = true;
    cols = [];
    if (restoreRow) { restoreRow.classList.add('focus'); restoreRow.focus(); restoreRow = null; }
    activeInput = null; mode = null;
  }

  function save() {
    if (!activeInput) return;
    var input = activeInput, value = mode === 'date' ? chosenDate() : chosenTime();
    close();
    input.value = value;
    // The panel's 'change' handler turns this into ApiManager.time.set().
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function onKey(e) {
    if (!overlay || overlay.hidden || !cols.length) return;
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); focusCol(focusIdx - 1); break;
      case 'ArrowRight': e.preventDefault(); focusCol(focusIdx + 1); break;
      case 'ArrowUp': e.preventDefault(); roll(cols[focusIdx], -1); break;
      case 'ArrowDown': e.preventDefault(); roll(cols[focusIdx], 1); break;
      case 'Enter': case 'Accept': e.preventDefault(); save(); break;
      case 'Backspace': case 'SoftLeft': case 'Escape': e.preventDefault(); close(); break;
      default: return;
    }
    e.stopPropagation();
  }

  // ── activation ───────────────────────────────────────────────────────
  // The panel's click handler stopPropagation()s and seeds the input with a
  // locale string it can't parse, so intercept ahead of it in the capture phase.
  function dateTimeInput(row) {
    if (!row || (row.id !== 'date-item' && row.id !== 'time-item')) return null;
    if (row.getAttribute('aria-disabled') === 'true') return null;
    return row.querySelector('input[type=date], input[type=time]');
  }
  document.addEventListener('click', function (e) {
    var input = dateTimeInput(e.target.closest && e.target.closest('li'));
    if (!input) return;
    e.stopPropagation();
    open(input);
  }, true);
  document.addEventListener('keydown', function (e) {
    if (overlay && !overlay.hidden) return;
    if (e.key !== 'Enter' && e.key !== 'Accept') return;
    var t = document.activeElement;
    var row = (t && t.classList && t.classList.contains('focus')) ? t : document.querySelector('li.focus');
    var input = dateTimeInput(row);
    if (!input) return;
    e.preventDefault(); e.stopPropagation();
    open(input);
  }, true);
})();
