// select-ui shim — replaces the browser's native <select> popup with the REAL
// KaiOS system "Value Selector" (markup + CSS lifted verbatim from
// system/index.html's #value-selector-template and
// system/style/value_selector/value_selector.css — see server.js's injected
// <link> for that stylesheet). The real ValueSelector lives inside the System
// app's AppWindow/BaseUI framework, which we don't have here, so this is a
// small standalone re-implementation of just the interaction: open on
// select/click, arrow-key focus, Enter confirms (sets select.value + fires a
// normal change event so the app's own <select> handlers work unmodified),
// Backspace cancels. Settings source is untouched.
(function () {
  var overlay = null, list = null, header = null;
  var activeSelect = null, focusIndex = 0, optionEls = [];

  // More information → IMEI / ICCID. With no SIM the app hides these rows
  // outright (loadImei / loadIccId bail on !hasValidCard). Show them with an
  // honest "Not available" value instead — without inventing a SIM card, which
  // would also unlock SIM manager / Mobile network & data.
  function showAsUnavailable(rowSel, valueSel) {
    var row = document.querySelector(rowSel);
    if (!row) return;
    var small = row.querySelector(valueSel);
    if (!small) return;
    if (row.hidden) row.hidden = false;
    if (!small.firstElementChild) {
      var span = document.createElement('span');
      span.setAttribute('data-l10n-id', 'unavailable'); // l10n → "Not available"
      small.appendChild(span);
    }
  }
  function fixDeviceIdRows() {
    showAsUnavailable('.list-imeis', '.deviceInfo-imeis');
    showAsUnavailable('.list-iccids', '.deviceInfo-iccids');
    // Storage tab → System: the sim can't know the platform partition size
    // (total − sdcard − apps is meaningless here and the formatter blanks it).
    // Show "Unknown", per request.
    var sys = document.getElementById('system-storage-desc');
    if (sys && !sys.textContent) sys.textContent = 'Unknown';
    // Developer panel hides most of itself on 'user' builds: the Graphics /
    // Window management / Debug section headers + lists (buildType check) plus a
    // few individual rows gated on device features (Remote debugging over Wi-Fi,
    // Software home button). Un-hide everything under #developer so the full,
    // grouped menu shows regardless of what the running build reports.
    var dev = document.querySelector('section#developer');
    if (dev) {
      // Un-hide everything the panel gates off: the section-title <h2>s
      // (#graphics-settings-header etc. — the group dividers), their <ul>s and
      // individual rows. On 'user' builds the titles are hidden too, which left
      // the rows showing but with no group separators.
      var hid = dev.querySelectorAll('.hidden');
      for (var i = 0; i < hid.length; i++) hid[i].classList.remove('hidden');
      // Software home button / home gesture are hidden with an inline
      // display:none (ScreenLayout has no hardware-home / tiny layout here), not
      // a class — clear that too.
      var shb = dev.querySelector('.software-home-button');
      if (shb && shb.style.display === 'none') shb.style.display = '';
    }
  }

  // Rows marked .none-select aren't actionable, so the softkey bar must not
  // offer SELECT on them. The app wires that to each row's 'focus' event, but a
  // panel's first row is already focused before those listeners are attached, so
  // the event never fires for it and SELECT stays up (e.g. Battery → Current
  // level). Reconcile: if the focused row is .none-select, hide the softkey.
  // Moving to any other row fires a real focus event and the app re-shows it.
  // #fakeSoftKeyPanel (baked into index.html) is the always-on grey softkey bar;
  // the real #softkeyPanel overlays it with labels and hides when a row offers
  // no action. At boot the skeleton paints a cached "SELECT" that startup.js is
  // supposed to blank — it doesn't here, so that stale label shows through
  // whenever the real bar hides. Blank it (keep the bar), as intended.
  function clearBootSoftkeyLabel() {
    var fake = document.getElementById('fakeSoftKeyPanel');
    if (!fake || !document.getElementById('softkeyPanel')) return;
    // Once the REAL SoftkeyPanel exists it carries the live labels
    // (Select | Options…). The boot skeleton stacked on top of it and masked
    // the right key — hide it outright instead of just blanking its centre.
    if (fake.style.display !== 'none') fake.style.display = 'none';
  }

  // Safety net: the app hides the softkey labels for .none-select rows via each
  // row's 'focus' event, but a panel's first row is already focused before those
  // listeners attach, so the event never fires for it. Reconcile here.
  function hideSoftkeyOnNoneSelect() {
    var el = document.querySelector('.focus');
    if (!el || !el.classList.contains('none-select')) return;
    // KaiOS-account info rows are none-select yet DO carry softkeys
    // (SELECT | Options with Change password / Sign out) — leave them alone.
    if (el.closest && el.closest('#kaios_account_login')) return;
    var bar = document.getElementById('softkeyPanel'); // the real, label-bearing bar
    if (bar && bar.classList.contains('visible') && window.SettingsSoftkey) {
      try { SettingsSoftkey.hide(); } catch (e) {}
    }
  }

  // Keep every range slider's fill (--range-pct) in sync with its value. The
  // app updates slider values programmatically (input.value = n) which fires no
  // event, so poll on rAF — it only touches the few sliders currently in the DOM.
  var rangeLoopRunning = false;
  function startRangeFillLoop() {
    if (rangeLoopRunning) return;
    rangeLoopRunning = true;
    (function tick() {
      var inputs = document.querySelectorAll('input[type=range]');
      for (var i = 0; i < inputs.length; i++) {
        var el = inputs[i];
        var min = parseFloat(el.min) || 0, max = parseFloat(el.max), v = parseFloat(el.value) || 0;
        if (!(max > min)) max = min + 100;
        var pct = ((v - min) / (max - min)) * 100;
        el.style.setProperty('--range-pct', (pct < 0 ? 0 : pct > 100 ? 100 : pct) + '%');
      }
      fixDeviceIdRows();
      clearBootSoftkeyLabel();
      hideSoftkeyOnNoneSelect();
      requestAnimationFrame(tick);
    })();
  }

  function build() {
    if (overlay) return; // idempotent — DOMContentLoaded and a pre-ready open() could both call this
    // The real CSS sets a static rgba(0,0,0,.85) scrim; override it with a
    // fade-in to rgba(0,0,0,.88) instead of popping in instantly.
    var style = document.createElement('style');
    style.textContent =
      // Sit the scrim just BELOW the softkey bar (z-index 99999) but above the
      // page content, so the content dims while the softkey bar stays bright and
      // on top (like the real Option Menu). Relying on the fixed-vs-absolute
      // compositing order is not reliable, so pick the z-index deliberately.
      '.value-selector{z-index:99998!important;background-color:rgba(0,0,0,0)!important;transition:background-color .17s ease}' +
      '.value-selector.showing{background-color:rgba(0,0,0,.88)!important}' +
      // A <select> that has never held focus treats its first mousedown as a
      // combined focus+open gesture that Chromium's native popup can't be
      // reliably preventDefault()-ed out of. Make the select unclickable
      // (pointer-events:none) so the click never reaches it at all — the
      // popup can never trigger — and handle all interaction ourselves via
      // the parent row instead. The element still works as a plain data
      // holder (value/selectedIndex/change event) and keyboard focus target.
      // Keep NATIVE select rendering (its selected text sits correctly in the
      // box — appearance:none paints it too high and clips it). Hide the native
      // dropdown arrow with clip-path, which is paint-only: the arrow lives in
      // the right ~1.3rem of the control, so clip that strip away. Unlike
      // widening the control, this doesn't grow the layout (which had been
      // pushing full-width buttons like "Add Account" off the right edge).
      'select{pointer-events:none!important;clip-path:inset(0 1.3rem 0 0)!important}' +
      // Gecko→Chromium compat: Gaia uses `-moz-padding-start` (ignored by
      // Chromium) to cancel a negative margin-left on radio/switch labels. Without
      // it the text is shifted left and clipped ("On" → "n"). Re-add the padding
      // with the standard logical property.
      'label.pack-checkbox span,label.pack-checkbox-large span,label.pack-radio span,label.pack-radio-large span,label.pack-switch span,label.pack-switch-large span{padding-inline-start:2rem}' +
      // Long check/radio labels (Do Not Track, About KaiOS consents, ...) wrap
      // to several lines and would run beneath the glyph, which is painted in
      // the right ~3.2rem of the row. Reserve that strip on every such label so
      // wrapped text clears it; short labels ("On"/"Off") are unaffected.
      'label.pack-checkbox span,label.pack-checkbox-large span,label.pack-radio span,label.pack-radio-large span{display:block;padding-inline-end:4rem;box-sizing:border-box}' +
      // Application/Media storage rows: the colour swatch is absolutely
      // positioned over the row and the app name is indented past it with
      // `-moz-padding-start` — ignored here, so the swatch sat on the name.
      '#application_storage .stackedbar-color-label+a,#media_storage .stackedbar-color-label+a{padding-inline-start:2.6rem}' +
      // The scanning bar: progress_activity.css paints an animated stripe as
      // the element BACKGROUND, but Chromium's native <progress> chrome covers
      // backgrounds entirely — drop appearance so the Gaia style shows.
      'progress.pack-activity{-webkit-appearance:none!important;appearance:none!important}' +
      'progress.pack-activity::-webkit-progress-bar{background:transparent}' +
      'progress.pack-activity::-webkit-progress-value{background:transparent}' +
      // No SD card in the sim — keep Media's "Format SD card" button away even
      // when the panel un-hides it (our storage stub reports "available").
      '#media-format{display:none!important}' +
      // Settings/panel headers in semibold 600.
      'h1,.h1{font-weight:600!important}' +
      // Gecko→Chromium compat: Gaia sizes list rows with `-moz-box-sizing:
      // border-box` (min-height:6rem MEANT to include the 1rem padding).
      // Chromium ignores the prefixed property and falls back to content-box, so
      // every row is 6rem + 2rem padding = too tall. Restore border-box.
      'ul li,ul li>a,ul li>label{box-sizing:border-box!important}' +
      // Rows a touch taller than Gaia's 6rem for a roomier feel (per request).
      'ul li:not(.button){min-height:7rem!important}' +
      // Gecko→Chromium compat: button rows (li.button > button, e.g. "Add
      // Account", "Clean Up Storage") shrink-to-fit in Chromium so the li grows
      // wider than its <ul> and the button's border is clipped by the viewport.
      // Pin them to block/full width so the button stays centred inside the row.
      'li.button{display:block!important;width:100%!important;box-sizing:border-box!important}' +
      // …but never resurrect button rows the app hid (Resend Email / Send SMS
      // in Account Info carry .hidden — display:block!important above was
      // overriding their display:none)
      'li.button.hidden{display:none!important}' +
      'li>button{width:100%!important;max-width:100%!important;box-sizing:border-box!important;margin-left:0!important;margin-right:0!important}' +
      // Range sliders (volume, brightness): Gaia styles them with -moz-range-*
      // pseudo-elements that Chromium ignores, so they fall back to the default
      // browser slider. Re-create the KaiOS look with -webkit-slider-* : a thin
      // 0.6rem track, highlight-coloured fill (driven by --range-pct, updated in
      // JS since programmatic value changes fire no event), and a 2.4rem round
      // thumb with a white ring. Focused rows invert fill/thumb like the real app.
      'input[type=range]{-webkit-appearance:none!important;appearance:none!important;background:transparent!important;border:none!important;height:3rem;width:100%;margin:0;opacity:1!important}' +
      'input[type=range]::-webkit-slider-runnable-track{height:.6rem;border-radius:.3rem;background:linear-gradient(to right,var(--highlight-color) 0,var(--highlight-color) var(--range-pct,50%),var(--color-gs20) var(--range-pct,50%),var(--color-gs20) 100%)}' +
      'input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:2.4rem;height:2.4rem;margin-top:-.9rem;border:solid .3rem var(--color-gs00);border-radius:2.7rem;background-color:var(--highlight-color);box-sizing:border-box}' +
      'li.focus input[type=range]::-webkit-slider-runnable-track,.focus input[type=range]::-webkit-slider-runnable-track{background:linear-gradient(to right,var(--color-gs00) 0,var(--color-gs00) var(--range-pct,50%),var(--color-gs20) var(--range-pct,50%),var(--color-gs20) 100%)}' +
      'li.focus input[type=range]::-webkit-slider-thumb,.focus input[type=range]::-webkit-slider-thumb{border-color:var(--highlight-color);background-color:var(--color-gs00)}' +
      // Developer HUD colour-key swatches: Gaia offsets the little colour bar
      // into the label's left gutter with `-moz-margin-start:-0.8rem` (ignored
      // by Chromium), so the absolutely-positioned :before landed on top of the
      // text ("Frames per second"). Anchor it to the span and drop it into the
      // 2rem start-padding gutter, vertically centred.
      // Extra start-padding so the label text clears the colour bar: the span's
      // negative margin cancels the generic 2rem, leaving the glyph at the very
      // left (x≈10) right under the swatch — 4rem pushes it to ~x=30, past the
      // bar's right edge (~x=22).
      'label.pack-checkbox>span.color-preview{position:relative;padding-inline-start:4rem!important}' +
      // span carries a negative margin-left (≈-1rem) so its origin sits left of
      // the label's visible edge; a small inset lands the swatch there and the
      // label clips it. Push it past the label edge (~2.4rem from span origin)
      // into the gutter before the text, and make it a clear little bar.
      'label.pack-checkbox>span.color-preview:before{inset-inline-start:2.4rem!important;margin:0!important;top:50%!important;margin-top:-.9rem!important;height:1.8rem!important;width:.8rem!important;border-radius:.15rem}';
    document.head.appendChild(style);
    startRangeFillLoop();

    overlay = document.createElement('div');
    overlay.className = 'value-selector';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div role="dialog" data-type="value-selector" class="value-selector-select-option-popup">' +
      '  <div class="h1 value-selector-header" id="value-selector-header">Select</div>' +
      '  <section class="value-selector-container">' +
      '    <ol class="value-selector-options-container valueSelector_single" role="listbox"></ol>' +
      '  </section>' +
      '</div>';
    document.body.appendChild(overlay);
    header = overlay.querySelector('.value-selector-header');
    list = overlay.querySelector('.value-selector-options-container');
  }

  function labelFor(text) { return { l10n: (window.navigator.mozL10n && navigator.mozL10n.get('select')) || 'Select' }; }

  function renderOptions(select) {
    list.innerHTML = '';
    optionEls = [];
    var opts = Array.prototype.slice.call(select.options);
    focusIndex = Math.max(0, opts.findIndex(function (o) { return o.selected; }));
    opts.forEach(function (opt, i) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('dir', 'auto');
      li.dataset.optionIndex = String(i);
      li.dataset.selected = opt.selected ? 'true' : 'false';
      if (i === focusIndex) li.classList.add('focus');
      var label = document.createElement('label');
      label.setAttribute('role', 'presentation');
      var span = document.createElement('span');
      span.textContent = opt.textContent;
      label.appendChild(span);
      li.appendChild(label);
      li.addEventListener('mousedown', function (e) { e.preventDefault(); focusIndex = i; refreshFocus(); confirm(); });
      list.appendChild(li);
      optionEls.push(li);
    });
    if (optionEls[focusIndex]) optionEls[focusIndex].scrollIntoView({ block: 'nearest' });
  }

  function refreshFocus() {
    optionEls.forEach(function (li, i) { li.classList.toggle('focus', i === focusIndex); });
    if (optionEls[focusIndex]) optionEls[focusIndex].scrollIntoView({ block: 'nearest' });
  }

  function open(select) {
    if (!overlay) build();
    activeSelect = select;
    var l10nLabel = (window.navigator.mozL10n && navigator.mozL10n.get('select')) || '';
    header.textContent = l10nLabel || 'Select';
    renderOptions(select);
    overlay.classList.remove('showing');
    overlay.hidden = false;
    void overlay.offsetWidth; // commit the transparent starting state before fading in
    requestAnimationFrame(function () { overlay.classList.add('showing'); });
    window.addEventListener('keydown', onKey, true);
  }

  function close() {
    overlay.hidden = true;
    overlay.classList.remove('showing');
    window.removeEventListener('keydown', onKey, true);
    if (activeSelect) { try { activeSelect.blur(); } catch (e) {} }
    activeSelect = null;
  }

  function confirm() {
    var select = activeSelect;
    var opt = select && select.options[focusIndex];
    close();
    if (!select || !opt) return;
    if (select.selectedIndex !== focusIndex) {
      select.selectedIndex = focusIndex;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function onKey(e) {
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); focusIndex = (focusIndex - 1 + optionEls.length) % optionEls.length; refreshFocus(); break;
      case 'ArrowDown': e.preventDefault(); focusIndex = (focusIndex + 1) % optionEls.length; refreshFocus(); break;
      case 'Enter': case 'Accept': e.preventDefault(); confirm(); break;
      case 'Backspace': case 'EndCall': case 'Escape': e.preventDefault(); close(); break;
    }
    e.stopPropagation();
  }

  // Eager: install pointer-events:none for <select> before any real click can
  // hit one. The script runs right after <head> opens, so document.body may
  // not exist yet — defer if needed (the style tag itself only needs <head>,
  // which does exist, so <select> is protected from the very first paint).
  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build, { once: true });

  // Every <select> is pointer-events:none (see build()), so a click never
  // reaches it — delegate to the containing row instead. This sidesteps the
  // Chromium quirk where a never-before-focused <select>'s first mousedown is
  // a combined focus+open gesture whose native popup preventDefault() can't
  // reliably cancel (subsequent clicks, once focused, behave differently).
  // A modal (gaia-confirm dialog) is active — its confirm/cancel keys and clicks
  // must not leak through and re-open the underlying <select>. The app flags
  // this via NavigationMap.currentActivatedLength; gaia-confirm is the fallback.
  function modalOpen() {
    return (window.NavigationMap && NavigationMap.currentActivatedLength > 0) ||
      !!document.querySelector('gaia-confirm:not([hidden])');
  }
  // A row the app greyed out (aria-disabled / .none-select, e.g. Battery's
  // Power save mode while on the charger) must not open its value selector —
  // the app's own Enter handler filters with
  //   li:not([aria-disabled="true"]).focus select:not(.no-open)
  // so mirror that here.
  function selectFor(row) {
    if (!row) return null;
    if (row.getAttribute('aria-disabled') === 'true' || row.classList.contains('none-select')) return null;
    return row.querySelector('select:not(.no-open)');
  }

  // Date & Time rows are handled by datetime-ui.js (the system spinner picker).
  document.addEventListener('mousedown', function (e) {
    if (modalOpen()) return;
    var row = e.target.closest && e.target.closest('li');
    var sel = selectFor(row);
    if (sel) { e.preventDefault(); open(sel); }
  }, true);
  document.addEventListener('keydown', function (e) {
    if (overlay && !overlay.hidden) return; // let onKey (capture, added later) handle it
    if (modalOpen()) return;
    if (e.key !== 'Enter' && e.key !== 'Accept') return;
    // The app tracks D-pad focus visually (a "focus" class on the <li> row),
    // not via real DOM focus — document.activeElement is the <li>, not the
    // <select> inside it. Resolve to whichever select the user is actually on.
    var t = document.activeElement;
    var row = (t && t.classList && t.classList.contains('focus') ? t : document.querySelector('li.focus, li.focused'));
    var sel = null;
    if (t && t.tagName === 'SELECT') sel = selectFor(t.closest('li')) ? t : null;
    if (!sel) sel = selectFor(row);
    if (sel) { e.preventDefault(); open(sel); }
  }, true);
})();
