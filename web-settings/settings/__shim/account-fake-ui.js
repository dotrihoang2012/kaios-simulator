// Fake KaiOS-account sign-in. The real login UI lives in the SYSTEM app
// (system/fxa/*), reached via a `chrome://system/content/fxa/fxa_module.html`
// iframe behind the `account-manager` web-activity — none of which exists in
// this Settings-only sim, and real auth needs the KaiOS/Google backend anyway.
// So this fakes the whole flow, matched to the real device screenshots:
//   • "Sign In" / "Create Account" pages: light-grey body, one field per row
//     that turns solid blue with a white label when focused, white boxed
//     inputs, softkeys (blank|Cancel) | SELECT | Sign In/Next.
//   • Region row opens the country-code "Select" list (radio rows, focused
//     row blue, Cancel | SELECT softkeys) like the real value selector.
//   • Submitting shows the "Signing in…" progress page (indeterminate bar,
//     Cancel softkey) before resolving.
//   • Account Info → Options → Change password, and Anti-Theft's password
//     check, are faked with the same form styling.
//   • Google add-account gets its own Google-styled form. ActiveSync is
//     intentionally NOT faked (dropped per request).
// Signed-in state lives in localStorage for the current session only — every
// page load starts signed out (per request). No real network / crypto.
(function () {
  'use strict';

  var STORE_KEY = 'kaios.fakeAccounts.v1';
  var HL = 'var(--highlight-color,#0073e6)';

  // Start every page load / refresh signed out (per request): the fake account
  // lives only for the current session, so a reload always shows "Not signed in".
  try { localStorage.removeItem(STORE_KEY); } catch (e) {}

  // ── persisted fake account store ─────────────────────────────────────
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function saveStore(a) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(a)); } catch (e) {}
  }
  function accountsOf(types) {
    return loadStore().filter(function (a) { return types.indexOf(a.authenticatorId) !== -1; });
  }
  function upsert(acc) {
    var s = loadStore().filter(function (a) {
      if (acc.authenticatorId === 'kaiaccount') return a.authenticatorId !== 'kaiaccount';
      return !(a.authenticatorId === acc.authenticatorId && a.accountId === acc.accountId);
    });
    s.push(acc);
    saveStore(s);
  }
  function removeAccounts(authId, accountId) {
    saveStore(loadStore().filter(function (a) {
      var match = (!authId || a.authenticatorId === authId) && (!accountId || a.accountId === accountId);
      return !match; // keep everything that does NOT match
    }));
  }

  // ── region (country-code) data — like the fxa cc selector ────────────
  var REGIONS = [
    { name: 'Australia', code: '+61' }, { name: 'Brazil', code: '+55' },
    { name: 'Canada', code: '+1' }, { name: 'China', code: '+86' },
    { name: 'France', code: '+33' }, { name: 'Germany', code: '+49' },
    { name: 'India', code: '+91' }, { name: 'Indonesia', code: '+62' },
    { name: 'Italy', code: '+39' }, { name: 'Japan', code: '+81' },
    { name: 'Mexico', code: '+52' }, { name: 'Nigeria', code: '+234' },
    { name: 'Pakistan', code: '+92' }, { name: 'Philippines', code: '+63' },
    { name: 'Russia', code: '+7' }, { name: 'South Africa', code: '+27' },
    { name: 'Spain', code: '+34' }, { name: 'Thailand', code: '+66' },
    { name: 'Uganda', code: '+256' }, { name: 'Ukraine', code: '+380' },
    { name: 'United Arab Emirates', code: '+971' }, { name: 'United Kingdom', code: '+44' },
    { name: 'United States', code: '+1' }, { name: 'Vietnam', code: '+84' }
  ];
  var lastRegion = REGIONS[22]; // United States +1 — the fxa default
  function regionLabel(r) { return r.name + ' ' + r.code; }

  // ── styles (matched to the device screenshots) ───────────────────────
  var styleInjected = false;
  function injectStyle() {
    if (styleInjected) return; styleInjected = true;
    var s = document.createElement('style');
    s.textContent =
      // full-screen page; body light grey, header white
      '.fk-login{position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;' +
      'background:#ececec;font-size:1.6rem}' +
      '.fk-login[hidden]{display:none}' +
      // header sized to match the settings app's own gaia-header (1.7rem/600, 2.8rem tall)
      '.fk-login .fk-head{flex:0 0 auto;display:flex;align-items:center;justify-content:center;' +
      'height:2.8rem;padding:0 1rem;text-align:center;font-size:1.7rem;font-weight:600;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:var(--color-gs00,#fff);' +
      'color:var(--color-gs90,#323232);border-bottom:solid 1px #858585}' +
      '.fk-login.fk-google .fk-head{border-bottom:solid .3rem #4285f4}' +
      // no top padding: the first row (Region) sits flush against the header
      '.fk-login .fk-body{flex:1;overflow-y:auto;padding:0 0 .5rem}' +
      // intro paragraph above the fields (Change Password / Anti-Theft)
      '.fk-login .fk-intro{margin:0;padding:1rem 1.2rem;font-size:1.6rem;line-height:1.4;' +
      'color:var(--color-gs90,#333);font-weight:400}' +
      '.fk-login ul{list-style:none;margin:0;padding:0}' +
      // one field per row; the whole row goes blue with a white label on focus
      // the page-wide shim rule `ul li:not(.button){min-height:7rem!important}`
      // was locking every row to 7rem no matter the content — undo it here
      '.fk-login ul li{min-height:0!important;height:auto!important}' +
      '.fk-login li{position:relative;margin:0;padding:.3rem 0 .5rem 0}' +
      '.fk-login li.focus{background:' + HL + '}' +
      '.fk-login li>label{display:block;text-align:left;padding-inline-start:1rem;margin:0 0 .2rem 0;' +
      'font-size:1.4rem;font-weight:400;color:var(--color-gs70,#5c5c5c)}' +
      '.fk-login li.focus>label{color:#fff}' +
      // Region row: compact band — normal text, tight box (the row height is
      // now truly content-sized after dropping the 7rem min-height)
      '.fk-login li.fk-display{padding:.7rem 0 .8rem}' +
      '.fk-login li.fk-display>label{margin:0 0 .2rem 0}' +
      '.fk-login li>p.fk-value{margin:0;padding-inline-start:1rem;font-size:1.8rem;line-height:2.2rem;' +
      'color:var(--color-gs90,#111)}' +
      '.fk-login li.focus>p.fk-value{color:#fff}' +
      // thin separator under the Region row (fxa-elements-seperator)
      '.fk-login .fk-sep{margin:.2rem 0 .8rem;border-bottom:1px solid #858585}' +
      // boxed white input (shared input_areas look), stays white on a blue row
      '.fk-login li>input{width:calc(100% - 2rem);display:block;box-sizing:border-box;margin:0 1rem;' +
      'height:3.2rem;line-height:3.2rem;padding:0 1rem;font-size:1.6rem;font-weight:400;' +
      'color:var(--color-gs90,#111);background:var(--color-gs00,#fff);' +
      'border:.1rem solid var(--color-gs45,#a0a0a0);border-radius:.2rem;outline:none}' +
      '.fk-login li>input::placeholder{color:#a9a9a9;font-style:italic}' +
      // show-password row: leave layout entirely to the settings app's own
      // pack-checkbox styling (lists.css + switches.css — the same rendering as
      // Do Not Track's rows). Only un-clip the 3.2rem glyph: the page-wide
      // `ul{overflow:hidden}` cut its top off, and the stock 1rem top margin
      // pushed it out of the short row.
      '.fk-login ul{overflow:visible}' +
      '.fk-login li.fk-showpw{padding:.6rem 0;min-height:0!important;overflow:visible}' +
      // width:100% + its own padding overflowed the row by 1rem, squeezing the
      // glyph against the screen edge — contain the border box
      '.fk-login li.fk-showpw label.pack-checkbox{margin:0!important;height:3.2rem;position:relative;' +
      'width:100%!important;box-sizing:border-box!important}' +
      '.fk-login li.fk-showpw label.pack-checkbox>span{font-size:1.6rem;color:var(--color-gs90,#111)}' +
      // anchor the glyph to the full-width label, 1.6rem in from the right —
      // it was hugging (and clipping at) the screen edge
      '.fk-login li.fk-showpw label.pack-checkbox>span:after{left:auto!important;' +
      'right:1.6rem!important;top:calc(50% - 1.6rem)!important;margin:0!important}' +
      '.fk-login li.fk-showpw.focus label.pack-checkbox>span{color:#fff!important}' +
      '.fk-login .fk-hint{padding:1rem 1.2rem;font-size:1.3rem;color:#888;line-height:1.5}' +
      // "Signing in…" progress: the real fxa overlay (fxa_module.html .pannel:
      // <p class="title"> margin 1rem + <div class="progress"> margin 1rem)
      '.fk-login .fk-prog-title{margin:1rem;padding:0;font-size:1.7rem;line-height:1.4;' +
      'color:var(--color-gs90,#000);font-weight:400}' +
      '.fk-login .fk-prog{border-radius:.5rem;margin:1rem;height:.6rem;' +
      'background:var(--color-gs45,#a0a0a0);text-align:center;transition:width .6s ease;' +
      'background-image:linear-gradient(90deg,' + HL + ' 25%,transparent 25%,transparent 50%,' +
      HL + ' 50%,' + HL + ' 75%,transparent 75%,transparent);' +
      'animation:fkstripes 2s linear infinite reverse;background-size:66rem}' +
      '@keyframes fkstripes{0%{background-position:66rem 0}100%{background-position:33rem 0}}' +
      // Google OAuth in the sim's REAL browser chrome (copied from index.html's
      // bw-* browser): white topbar with gaia-icons lock + page title, the
      // purple progress line, the page in an iframe through the web proxy, and
      // the floating round bw-btn controls (✕ close, speaker).
      '.fk-browser{position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;' +
      'background:#fff;font-family:sans-serif}' +
      // window open/close: the system appWindow slide pair (window.css) —
      // slideFromDown on open, slideToDown on close, 0.3s cubic-bezier(0.7,0,1,1)
      '@keyframes fkSlideFromDown{0%{transform:translateY(100%)}100%{transform:translateY(0)}}' +
      '@keyframes fkSlideToDown{0%{transform:translateY(0)}100%{transform:translateY(100%)}}' +
      '.fk-browser.fk-opening{animation:fkSlideFromDown .3s forwards cubic-bezier(0.7,0,1,1)}' +
      '.fk-browser.fk-closing{animation:fkSlideToDown .3s forwards cubic-bezier(0.7,0,1,1)}' +
      // deep-purple titlebar, white lock + title
      '.fk-browser .fk-btop{flex:none;height:2.4rem;background:#4a0d8f;display:flex;align-items:center;' +
      'padding:0 .6rem}' +
      '.fk-browser .fk-burl{flex:1;display:flex;align-items:center;overflow:hidden}' +
      '.fk-browser .fk-bssl{flex:none;font-family:gaia-icons;font-style:normal;font-size:1.2rem;' +
      'color:#fff;line-height:1;padding-right:.3rem}' +
      '.fk-browser .fk-bttl{flex:none;font-size:1.2rem;color:rgba(255,255,255,.92);overflow:hidden;' +
      'white-space:nowrap;text-overflow:ellipsis;max-width:calc(100% - 2rem)}' +
      // progress line: exact copy of #bw-progress — the fill slides IN
      // (bw-p-in) then OUT (bw-p-out), ping-ponged from animationend
      '.fk-browser .fk-bprog{flex:none;height:.2rem;overflow:hidden;background:#e0e0e0;display:none}' +
      '.fk-browser .fk-bprog.bw-p-active{display:block}' +
      '.fk-browser .fk-bfill{width:100%;height:100%;background:#8000ff;transform:translateX(-100%);display:none}' +
      '.fk-browser .fk-bfill.bw-p-in{display:block;animation:fkbw-p-in 1520ms cubic-bezier(0.3,0,0.4,1) forwards}' +
      '.fk-browser .fk-bfill.bw-p-out{display:block;animation:fkbw-p-out 1520ms cubic-bezier(0.6,0,0.3,1) forwards}' +
      '@keyframes fkbw-p-in{from{transform:translateX(-100%)}to{transform:translateX(0%)}}' +
      '@keyframes fkbw-p-out{from{transform:translateX(0%)}to{transform:translateX(100%)}}' +
      '.fk-browser iframe{flex:1;border:none;width:100%;background:#fff}' +
      // floating round buttons: exact #bw-nav .bw-btn (icon inherits the
      // button's 2.4rem size, gaia-icons, line-height 1)
      '.fk-browser .fk-bnav{position:absolute;bottom:0;left:0;right:0;pointer-events:none;' +
      'display:flex;justify-content:space-between;padding:0 1rem 1rem}' +
      '.fk-browser .fk-bbtn{pointer-events:auto;box-shadow:0 .2rem .4rem 0 rgba(0,0,0,.5);' +
      'background:#fff;color:#000;font-size:2.4rem;border-radius:1.2rem;height:2.4rem;width:2.4rem;' +
      'display:inline-flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer}' +
      // X = the system browser window's real button glyph (gaia-icons 'cancel',
      // browser_window_buttons.js). No -0.5rem offset here: that compensates
      // the system's inline layout — our flex centring needs none.
      '.fk-browser .fk-bbtn .fk-bicon{font-family:gaia-icons;font-style:normal;line-height:1;' +
      'display:block}' +
      '.fk-browser .fk-bbtn .fk-bicon:before{display:block;line-height:1}' +
      // scroll-mode edge arrows — verbatim #bw-scroll-ind from the simulator
      '.fk-scind{position:absolute;top:2.4rem;left:0;right:0;bottom:0;pointer-events:none;' +
      'z-index:6;display:none}' +
      '.fk-scind.visible{display:block}' +
      '.fk-scind .sc{position:absolute;background-repeat:no-repeat;background-color:rgba(0,0,0,0.5);' +
      'background-position:center}' +
      // Relative (not "/__system/…"): resolves against the settings document —
      // works from file:// and a github.io subpath alike.
      '.fk-scind .sc.top{top:0;width:100%;height:1rem;background-image:url(__system/arrow_up.png)}' +
      '.fk-scind .sc.left{top:1rem;left:0;width:1rem;height:calc(100% - 2rem);background-image:url(__system/arrow_left.png)}' +
      '.fk-scind .sc.right{top:1rem;right:0;width:1rem;height:calc(100% - 2rem);background-image:url(__system/arrow_right.png)}' +
      '.fk-scind .sc.bottom{bottom:0;width:100%;height:1rem;background-image:url(__system/arrow_down.png)}' +
      // MEDIA volume overlay — verbatim #bw-vol-ov from the simulator
      '.fk-vol{display:none;position:absolute;inset:0;z-index:100001;flex-direction:column;' +
      'align-items:center;background:rgba(0,0,0,0.85);pointer-events:none}' +
      '.fk-vol.visible{display:flex}' +
      '.fk-vol .fk-vtitle{position:absolute;top:4rem;left:2rem;right:2rem;font-size:2.4rem;' +
      'font-weight:700;color:#fff;text-align:left;line-height:1.2;text-transform:uppercase;z-index:1}' +
      '.fk-vol .fk-vbody{position:relative;flex:1;width:100%}' +
      '.fk-vol .fk-vcircle{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'border-radius:50%;background:linear-gradient(45deg,#3822FF 0%,#AB00C7 100%);display:flex;' +
      'align-items:center;justify-content:center;transition:width 0.15s,height 0.15s}' +
      '.fk-vol .fk-vicon{font-size:4.8rem;line-height:6rem;height:6rem;color:#fff;font-style:normal}' +
      '.fk-vol .fk-vicon:before{font-family:gaia-icons;content:attr(data-icon);font-weight:500;' +
      'font-style:normal;text-transform:none;text-rendering:optimizeLegibility}' +
      '.fk-vol .fk-vnum{font-size:2.5rem;font-weight:700;color:#fff;display:none}' +
      '.fk-vol .fk-vlabel{position:absolute;top:calc(50% + 4.5rem);left:0;right:0;text-align:center;' +
      'font-size:1.8rem;color:#fff}' +
      // region "Select" list (value-selector look)
      '.fk-select{position:fixed;inset:0;z-index:100001;display:flex;flex-direction:column;' +
      'background:var(--color-gs00,#fff);font-size:1.7rem}' +
      '.fk-select .fk-sel-head{flex:0 0 auto;text-align:center;font-size:1.7rem;font-weight:600;' +
      'color:var(--color-gs90,#323232);padding:.6rem 1rem .4rem}' +
      '.fk-select ul{flex:1;overflow-y:auto;margin:0;padding:0;list-style:none;scrollbar-width:none}' +
      '.fk-select ul::-webkit-scrollbar{display:none}' +
      // the app-wide list rules (flex-direction:column, centred, 7rem min
      // height, 20rem-wide spans) wreck this list — force name left, radio right
      // `.fk-select ul li` ties the shim's `ul li:not(.button)` specificity so
      // the later rule (this one) wins the 7rem min-height fight
      '.fk-select ul li{min-height:0!important;height:auto!important}' +
      '.fk-select li{display:flex!important;flex-direction:row!important;align-items:center!important;' +
      'justify-content:space-between!important;gap:1rem;min-height:0!important;height:auto!important;' +
      'padding:1.1rem 1rem!important;color:var(--color-gs90,#323232)}' +
      '.fk-select li>span:first-child{flex:1 1 auto;width:auto!important;margin:0!important;' +
      'padding:0!important;text-align:left;line-height:1.3;font-size:1.7rem}' +
      '.fk-select li.focus{background:' + HL + ';color:#fff}' +
      '.fk-select .fk-radio{flex:0 0 auto;width:2rem;height:2rem;border:.2rem solid #7d7d7d;' +
      'border-radius:50%;box-sizing:border-box;position:relative}' +
      '.fk-select li.focus .fk-radio{border-color:#fff}' +
      '.fk-select li.checked .fk-radio::after{content:"";position:absolute;inset:.25rem;' +
      'border-radius:50%;background:' + HL + '}' +
      '.fk-select li.focus.checked .fk-radio::after{background:#fff}' +
      // softkey bar = shared .skbar (gs20, no border) — used by all overlays here
      '.fk-login .fk-keys,.fk-select .fk-keys{flex:0 0 auto;display:grid;' +
      'grid-template-columns:1fr auto 1fr;align-items:center;' +
      'height:var(--softkeybar-height,3rem);border:0;background:var(--color-gs20,#dadada);' +
      'color:var(--color-gs90,#323232);white-space:nowrap;margin:0;padding:0}' +
      '.fk-login .fk-keys span,.fk-select .fk-keys span{line-height:var(--softkeybar-height,3rem);cursor:pointer}' +
      '.fk-login .fk-keys .lsk,.fk-select .fk-keys .lsk{text-align:left;padding:0 .5rem;font-size:1.4rem;font-weight:600}' +
      '.fk-login .fk-keys .csk,.fk-select .fk-keys .csk{text-align:center;font-size:1.6rem;font-weight:700;text-transform:uppercase}' +
      '.fk-login .fk-keys .rsk,.fk-select .fk-keys .rsk{text-align:right;padding:0 .5rem;font-size:1.4rem;font-weight:600}';
    document.head.appendChild(s);
  }

  // ── region "Select" list (like screenshot #102) ───────────────────────
  // The picker installs NO key listener of its own. The owning form stays the
  // single keydown authority and drives it through this controller — two
  // stacked capture listeners kept getting out of sync (an orphaned one ate
  // keys, jumped focus and let Enter fall through to submit).
  var pickerCtl = null;
  function showRegionPicker(current) {
    injectStyle();
    if (pickerCtl) return pickerCtl.promise; // already open — never stack
    var overlay = document.createElement('div');
    overlay.className = 'fk-select';
    var head = document.createElement('div'); head.className = 'fk-sel-head';
    head.textContent = 'Select';
    var ul = document.createElement('ul');
    var idx = 0;
    var resolveFn;
    var promise = new Promise(function (resolve) { resolveFn = resolve; });
    REGIONS.forEach(function (r, i) {
      var li = document.createElement('li');
      var span = document.createElement('span'); span.textContent = regionLabel(r);
      var radio = document.createElement('span'); radio.className = 'fk-radio';
      li.appendChild(span); li.appendChild(radio);
      if (current && r.name === current.name && r.code === current.code) { li.classList.add('checked'); idx = i; }
      li.addEventListener('mousedown', function (e) { e.preventDefault(); focusAt(i); choose(); });
      ul.appendChild(li);
    });
    var keys = document.createElement('menu'); keys.className = 'fk-keys';
    var lsk = document.createElement('span'); lsk.className = 'lsk'; lsk.textContent = 'Cancel';
    var csk = document.createElement('span'); csk.className = 'csk'; csk.textContent = 'Select';
    keys.appendChild(lsk); keys.appendChild(csk); keys.appendChild(document.createElement('span'));
    overlay.appendChild(head); overlay.appendChild(ul); overlay.appendChild(keys);
    document.body.appendChild(overlay);

    function focusAt(i) {
      idx = (i + REGIONS.length) % REGIONS.length;
      for (var k = 0; k < ul.children.length; k++) ul.children[k].classList.toggle('focus', k === idx);
      ul.children[idx].scrollIntoView({ block: 'nearest' });
    }
    function done(result) { pickerCtl = null; overlay.remove(); resolveFn(result); }
    function choose() { done(REGIONS[idx]); }
    function cancel() { done(null); }
    lsk.addEventListener('mousedown', function (e) { e.preventDefault(); cancel(); });
    csk.addEventListener('mousedown', function (e) { e.preventDefault(); choose(); });
    focusAt(idx);
    pickerCtl = {
      promise: promise,
      move: function (d) { focusAt(idx + d); },
      choose: choose,
      cancel: cancel
    };
    return promise;
  }

  // ── "Signing in…" progress page (like screenshot #108) ───────────────
  function showProgress(title, text, ms) {
    injectStyle();
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'fk-login';
      var head = document.createElement('div'); head.className = 'fk-head'; head.textContent = title;
      var body = document.createElement('div'); body.className = 'fk-body';
      var p = document.createElement('p'); p.className = 'fk-prog-title'; p.textContent = text;
      var bar = document.createElement('div'); bar.className = 'fk-prog';
      body.appendChild(p); body.appendChild(bar);
      var keys = document.createElement('menu'); keys.className = 'fk-keys';
      var lsk = document.createElement('span'); lsk.className = 'lsk'; lsk.textContent = 'Cancel';
      keys.appendChild(lsk); keys.appendChild(document.createElement('span')); keys.appendChild(document.createElement('span'));
      overlay.appendChild(head); overlay.appendChild(body); overlay.appendChild(keys);
      document.body.appendChild(overlay);

      var timer = setTimeout(function () { finish(true); }, ms || 1800);
      function finish(ok) {
        clearTimeout(timer);
        window.removeEventListener('keydown', onKey, true);
        window.removeEventListener('keyup', onSwallow, true);
        window.removeEventListener('keypress', onSwallow, true);
        overlay.remove();
        resolve(ok);
      }
      function onKey(e) {
        // modal: swallow everything; only Cancel/Back aborts
        e.preventDefault(); e.stopImmediatePropagation();
        if (e.key === 'SoftLeft' || e.key === 'Escape' || e.key === 'Backspace') finish(false);
      }
      // real presses also fire keyup/keypress — the app's keyup-driven softkey
      // layer must not see them either
      function onSwallow(e) { e.stopImmediatePropagation(); }
      lsk.addEventListener('mousedown', function (e) { e.preventDefault(); finish(false); });
      window.addEventListener('keydown', onKey, true);
      window.addEventListener('keyup', onSwallow, true);
      window.addEventListener('keypress', onSwallow, true);
    });
  }

  // ── form page ─────────────────────────────────────────────────────────
  // opts: { title, variant('kaios'|'google'), fields, lskLabel, rskLabel,
  //         intro, hint, validate(values)→badKey|null }
  // field: { key, label, type('display'|'sep'|'text'|'email'|'tel'|'password'),
  //          value, placeholder, picker:'region' }
  // Resolves collected values, or null on cancel (Back / Escape / LSK).
  function showForm(opts) {
    injectStyle();
    // never stack a second form — the app's keyup-driven softkey layer can
    // re-fire the opener while one is already up
    if (document.querySelector('.fk-login')) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'fk-login' + (opts.variant === 'google' ? ' fk-google' : '');
      overlay.tabIndex = -1;
      var head = document.createElement('div'); head.className = 'fk-head';
      head.textContent = opts.title;
      var body = document.createElement('div'); body.className = 'fk-body';
      if (opts.intro) {
        var intro = document.createElement('p'); intro.className = 'fk-intro';
        intro.textContent = opts.intro; body.appendChild(intro);
      }
      var ul = document.createElement('ul'); body.appendChild(ul);

      var rows = [];        // { li, kind:'display'|'input'|'checkbox', input?, field?, valueEl? }
      var pwInputs = [];
      var lastKeyToggle = 0; // when Enter last toggled the checkbox (to eat its click echo)
      (opts.fields || []).forEach(function (f) {
        if (f.type === 'sep') {
          var sep = document.createElement('p'); sep.className = 'fk-sep';
          ul.appendChild(sep); return;
        }
        var li = document.createElement('li');
        var lab = document.createElement('label'); lab.textContent = f.label;
        li.appendChild(lab);
        if (f.type === 'display') {
          li.classList.add('fk-display');
          var p = document.createElement('p'); p.className = 'fk-value';
          p.textContent = f.value || ''; li.appendChild(p);
          rows.push({ li: li, kind: 'display', field: f, valueEl: p });
        } else {
          var inp = document.createElement('input');
          inp.type = f.type || 'text';
          if (f.placeholder) inp.placeholder = f.placeholder;
          if (f.value != null) inp.value = f.value;
          inp._field = f;
          li.appendChild(inp);
          rows.push({ li: li, kind: 'input', input: inp, field: f });
          if (f.type === 'password') pwInputs.push(inp);
        }
        // keep the form's focus index in sync with mouse clicks, otherwise
        // arrow-key navigation afterwards works off a stale row
        (function (idx) {
          li.addEventListener('mousedown', function () { focusRow(idx); });
        })(rows.length - 1);
        ul.appendChild(li);
      });
      if (pwInputs.length) {
        // real settings checkbox: label.pack-checkbox > input + span, so the
        // app's switches.css draws the glyph (same look as Do Not Track etc.)
        var li2 = document.createElement('li'); li2.className = 'fk-showpw';
        var lb = document.createElement('label'); lb.className = 'pack-checkbox';
        var cb = document.createElement('input'); cb.type = 'checkbox';
        var sp = document.createElement('span'); sp.textContent = 'Show password';
        lb.appendChild(cb); lb.appendChild(sp); li2.appendChild(lb); ul.appendChild(li2);
        cb.addEventListener('change', function () {
          pwInputs.forEach(function (p) { p.type = cb.checked ? 'text' : 'password'; });
        });
        // The simulator's key layer pairs Enter with a synthesized CLICK on the
        // focused element; the label's native activation then untoggled what the
        // keydown had just toggled ("Enter does nothing"). Kill native label
        // activation and toggle in code, ignoring clicks right after a key toggle.
        lb.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          if (Date.now() - lastKeyToggle < 400) return; // Enter's echo — already handled
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        });
        rows.push({ li: li2, kind: 'checkbox', cb: cb });
        (function (idx) {
          li2.addEventListener('mousedown', function () { focusRow(idx); });
        })(rows.length - 1);
      }
      if (opts.hint) {
        var h = document.createElement('div'); h.className = 'fk-hint';
        h.textContent = opts.hint; body.appendChild(h);
      }
      var keys = document.createElement('menu'); keys.className = 'fk-keys';
      var lsk = document.createElement('span'); lsk.className = 'lsk'; if (opts.lskLabel) lsk.textContent = opts.lskLabel;
      var csk = document.createElement('span'); csk.className = 'csk';
      var rsk = document.createElement('span'); rsk.className = 'rsk'; rsk.textContent = opts.rskLabel || 'Sign In';
      keys.appendChild(lsk); keys.appendChild(csk); keys.appendChild(rsk);
      overlay.appendChild(head); overlay.appendChild(body); overlay.appendChild(keys);
      document.body.appendChild(overlay);

      var cur = 0;
      function updateCsk() {
        var r = rows[cur];
        csk.textContent = (r && (r.kind === 'checkbox' || r.kind === 'display')) ? 'Select' : '';
        // "Forgot PWD" shows while an input/display row is focused, and hides
        // on the Show-password row (matching the device softkeys)
        if (opts.forgot) lsk.textContent = (r && r.kind === 'checkbox') ? '' : (opts.lskLabel || '');
      }
      function focusRow(i) {
        cur = (i + rows.length) % rows.length;
        rows.forEach(function (r, k) { r.li.classList.toggle('focus', k === cur); });
        var r = rows[cur];
        if (r.kind === 'input') r.input.focus();
        else { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); overlay.focus(); }
        r.li.scrollIntoView({ block: 'nearest' });
        updateCsk();
      }
      function toggleShowPw() {
        var r = rows[cur]; if (r.kind !== 'checkbox') return;
        lastKeyToggle = Date.now();
        r.cb.checked = !r.cb.checked;
        r.cb.dispatchEvent(new Event('change'));
      }
      function openPicker() {
        var r = rows[cur];
        if (!r.field || r.field.picker !== 'region') return;
        if (pickerCtl) return; // already open (double Enter) — never stack
        showRegionPicker(lastRegion).then(function (sel) {
          if (sel) { lastRegion = sel; r.valueEl.textContent = regionLabel(sel); }
          focusRow(cur);
        });
      }
      function activate() {
        var r = rows[cur];
        if (r.kind === 'checkbox') toggleShowPw();
        else if (r.kind === 'display' && r.field && r.field.picker) openPicker();
        else submit();
      }
      function cleanup() {
        window.removeEventListener('keydown', onKey, true);
        window.removeEventListener('keyup', onSwallow, true);
        window.removeEventListener('keypress', onSwallow, true);
        overlay.parentNode && overlay.parentNode.removeChild(overlay);
      }
      // A REAL key press also fires keyup/keypress. The app's softkey layer
      // acts on KEYUP — if it leaks, pressing Enter in this form ALSO triggers
      // the panel underneath (re-opens the form, focus jumps, next Enter
      // "signs in"). Swallow the nav keys' companions too.
      function onSwallow(e) {
        var nav = ['ArrowDown', 'ArrowUp', 'Enter', 'Accept', 'SoftRight', 'F2', 'SoftLeft', 'Escape', 'Backspace'];
        if (nav.indexOf(e.key) !== -1) e.stopImmediatePropagation();
      }
      function cancel() { cleanup(); resolve(null); }
      function forgot() {
        // LSK acts as "Forgot PWD" when offered (and showing); otherwise cancel
        if (opts.forgot && lsk.textContent) { cleanup(); resolve({ __forgot: true }); }
        else cancel();
      }
      function submit() {
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          if (r.kind === 'input' && !r.field.optional && !r.input.value.trim()) { focusRow(i); return; }
        }
        var out = {};
        rows.forEach(function (r) { if (r.kind === 'input') out[r.field.key] = r.input.value.trim(); });
        out.region = regionLabel(lastRegion);
        if (opts.validate) {
          var bad = opts.validate(out);
          if (bad) {
            for (var j = 0; j < rows.length; j++) {
              if (rows[j].field && rows[j].field.key === bad) { focusRow(j); return; }
            }
            return;
          }
        }
        cleanup(); resolve(out);
      }
      function onKey(e) {
        // The app's navigation_handler listens for keydown on the bubble phase;
        // plain stopPropagation() does NOT stop other listeners on window, so
        // Back used to both close this form AND navigate the panel underneath.
        // stopImmediatePropagation makes the form a real modal.
        var nav = ['ArrowDown', 'ArrowUp', 'Enter', 'Accept', 'SoftRight', 'F2', 'SoftLeft', 'Escape', 'Backspace'];
        if (nav.indexOf(e.key) === -1) return;
        e.stopImmediatePropagation();
        // While the region picker is up, this (single) listener drives IT —
        // the picker has no listener of its own, so nothing can go stale.
        if (pickerCtl) {
          e.preventDefault();
          switch (e.key) {
            case 'ArrowDown': pickerCtl.move(1); break;
            case 'ArrowUp': pickerCtl.move(-1); break;
            case 'Enter': case 'Accept': if (!e.repeat) pickerCtl.choose(); break;
            case 'SoftLeft': case 'Escape': case 'Backspace': pickerCtl.cancel(); break;
          }
          return;
        }
        switch (e.key) {
          case 'ArrowDown': e.preventDefault(); focusRow(cur + 1); break;
          case 'ArrowUp': e.preventDefault(); focusRow(cur - 1); break;
          case 'Enter': case 'Accept': e.preventDefault(); if (!e.repeat) activate(); break;
          case 'SoftRight': case 'F2': e.preventDefault(); submit(); break;
          case 'SoftLeft': e.preventDefault(); forgot(); break;
          case 'Escape': e.preventDefault(); cancel(); break;
          case 'Backspace':
            // Hardware Back cancels — but while EDITING a text field let it
            // delete a char. Decide off the real DOM focus, not the row index:
            // after a mouse click focus can sit on the checkbox, and letting
            // the default through there triggers a history back-navigation.
            var ae = document.activeElement;
            var editing = ae && ae.tagName === 'INPUT' &&
              ae.type !== 'checkbox' && overlay.contains(ae);
            if (!editing) { e.preventDefault(); cancel(); }
            break;
        }
      }
      lsk.addEventListener('mousedown', function (e) { e.preventDefault(); forgot(); });
      rsk.addEventListener('mousedown', function (e) { e.preventDefault(); submit(); });
      csk.addEventListener('mousedown', function (e) { e.preventDefault(); if (rows[cur].kind === 'checkbox' || rows[cur].kind === 'display') activate(); });
      window.addEventListener('keydown', onKey, true);
      window.addEventListener('keyup', onSwallow, true);
      window.addEventListener('keypress', onSwallow, true);
      // synchronous (an occluded window never fires rAF, leaving no row focused)
      focusRow(0);
    });
  }

  // ── flows: each resolves true on success, false on cancel ────────────
  // LSK "Forgot PWD" → fake reset (identity → new password → progress), then
  // back to the sign-in form.
  function forgotFlow(kind) {
    var ident = kind === 'phone'
      ? { key: 'phone', label: 'Phone number', type: 'tel', placeholder: 'Phone number' }
      : { key: 'email', label: 'Account Name', type: 'email', placeholder: 'Your Email here' };
    return showForm({
      title: 'Forgot Password', variant: 'kaios', lskLabel: 'Cancel', rskLabel: 'Next',
      intro: kind === 'phone'
        ? 'Enter your phone number and set a new password.'
        : 'Enter your email and set a new password.',
      fields: [
        ident,
        { key: 'newpw', label: 'New Password', type: 'password', placeholder: '8 - 20 characters' },
        { key: 'confirm', label: 'Confirm Password', type: 'password', placeholder: '8 - 20 characters' }
      ],
      validate: function (v) { return v.newpw === v.confirm ? null : 'confirm'; }
    }).then(function (v) {
      if (!v) return false;
      return showProgress('Forgot Password', 'Sending...');
    });
  }
  function loginPhone() {
    return showForm({
      title: 'Sign In', variant: 'kaios', lskLabel: 'Forgot PWD', forgot: true, rskLabel: 'Sign In',
      fields: [
        { key: 'regionRow', type: 'display', label: 'Region', value: regionLabel(lastRegion), picker: 'region' },
        { key: 'phone', label: 'Phone number', type: 'tel', placeholder: 'Phone number' },
        { key: 'password', label: 'Password', type: 'password', placeholder: 'Password' }
      ]
    }).then(function (v) {
      if (!v) return false;
      if (v.__forgot) return forgotFlow('phone').then(function () { return loginPhone(); });
      return showProgress('Sign In', 'Signing in...').then(function (ok) {
        if (!ok) return false;
        upsert({ authenticatorId: 'kaiaccount', accountId: v.phone, userData: { phone: v.phone } });
        return true;
      });
    });
  }
  function loginEmail() {
    return showForm({
      title: 'Sign In', variant: 'kaios', lskLabel: 'Forgot PWD', forgot: true, rskLabel: 'Sign In',
      fields: [
        { key: 'email', label: 'Account Name', type: 'email', placeholder: 'Your Email here' },
        { key: 'password', label: 'Password', type: 'password', placeholder: 'Password' }
      ]
    }).then(function (v) {
      if (!v) return false;
      if (v.__forgot) return forgotFlow('email').then(function () { return loginEmail(); });
      return showProgress('Sign In', 'Signing in...').then(function (ok) {
        if (!ok) return false;
        upsert({ authenticatorId: 'kaiaccount', accountId: v.email, userData: { email: v.email } });
        return true;
      });
    });
  }
  // Create Account (like screenshots #103/#104: Region, Account Number,
  // Password with hint label, Confirm Password, Show password, Cancel|Next)
  function createAccountFlow() {
    return showForm({
      title: 'Create Account', variant: 'kaios', lskLabel: 'Cancel', rskLabel: 'Next',
      fields: [
        { key: 'regionRow', type: 'display', label: 'Region', value: regionLabel(lastRegion), picker: 'region' },
        { type: 'sep' },
        { key: 'phone', label: 'Account Number', type: 'tel', placeholder: 'Phone Number' },
        { key: 'password', label: 'Password (Must contain letters and numbers)', type: 'password', placeholder: '8 - 20 characters' },
        { key: 'confirm', label: 'Confirm Password', type: 'password', placeholder: '8 - 20 characters' }
      ],
      validate: function (v) { return v.password === v.confirm ? null : 'confirm'; }
    }).then(function (v) {
      if (!v) return false;
      return showProgress('Create Account', 'Signing in...').then(function (ok) {
        if (!ok) return false;
        upsert({ authenticatorId: 'kaiaccount', accountId: v.phone, userData: { phone: v.phone } });
        return true;
      });
    });
  }
  // Google add-account, like the device: the Add Account panel's own cyan
  // pack-activity bar shows first (our promise stays pending ~1.5s so the
  // panel's #login-progress is what's on screen), then a browser-style window
  // opens on the Google OAuth page (lock+title bar, "Đăng nhập bằng Google"
  // strip, KaiOS tile, account form, X to close).
  function addGoogle() {
    injectStyle();
    return new Promise(function (resolve) {
      setTimeout(function () { openGoogleBrowser(resolve); }, 1500);
    });
  }
  // Same proxy the sim's browser (index.html) uses — Google refuses to be
  // iframed directly, the proxy strips that. Title updates come back from the
  // proxy's injected bw-title postMessage, exactly like the real browser.
  var BW_WEB_PROXY = 'https://rigid-tapir-7342.dotrihoang2012.deno.net';
  var GOOGLE_OAUTH_URL = 'https://accounts.google.com/signin';
  function openGoogleBrowser(resolve) {
    var w = document.createElement('div');
    w.className = 'fk-browser fk-opening';
    w.addEventListener('animationend', function onOpen(e) {
      if (e.animationName !== 'fkSlideFromDown') return;
      w.removeEventListener('animationend', onOpen);
      w.classList.remove('fk-opening');
    });
    w.innerHTML =
      '<div class="fk-btop"><div class="fk-burl">' +
      '  <span class="fk-bssl"></span><span class="fk-bttl"></span>' +
      '</div></div>' +
      '<div class="fk-bprog"><div class="fk-bfill"></div></div>' +
      '<iframe></iframe>' +
      '<div class="fk-bnav">' +
      '  <div class="fk-bbtn fk-bx"><span class="fk-bicon" data-icon="cancel"></span></div>' +
      '  <div class="fk-bbtn fk-bsnd"><span class="fk-bicon" data-icon="sound-max"></span></div>' +
      '</div>' +
      '<div class="fk-scind"><div class="sc top"></div><div class="sc left"></div>' +
      '<div class="sc right"></div><div class="sc bottom"></div></div>' +
      '<div class="fk-vol"><div class="fk-vtitle">MEDIA</div><div class="fk-vbody">' +
      '<div class="fk-vcircle"><i class="fk-vicon" data-icon="sound-max"></i>' +
      '<span class="fk-vnum"></span></div><div class="fk-vlabel"></div></div></div>';
    document.body.appendChild(w);
    var ssl = w.querySelector('.fk-bssl'), ttl = w.querySelector('.fk-bttl');
    var prog = w.querySelector('.fk-bprog'), fill = w.querySelector('.fk-bfill');
    var frame = w.querySelector('iframe'), xBtn = w.querySelector('.fk-bx');
    ttl.textContent = 'accounts.google.com'; // _bwDomain(url), title arrives later

    // ── MEDIA volume overlay: verbatim _bwVolOpen/_bwVolRender/_bwVolAdj ──
    var MEDIA_VOL_MAX = 15, mediaVolIdx = 8, volTimer = null;
    var volOv = w.querySelector('.fk-vol'), volCircle = w.querySelector('.fk-vcircle');
    var volIcon = w.querySelector('.fk-vicon'), volNum = w.querySelector('.fk-vnum');
    var volLabel = w.querySelector('.fk-vlabel');
    function volOpen() { volOv.classList.add('visible'); volRender(); }
    function volClose() {
      volOv.classList.remove('visible');
      if (volTimer) { clearTimeout(volTimer); volTimer = null; }
    }
    function volIsOpen() { return volOv.classList.contains('visible'); }
    function volRender() {
      if (mediaVolIdx === 0) {
        volCircle.style.width = volCircle.style.height = '6rem';
        volIcon.style.display = '';
        volIcon.dataset.icon = 'mute-32px';
        volNum.style.display = 'none';
        volLabel.textContent = 'Silent';
      } else {
        // level 1 → 7rem, level 15 → 21rem (1rem per step, always > silent's 6rem)
        var size = (mediaVolIdx + 6) + 'rem';
        volCircle.style.width = volCircle.style.height = size;
        volIcon.style.display = 'none';
        volNum.style.display = 'inline';
        volNum.textContent = mediaVolIdx + '/' + MEDIA_VOL_MAX;
        volLabel.textContent = '';
      }
      if (volTimer) clearTimeout(volTimer);
      volTimer = setTimeout(volClose, 3000);
    }
    function volAdj(delta) {
      mediaVolIdx = Math.max(0, Math.min(MEDIA_VOL_MAX, mediaVolIdx + delta));
      volRender();
    }

    // ── virtual cursor: verbatim _bwCursor* from the simulator ─────────
    // The proxy's injected script draws the arrow (bw-cursor) and clicks the
    // element under it (bw-click) — same channel the sim's browser uses.
    var curX = 0, curY = 0, curActive = false, curInit = false;
    var CUR_STEP = 6, CUR_EDGE = 4, CUR_SZ = 26;
    function curDims() {
      var tb = w.querySelector('.fk-btop');
      var W = w.clientWidth || 240;
      var H = (w.clientHeight || 320) - ((tb && tb.offsetHeight) || 24);
      return { W: W, H: H };
    }
    function curCoords() { var z = bwZoom || 1; return { cx: curX / z, cy: curY / z, sz: CUR_SZ / z }; }
    function curPush(show) {
      var c = curCoords();
      try { frame.contentWindow.postMessage({ type: 'bw-cursor', x: c.cx, y: c.cy, sz: c.sz, show: !!show }, '*'); } catch (e) {}
    }
    function curShow() {
      if (!curInit) {
        var d = curDims();
        curX = Math.round(d.W / 2); curY = Math.round(d.H / 2);
        curInit = true;
      }
      curActive = true;
      curPush(true);
    }
    function scrollDir(dir) { // _bwScrollBy: 10px, incl. horizontal for edge-scroll
      var S = 10;
      var dx = dir === 'left' ? -S : dir === 'right' ? S : 0;
      var dy = dir === 'up' ? -S : dir === 'down' ? S : 0;
      try { frame.contentWindow.postMessage({ type: 'bw-scroll-by', dx: dx, dy: dy }, '*'); } catch (e) {}
    }
    function curMove(dir) {
      var d = curDims();
      var MAXX = d.W - CUR_SZ, MAXY = d.H - CUR_SZ;
      // step scales with zoom, cursor size unchanged (sim comment)
      var step = Math.max(2, Math.round(CUR_STEP * bwZoom));
      var scroll = null;
      if (dir === 'left') { curX -= step; if (curX <= CUR_EDGE) { curX = CUR_EDGE; scroll = 'left'; } }
      if (dir === 'right') { curX += step; if (curX >= MAXX) { curX = MAXX; scroll = 'right'; } }
      if (dir === 'up') { curY -= step; if (curY <= CUR_EDGE) { curY = CUR_EDGE; scroll = 'up'; } }
      if (dir === 'down') { curY += step; if (curY >= MAXY) { curY = MAXY; scroll = 'down'; } }
      if (scroll) scrollDir(scroll);
      curPush(true);
    }
    function curClick() {
      if (!curActive) return;
      var c = curCoords();
      try { frame.contentWindow.postMessage({ type: 'bw-click', x: c.cx, y: c.cy }, '*'); } catch (e) {}
      // return keyboard focus to us so arrows keep driving the cursor
      setTimeout(function () { try { frame.blur(); } catch (e) {} }, 0);
    }

    // ── scroll mode (key 5) + zoom (1/3) + jump (2/0): verbatim bwWebKey ──
    var scrollMode = false;
    var scInd = w.querySelector('.fk-scind');
    function toggleScrollMode() {
      scrollMode = !scrollMode;
      scInd.classList.toggle('visible', scrollMode);
      // scroll mode hides the virtual cursor; cursor mode hides the arrows
      if (scrollMode) { curActive = false; curPush(false); }
      else curShow();
    }
    function scrollTo(pos) {
      try { frame.contentWindow.postMessage({ type: 'bw-scroll', dir: pos }, '*'); } catch (e) {}
    }
    function webKey(k) {
      if (volIsOpen()) return;
      if (k === '5') { toggleScrollMode(); return; }
      if (k === '2') { scrollTo('top'); return; }
      if (k === '0') { scrollTo('bottom'); return; }
      var zoomed = false;
      if (k === '1') { bwZoom = Math.max(0.5, +(bwZoom - 0.1).toFixed(1)); applyZoom(); zoomed = true; }
      if (k === '3') { bwZoom = Math.min(3.0, +(bwZoom + 0.1).toFixed(1)); applyZoom(); zoomed = true; }
      // re-draw the cursor so it recomputes its counter-scaled size
      if (zoomed && curActive) { setTimeout(function () { curPush(true); }, 0); }
    }

    // ── progress: verbatim _bwProgressStart/_bwProgressEnd ────────────
    function progressStart() {
      prog.classList.add('bw-p-active');
      fill._pOn = true;
      var onEnd = function () {
        if (!fill._pOn) return;
        if (fill.classList.contains('bw-p-in')) { fill.classList.remove('bw-p-in'); void fill.offsetWidth; fill.classList.add('bw-p-out'); }
        else { fill.classList.remove('bw-p-out'); void fill.offsetWidth; fill.classList.add('bw-p-in'); }
      };
      fill._pEnd = onEnd;
      fill.addEventListener('animationend', onEnd);
      fill.classList.remove('bw-p-in', 'bw-p-out');
      void fill.offsetWidth;
      fill.classList.add('bw-p-in');
    }
    function progressEnd() {
      fill._pOn = false;
      if (fill._pEnd) { fill.removeEventListener('animationend', fill._pEnd); fill._pEnd = null; }
      fill.classList.remove('bw-p-in', 'bw-p-out');
      prog.classList.remove('bw-p-active');
    }

    // ── zoom 0.7 like openBwWebView (_bwZoomFallback) ─────────────────
    var bwZoom = 0.7;
    function applyZoom() {
      if (!frame._baseH) frame._baseH = frame.offsetHeight;
      frame.style.transformOrigin = '0 0';
      frame.style.transform = 'scale(' + bwZoom + ')';
      frame.style.flex = 'none';
      frame.style.width = (100 / bwZoom) + '%';
      frame.style.height = (frame._baseH / bwZoom) + 'px';
    }

    function cleanup() {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onSwallow, true);
      window.removeEventListener('keypress', onSwallow, true);
      window.removeEventListener('message', onMsg);
      w.remove();
    }
    var closing = false;
    function cancel() {
      if (closing) return;
      closing = true;
      // slide the window down (system slideToDown), then tear down
      w.classList.remove('fk-opening');
      w.classList.add('fk-closing');
      var fallback = setTimeout(done, 400); // in case animation never fires
      function done() { clearTimeout(fallback); cleanup(); resolve(false); }
      w.addEventListener('animationend', function (e) {
        if (e.animationName === 'fkSlideToDown') done();
      });
    }
    // proxied pages post bw-nav-start / bw-title exactly like the sim browser
    function onMsg(e) {
      if (!e.data) return;
      if (e.data.type === 'bw-nav-start') { progressStart(); ssl.textContent = ''; return; }
      if (e.data.type === 'bw-title') {
        if (e.data.title) ttl.textContent = String(e.data.title).trim();
        progressEnd();
        ssl.textContent = 'lock';
        if (curActive) curPush(true); // new document — redraw the cursor
      }
    }
    function onSwallow(e) { e.stopImmediatePropagation(); }
    // glide scrolling, verbatim _bwScrollBy: 10px per keydown, key-repeat
    // giving the continuous glide; the proxy's injected script services
    // bw-scroll-by cross-origin
    function scrollBy(dy) {
      try { frame.contentWindow.postMessage({ type: 'bw-scroll-by', dx: 0, dy: dy }, '*'); } catch (e) {}
    }
    function onKey(e) {
      var nav = ['SoftLeft', 'Escape', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Enter', 'Accept', '0', '1', '2', '3', '5'];
      if (nav.indexOf(e.key) === -1) return;
      // volume overlay showing: arrows adjust, close keys dismiss it only
      if (volIsOpen()) {
        e.stopImmediatePropagation(); e.preventDefault();
        if (e.key === 'ArrowUp') volAdj(1);
        else if (e.key === 'ArrowDown') volAdj(-1);
        else if (['ArrowLeft', 'ArrowRight', 'Enter', 'Accept', '0', '1', '2', '3', '5'].indexOf(e.key) === -1) volClose();
        return;
      }
      // number keys: 1/3 zoom, 2/0 jump top/bottom, 5 scroll mode (bwWebKey) —
      // unless the user is typing in one of the page's fields
      if ('01235'.indexOf(e.key) !== -1) {
        var at = document.activeElement;
        if (at && at.tagName === 'IFRAME') return;
        e.stopImmediatePropagation(); e.preventDefault();
        webKey(e.key);
        return;
      }
      // arrows: scroll mode glides the page; cursor mode moves the arrow
      // (page auto-scrolls at the edges) — like the sim's browser
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.stopImmediatePropagation(); e.preventDefault();
        var dir = e.key === 'ArrowUp' ? 'up' : e.key === 'ArrowDown' ? 'down' : e.key === 'ArrowLeft' ? 'left' : 'right';
        if (scrollMode) { scrollDir(dir); return; }
        if (!curActive) curShow();
        curMove(dir);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Accept') {
        // let the page have Enter while typing in one of its fields
        var af = document.activeElement;
        if (af && af.tagName === 'IFRAME') return;
        e.stopImmediatePropagation(); e.preventDefault();
        if (!e.repeat) curClick();
        return;
      }
      var ae = document.activeElement;
      if (e.key === 'Backspace' && ae && ae.tagName === 'IFRAME') return; // typing in page
      e.stopImmediatePropagation(); e.preventDefault();
      cancel();
    }
    frame.addEventListener('load', function () {
      progressEnd();
      ssl.textContent = 'lock'; // gaia-icons ligature, like #bw-ssl-icon
      applyZoom();
      curShow(); // sim shows the virtual cursor once the page is in
    });
    progressStart();
    frame.src = BW_WEB_PROXY + '?url=' + encodeURIComponent(GOOGLE_OAUTH_URL);
    xBtn.addEventListener('mousedown', function (e) { e.preventDefault(); cancel(); });
    w.querySelector('.fk-bsnd').addEventListener('mousedown', function (e) {
      e.preventDefault();
      if (volIsOpen()) volClose(); else volOpen();
    });
    window.addEventListener('message', onMsg);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onSwallow, true);
    window.addEventListener('keypress', onSwallow, true);
  }
  function runFakeLogin(kind, extraInfo) {
    var t = (extraInfo && extraInfo.loginType) || kind;
    if (kind === 'kaiaccount') return t === 'email' ? loginEmail() : loginPhone();
    if (kind === 'phone') return loginPhone();
    if (kind === 'email') return loginEmail();
    if (kind === 'google') return addGoogle();
    return Promise.resolve(false); // activesync not faked
  }

  // Account Info → Options → Change password (activity showOtherPage/changePassword)
  function changePasswordForm() {
    return showForm({
      title: 'Change Password', variant: 'kaios', lskLabel: 'Cancel', rskLabel: 'Next',
      intro: 'Enter your current password and set a new password.',
      fields: [
        { key: 'current', label: 'Password', type: 'password', placeholder: 'Password' },
        { key: 'newpw', label: 'New Password', type: 'password', placeholder: 'Password' },
        { key: 'confirm', label: 'Confirm Password', type: 'password', placeholder: 'Password' }
      ],
      validate: function (v) { return v.newpw === v.confirm ? null : 'confirm'; }
    }).then(function (v) { return v ? { success: true } : null; });
  }

  // Accounts → Anti-theft Off (and other checkPassword flows): password prompt.
  function acctLabel() {
    var a = accountsOf(['kaiaccount'])[0];
    if (!a) return '';
    return (a.userData && (a.userData.email || a.userData.phone)) || a.accountId || '';
  }
  function checkPasswordForm(args) {
    var antiTheft = Array.isArray(args) && args.indexOf('disableAntitheft') !== -1;
    var acct = acctLabel();
    var fields = [];
    if (acct) fields.push({ key: 'acct', type: 'display', label: 'Your Account', value: acct });
    fields.push({ key: 'password', label: 'Password', type: 'password', placeholder: 'Password' });
    return showForm({
      title: antiTheft ? 'Anti-Theft Enabled' : 'Enter Password', variant: 'kaios', rskLabel: 'Next',
      intro: antiTheft
        ? 'Anti-theft is enabled. Enter your password to disable anti-theft and sign out.'
        : 'Enter your password to continue.',
      fields: fields
    }).then(function (v) { return v ? { result: 'success' } : null; });
  }

  // ── AccountHelper overrides ──────────────────────────────────────────
  function patchAccountHelper() {
    var A = window.AccountHelper;
    if (!A || A.__kaiFakePatched) { return void setTimeout(patchAccountHelper, 150); }
    A.getAccountInfo = function (typeArray) { return Promise.resolve(accountsOf(typeArray || [])); };
    A.showLoginPage = function (type) { return runFakeLogin(type); };
    // account_helper's own showOtherPage is the createAccount flow
    A.showOtherPage = function () { return createAccountFlow(); };
    A.refreshAccount = function () {};
    A.decryptKey = function (x) { return Promise.resolve(x); };
    try {
      Object.defineProperty(A, 'kaiAccountLogin', {
        configurable: true, get: function () { return accountsOf(['kaiaccount']).length > 0; }
      });
      Object.defineProperty(A, 'kaiAccountInfo', {
        configurable: true, get: function () { return accountsOf(['kaiaccount'])[0] || { userData: {} }; }
      });
      Object.defineProperty(A, 'publicKey', { configurable: true, get: function () { return 'fake-key'; } });
    } catch (e) {}
    A.__kaiFakePatched = true;
  }
  patchAccountHelper();

  // utils.js's ConnectionHelper treats anything that isn't wifi/cellular as
  // offline — on the desktop that's ethernet, so the account panels showed
  // "no network" dialogs and fired offline-dialog activities. Always online.
  (function patchConnection() {
    var C = window.ConnectionHelper;
    if (!C) return void setTimeout(patchConnection, 200);
    C.isOffline = function () { return false; };
  })();

  // ── service the `account-manager` web-activity ───────────────────────
  // add_account_list (Google) and the panels' Options/anti-theft actions drive
  // the activity directly, so intercept it too. Wrap whatever WebActivity is
  // already installed (activity-ui.js's wallpaper handler).
  function installActivityHook() {
    var Orig = window.WebActivity;
    function WebActivity(name, data) { this.name = name; this.data = data || {}; }
    WebActivity.prototype.start = function () {
      if (this.name === 'account-manager') {
        var d = this.data || {};
        if (d.action === 'showLoginPage') {
          return runFakeLogin(d.authenticatorId, d.extraInfo).then(function (ok) {
            if (ok) return { success: true };
            // Google: after the browser window slides away, the Add Account
            // panel's cyan bar keeps loading ~3s before the Google/ActiveSync
            // list returns (the panel shows progress until we settle).
            if (d.authenticatorId === 'google') {
              return new Promise(function (_, reject) {
                setTimeout(function () { reject(new Error('user cancel')); }, 3000);
              });
            }
            return Promise.reject(new Error('user cancel'));
          });
        }
        if (d.action === 'getAccounts') return Promise.resolve(accountsOf(['kaiaccount', 'google', 'activesync']));
        if (d.action === 'revokeCredential') { // Sign out / remove account
          // Device flow: with anti-theft on, sign-out first demands the
          // password ("Anti-Theft Enabled"), then shows "Signing out…".
          var getAT = (window.__kaiSettings && window.__kaiSettings.get)
            ? window.__kaiSettings.get('antitheft.enabled') : Promise.resolve(false);
          return Promise.resolve(getAT).then(function (at) {
            at = (at === true || at === 'true') && d.authenticatorId === 'kaiaccount';
            var gate = at ? checkPasswordForm(['disableAntitheft']) : Promise.resolve({ result: 'success' });
            return gate.then(function (r) {
              if (!r) return Promise.reject(new Error('cancel'));
              return showProgress(at ? 'Anti-Theft Enabled' : 'Sign Out', 'Signing out...').then(function (ok) {
                if (!ok) return Promise.reject(new Error('cancel'));
                removeAccounts(d.authenticatorId, d.account && d.account.accountId);
                if (at && window.__kaiSettings) {
                  try { window.__kaiSettings.set({ 'antitheft.enabled': false }); } catch (e) {}
                }
                return { success: true };
              });
            });
          });
        }
        if (d.action === 'showOtherPage') {
          // Reject on cancel so callers (change-password toast, anti-theft
          // disable) don't treat a dismissed dialog as success.
          if (d.flow === 'changePassword') {
            return changePasswordForm().then(function (r) { return r || Promise.reject(new Error('cancel')); });
          }
          if (d.flow === 'checkPassword') {
            return checkPasswordForm(d.args).then(function (r) { return r || Promise.reject(new Error('cancel')); });
          }
          if (d.flow === 'createAccount') {
            return createAccountFlow().then(function (ok) {
              return ok ? { success: true } : Promise.reject(new Error('cancel'));
            });
          }
        }
        return Promise.resolve({ result: 'success', success: true });
      }
      if (Orig) return new Orig(this.name, this.data).start();
      return Promise.reject(new Error('NO_PROVIDER: ' + this.name));
    };
    WebActivity.prototype.cancel = function () {};
    window.WebActivity = WebActivity;
  }
  if (window.WebActivity) installActivityHook();
  else setTimeout(installActivityHook, 0);
})();
