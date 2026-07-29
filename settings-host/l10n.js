// l10n shim — the real settings app expects Gecko's Fluent (document.l10n) and
// Gaia's navigator.mozL10n, neither of which exist in a normal browser. Load the
// app's own locales-obj JSON ([{$i,$v}]) and fill [data-l10n-id] elements, plus
// expose a small compatible API surface. Loaded before any app script.
(function () {
  var MAP = {};
  var readyResolve, readyPromise = new Promise(function (r) { readyResolve = r; });

  function fmt(v, args, depth) {
    if (v == null) return '';
    // Compiled Fluent patterns arrive as arrays of literal strings and
    // placeables, e.g. batteryLevel-percent-unplugged =
    //   [{ t: 'idOrVar', v: 'level' }, '%']  →  "69%"
    // A placeable's `v` is either a $variable supplied in args OR a reference to
    // another message/term (e.g. accessibility-header → { v: 'accessibility' },
    // which resolves to the `accessibility` message "Accessibility"). Resolving
    // it as an empty string blanked those headers.
    if (Array.isArray(v)) {
      return v.map(function (part) {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          var name = part.v != null ? part.v : part.name;
          if (args && name in args) return String(args[name]);
          // term / message reference (guard against cycles)
          if ((depth || 0) < 8 && MAP[name]) return fmt(MAP[name].value, args, (depth || 0) + 1);
          return '';
        }
        return String(part);
      }).join('');
    }
    v = String(v);
    if (args) for (var k in args) {
      v = v.replace(new RegExp('\\{\\{\\s*' + k + '\\s*\\}\\}', 'g'), args[k])
           .replace(new RegExp('\\{\\s*\\$?' + k + '\\s*\\}', 'g'), args[k]);
    }
    return v;
  }
  function get(id, args) { var e = MAP[id]; return e ? fmt(e.value, args) : ''; }

  function applyTo(el) {
    if (!el || !el.getAttribute) return;
    var id = el.getAttribute('data-l10n-id'); if (!id) return;
    var e = MAP[id]; if (!e) return;
    var args = null;
    try { args = JSON.parse(el.getAttribute('data-l10n-args') || 'null'); } catch (x) {}
    if (e.attrs) for (var a in e.attrs) el.setAttribute(a, fmt(e.attrs[a], args));
    if (e.value != null && e.value !== '') {
      // Preserve child elements that carry their own l10n (e.g. slots) — only
      // replace when the element has no element children.
      if (el.childElementCount === 0) el.textContent = fmt(e.value, args);
      else { // set the first text node if present
        var set = false;
        for (var i = 0; i < el.childNodes.length; i++) {
          if (el.childNodes[i].nodeType === 3) { el.childNodes[i].nodeValue = fmt(e.value, args); set = true; break; }
        }
        if (!set && el.childElementCount === 0) el.textContent = fmt(e.value, args);
      }
    }
  }
  function translateFragment(root) {
    root = root || document.documentElement; if (!root) return;
    applyTo(root);
    var nodes = root.querySelectorAll ? root.querySelectorAll('[data-l10n-id]') : [];
    for (var i = 0; i < nodes.length; i++) applyTo(nodes[i]);
  }

  var l10n = {
    get ready() { return readyPromise; },
    formatValue: function (id, args) { return Promise.resolve(get(id, args)); },
    formatValues: function (keys) { return Promise.resolve((keys || []).map(function (k) { return get(k.id || k, k.args); })); },
    setAttributes: function (el, id, args) { el.setAttribute('data-l10n-id', id); if (args) el.setAttribute('data-l10n-args', JSON.stringify(args)); applyTo(el); },
    getAttributes: function (el) { var a = null; try { a = JSON.parse(el.getAttribute('data-l10n-args') || 'null'); } catch (x) {} return { id: el.getAttribute('data-l10n-id'), args: a }; },
    translateFragment: function (el) { translateFragment(el); return Promise.resolve(); },
    translateElements: function (els) { for (var i = 0; i < els.length; i++) applyTo(els[i]); return Promise.resolve(); },
    connectRoot: function () {}, disconnectRoot: function () {},
    translateRoots: function () { return Promise.resolve(); },
    pauseObserving: function () {}, resumeObserving: function () {},
  };
  try { Object.defineProperty(document, 'l10n', { value: l10n, configurable: true }); } catch (e) { try { document.l10n = l10n; } catch (x) {} }

  var mozL10n = {
    get: get,
    ready: function (cb) { readyPromise.then(cb); return readyPromise; },
    once: function (cb) { readyPromise.then(cb); },
    formatValue: function (id, args) { return Promise.resolve(get(id, args)); },
    setAttributes: l10n.setAttributes, getAttributes: l10n.getAttributes,
    translateFragment: translateFragment, translate: translateFragment,
    readyState: 'complete',
    language: { code: 'en-US', direction: 'ltr' },
    qps: {}, DateTimeFormat: function () { return { localeFormat: function (d) { return String(d); } }; },
  };
  try { navigator.mozL10n = mozL10n; } catch (e) {}
  window.NavigatorLanguage = window.NavigatorLanguage || {};

  // Try the inlined copy first (settings-host/build-web.mjs bakes the JSON
  // into __shim/l10n-data.js, so it works over file:// in the simulator and
  // from a GitHub Pages subpath without any XHR), then fall back to fetching
  // the locales-obj file (works when the bundle is served from origin root).
  function applyLocale(arr) {
    if (!arr) return;
    (arr || []).forEach(function (row) {
      var v = row.$v;
      // An array is a compiled Fluent pattern (literals + placeables), NOT the
      // { value, attributes } shape — treating it as the latter blanked out
      // every interpolated string (battery level, powerSave thresholds, ...).
      if (Array.isArray(v)) MAP[row.$i] = { value: v };
      else if (v && typeof v === 'object') MAP[row.$i] = { value: v.value != null ? v.value : '', attrs: v.attributes || null };
      else MAP[row.$i] = { value: v };
    });
    afterMapLoaded();
  }
  function afterMapLoaded() {
    // Show "Wi-Fi" everywhere instead of "WLAN" (the build ships WLAN wording;
    // the certified→wifi switch is timing-sensitive, so just rename the string).
    function deWlan(s) { return typeof s === 'string' && s.indexOf('WLAN') !== -1 ? s.replace(/WLAN/g, 'Wi-Fi') : s; }
    Object.keys(MAP).forEach(function (k) {
      var e = MAP[k];
      if (!e) return;
      if (Array.isArray(e.value)) { e.value = e.value.map(deWlan); return; }
      if (typeof e.value === 'string' && e.value.indexOf('WLAN') !== -1) e.value = e.value.replace(/WLAN/g, 'Wi-Fi');
    });
    if (document.documentElement) translateFragment(document.documentElement);
    if (document.readyState !== 'loading') translateFragment(document.documentElement);
    else document.addEventListener('DOMContentLoaded', function () { translateFragment(document.documentElement); });
    readyResolve();
    try {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          if (m.type === 'attributes' && m.target.getAttribute && m.target.getAttribute('data-l10n-id')) applyTo(m.target);
          for (var i = 0; i < m.addedNodes.length; i++) { var n = m.addedNodes[i]; if (n.nodeType === 1) translateFragment(n); }
        });
      }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-l10n-id', 'data-l10n-args'] });
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('localized'));
    document.dispatchEvent(new CustomEvent('DOMRetranslated'));
    // The app updates some labels' text late and directly (e.g. the Wi-Fi menu
    // item, from a settings cache), bypassing the attribute observer. Re-apply
    // our string map a few times after load to overwrite those with the map
    // values (so "WLAN" → "Wi-Fi" sticks).
    [700, 1800, 3500].forEach(function (ms) {
      setTimeout(function () { try { translateFragment(document.documentElement); } catch (e) {} }, ms);
    });
  }
  // Pick the locale source: the baked-in copy (works over file:// and from a
  // github.io subpath) wins if present; otherwise fall back to XHR.
  var inline = window.__KAIOS_L10N_ENUS;
  if (Array.isArray(inline) && inline.length) {
    applyLocale(inline);
  } else {
    function loadJSON(url) {
      return new Promise(function (resolve, reject) {
        var x = new XMLHttpRequest();
        x.open('GET', url);
        x.onload = function () { try { resolve(JSON.parse(x.responseText)); } catch (e) { reject(e); } };
        x.onerror = function () { reject(new Error('XHR failed: ' + url)); };
        x.send();
      });
    }
    loadJSON('locales-obj/en-US.json').then(applyLocale).catch(function (e) {
      console.warn('[l10n-shim] locale load failed', e); readyResolve();
    });
  }
})();
