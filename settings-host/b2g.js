// b2g shim — the settings app talks to device services through navigator.b2g,
// navigator.mozPower/mozApps, and a SettingsObserver backed by the api-daemon.
// None exist in a browser. Provide localStorage-backed settings plus faked
// managers (incl. Wi-Fi & Bluetooth with sample data) so the app boots and
// panels populate. Loaded before any app script.
(function () {
  'use strict';

  // Pre-seed DeviceFeature's localStorage so it reports "ready" immediately with
  // the capabilities we want — critically, Wi-Fi certified, so the UI renders
  // "Wi-Fi" everywhere instead of "WLAN" from the very first paint (no flicker,
  // no reliance on late re-translation). Keys mirror DeviceFeature's STORAGE_MAP.
  try {
    var FEAT = {
      featureVersion: '1.0.1', isWifiCertified: 'true',
      isSupportWifiDevice: 'true', isSupportBtDevice: 'true', isSupportGpsDevice: 'true',
      isSupportVowifiDevice: 'false', isSupportVolteDevice: 'false', isSupportPrimarysimSwitch: 'false',
      isSupportRtt: 'false', isLowMemoryDevice: 'false', deviceStorageSize: String(4 * 1024 * 1024 * 1024),
      sdcardStatus: 'unavailable', isFirstTimeUseHotspot: 'false', isFirstTimeUseTethering: 'false',
      isSupportVilte: 'false', isSupportReadout: 'false', isSupportdeviceFinancing: 'false',
      // 'userdebug' (not 'user') so the Developer menu shows its full set —
      // Graphics, Window management, Debug — instead of only the Debugger row.
      buildType: 'userdebug', cdmaApn: 'false', flipDevice: 'false', isSupportDualLte: 'false',
    };
    Object.keys(FEAT).forEach(function (k) { localStorage.setItem(k, FEAT[k]); });
  } catch (e) {}

  // ── DOMRequest-like async result (b2g APIs return these) ──────────
  function req(result, err) {
    var r = { readyState: 'pending', result: undefined, error: undefined,
      onsuccess: null, onerror: null, then: function (ok, no) { return Promise.resolve(result).then(ok, no); } };
    Promise.resolve().then(function () {
      if (err) { r.readyState = 'done'; r.error = err; r.onerror && r.onerror({ target: r }); }
      else { r.readyState = 'done'; r.result = result; r.onsuccess && r.onsuccess({ target: r }); }
    });
    return r;
  }
  function P(v) { return Promise.resolve(v); }

  // ── Sticky events ──────────────────────────────────────────────────
  // The real session layer dispatches 'services-load-observer' /
  // 'services-load-complete' once a live daemon connection is up; every
  // manager module (PowerManager, TimeService, AccountManager, AppsManager,
  // ContactsManager, DeviceCapabilityManager's taskScheduler...) sits idle
  // until it hears one of these. We fake the connection, so replay these
  // events to any listener that registers even *after* we've fired them —
  // load order between lazy-loaded scripts and our shim is not guaranteed.
  var STICKY = ['services-load-observer', 'services-load-complete', 'services-init-complete'];
  var stickyFired = {};
  var _addEL = window.addEventListener.bind(window);
  window.addEventListener = function (type, cb, opts) {
    _addEL(type, cb, opts);
    if (STICKY.indexOf(type) !== -1 && stickyFired[type] && typeof cb === 'function') {
      Promise.resolve().then(function () { try { cb(new CustomEvent(type)); } catch (e) {} });
    }
  };
  var _dispatchEL = window.dispatchEvent.bind(window);
  window.dispatchEvent = function (e) { if (STICKY.indexOf(e.type) !== -1) stickyFired[e.type] = true; return _dispatchEL(e); };
  function fireSticky() { STICKY.forEach(function (t) { window.dispatchEvent(new CustomEvent(t)); }); }

  // A manager stand-in for the api-daemon RPC objects (window.api.*manager):
  // any method call resolves to a sensible default instead of hanging forever
  // (task_scheduler only proceeds once 'connected', then calls fn.apply and
  // awaits a real Promise — so these must return actual Promises, not DOMRequests).
  function genericManager(overrides) {
    var base = Object.assign({ connected: true }, overrides || {});
    return new Proxy(base, {
      get: function (t, k) {
        if (k in t) return t[k];
        if (k === 'then' || typeof k === 'symbol') return t[k];
        if (/^(add|remove)EventListener$/.test(k)) return function () {};
        return function () { return Promise.resolve(undefined); };
      }
    });
  }

  // EventTarget base so addEventListener/onX both work.
  // A plain-JS EventTarget instead of a native one (createDocumentFragment):
  // once wrapped in a Proxy (lenient/hybrid below), calling a *native*
  // addEventListener/removeEventListener/dispatchEvent with `this` = the Proxy
  // fails the browser's internal brand check ("Illegal invocation"), since the
  // proxy doesn't carry the real object's internal slots. Plain functions have
  // no such check, so they tolerate being invoked through the Proxy.
  function evt() {
    var listeners = {};
    return {
      addEventListener: function (type, cb) { (listeners[type] = listeners[type] || []).push(cb); },
      removeEventListener: function (type, cb) { if (listeners[type]) listeners[type] = listeners[type].filter(function (c) { return c !== cb; }); },
      dispatchEvent: function (e) { (listeners[(e && e.type) || ''] || []).slice().forEach(function (cb) { try { cb(e); } catch (x) {} }); return true; },
    };
  }
  // A value that is callable (→ resolved request), an EventTarget, and lenient
  // on any further property/method access. Used for unknown b2g surface so
  // chains like conn.imsHandler.addEventListener() never throw.
  function hybrid() {
    var fn = function () { return req(undefined); };
    fn.addEventListener = function () {}; fn.removeEventListener = function () {}; fn.dispatchEvent = function () { return true; };
    return new Proxy(fn, {
      get: function (t, k) {
        if (k in t) return t[k];
        if (k === 'then' || typeof k === 'symbol') return t[k];
        if (/^on[a-z]/.test(String(k))) return null;
        return hybrid();
      },
      apply: function () { return req(undefined); }
    });
  }
  // Wrap a known object so unknown props/methods fall back to hybrid() instead
  // of throwing; declared props/methods pass through unchanged.
  function lenient(obj) {
    return new Proxy(obj, {
      get: function (t, k) {
        if (k in t) return t[k];
        if (k === 'then') return undefined;
        if (typeof k === 'symbol') return t[k];
        if (/^on[a-z]/.test(String(k))) return null;
        return hybrid();
      },
      set: function (t, k, v) { t[k] = v; return true; }
    });
  }

  // ── Settings store (localStorage) with defaults + observers ───────
  var SKEY = 'kaios.settings.v2'; // v2: stores only user overrides, not a full snapshot
  var DEFAULTS = {
    'language.current': 'en-US',
    'screen.timeout': 30,
    'screen.brightness': 0.6,
    'audio.volume.content': 8, 'audio.volume.notification': 8, 'audio.volume.alarm': 8,
    'ring.enabled': true, 'vibration.enabled': true,
    'wifi.enabled': true, 'bluetooth.enabled': true,
    'airplaneMode.status': 'disabled', 'airplaneMode.enabled': false, 'nfc.enabled': false,
    'geolocation.enabled': true, 'privacy.donottrackheader.value': '-1',
    'lockscreen.notifications-preview.enabled': true,
    'locale.hour12': false,
    // Accessibility — everything off by default.
    'accessibility.colors.invert': false, 'accessibility.force_mono_audio': false,
    'accessibility.hac_mode': false, 'ui.prefers.text-size': 'normal',
    'accessibility.backlight': true, 'accessibility.captions': false,
    'keypad.vibration': false, 'tty.mode.enabled': 'off',
    // Keypad (Input Methods): without a layouts map the Input-languages panel
    // renders an empty list and its softkey updater crashes on the missing
    // first checkbox — the panel then looks frozen. Keys must be
    // KeypadHelper.DISPLAY_LANGUAGES ids.
    'keypad.layouts': {
      english: true, english_us: false, english_gb: false, french_fr: false,
      spanish_us: false, german: false, portuguese_br: false, vietnamese: false,
      hindi: false, arabic: false, indonesian: false, dutch: false,
    },
    'keypad.layouts.default': 'english', 'keypad.active-layout': 'english',
    // Per-language maps (the config panel indexes them by layout id).
    // Use predictive: off by default for every language.
    'keypad.t9-enabled': {
      english: false, english_us: false, english_gb: false, french_fr: false,
      spanish_us: false, german: false, portuguese_br: false, vietnamese: false,
      hindi: false, arabic: false, indonesian: false, dutch: false,
    },
    'keypad.wordsuggestion': { chinese_cn: true },
    'powersave.enabled': false, 'powersave.threshold': '-1', // -1 → "Never"
    // Wallpaper preview: point at the bundled default wallpaper on the shared
    // server. The URL must contain SHARD_ORIGIN so the panel uses it directly
    // (a null value crashed handleChange with `null.indexOf`).
    'wallpaper.image': 'http://shared.localhost:8081/resources/media/wallpapers/default.jpg',
    'devtools.pseudolocalization.enabled': false,
    // Accounts → Anti-theft defaults On (drives the sign-out password gate)
    'antitheft.enabled': true,
    // Developer → the "DevTools via Wi-Fi" row is gated on this (data-show-name);
    // make it visible so the full Developer Tools group shows.
    'devtools.remote.wifi.visible': true,
    'deviceinfo.software': 'KaiOS 3.0', 'deviceinfo.os': '3.0',
    // More information → "Software tag" (its row hides when this is unset).
    'deviceinfo.software_tag': 'B2G OS',
    // More information: nothing real to report for these — show "Unknown"
    // rather than a blank row.
    'deviceinfo.base_version': 'Unknown', 'deviceinfo.firmware_revision': 'Unknown',
    'deviceinfo.build_number': 'Unknown', 'deviceinfo.platform_version': 'Unknown',
    'deviceinfo.platform_build_id': 'Unknown',
    'deviceinfo.hardware': 'Simulator', 'deviceinfo.product_model': 'Kaiosrt_3.0',
    // Wireless Emergency Alerts: cmas.settings.show gates the whole alert-types
    // list; without it the panel hides Presidential/Extreme/Severe/Amber/…
    'cmas.settings.show': true,
    'cmas.presidential.enabled': true, 'cmas.extreme.enabled': true, 'cmas.severe.enabled': true,
    'cmas.amber.enabled': true, 'cmas.safety.enabled': true, 'cmas.weatest.enabled': true,
    'cmas.monthlytest.enabled': false,
  };
  // Persist ONLY the keys someone actually changed, never a full snapshot of the
  // merged store. Snapshotting freezes whatever DEFAULTS looked like at save
  // time, so later edits to a default (product model, wallpaper, powersave
  // threshold, ...) would silently never reach an existing profile.
  var overrides = (function () { try { return JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch (e) { return {}; } })();
  // Sanitise: if a stored override has a different SHAPE than today's default
  // (e.g. keypad.t9-enabled persisted as a boolean before it became a
  // per-language map), it would shadow the default forever and break the panel
  // that reads it. Drop such overrides.
  Object.keys(overrides).forEach(function (k) {
    if (k in DEFAULTS && typeof DEFAULTS[k] === 'object' && DEFAULTS[k] !== null &&
        (typeof overrides[k] !== 'object' || overrides[k] === null)) {
      delete overrides[k];
    }
  });
  var store = Object.assign({}, DEFAULTS, overrides);
  // A persisted null must not wipe out the wallpaper — the display panel does
  // value.indexOf() on it and crashes.
  if (!store['wallpaper.image']) store['wallpaper.image'] = DEFAULTS['wallpaper.image'];
  function saveStore() { try { localStorage.setItem(SKEY, JSON.stringify(overrides)); } catch (e) {} }
  var observers = {}; // key -> [cb]
  // Deliver observer callbacks ASYNCHRONOUSLY, like the real daemon (which does
  // an IPC round-trip). Several panels write a setting and only afterwards
  // finish their own bookkeeping (e.g. the volume slider sets `this.previous`
  // AFTER saveSettings returns, then relies on the change callback seeing
  // value===previous to unlock). A synchronous callback would run mid-write and
  // wedge them; deferring one tick matches production timing.
  function notify(key, val) {
    var cbs = (observers[key] || []).slice();
    setTimeout(function () { cbs.forEach(function (cb) { try { cb({ settingName: key, settingValue: val }); } catch (e) {} }); }, 0);
  }

  // Expose a settings service the shared SettingsObserver replacement uses.
  window.__kaiSettings = {
    get: function (key) { return P(store[key]); },
    getBatch: function (keys) { return P(keys.map(function (k) { return { name: k, value: store[k] }; })); },
    set: function (pairs) {
      (Array.isArray(pairs) ? pairs : [pairs]).forEach(function (p) {
        // Only fire observers when the value actually CHANGES — the daemon works
        // this way. Panels re-write settings with the same value on load (e.g. a
        // <select data-name> binding syncing itself), and an unconditional notify
        // would re-trigger their change handlers, popping confirmation dialogs
        // (Notifications) or looping. Same value in → no notification out.
        var changed = store[p.name] !== p.value;
        store[p.name] = p.value; overrides[p.name] = p.value;
        if (changed) notify(p.name, p.value);
        // No real radio to report back airplaneMode.status — simulate an
        // instant RIL ack so the toggle isn't stuck permanently disabled
        // and dependent items (data connection...) react like on a device.
        if (p.name === 'airplaneMode.enabled') {
          var status = p.value ? 'enabled' : 'disabled';
          if (store['airplaneMode.status'] !== status) {
            store['airplaneMode.status'] = status; overrides['airplaneMode.status'] = status;
            notify('airplaneMode.status', status);
          }
        }
      });
      saveStore(); return P(true);
    },
    observe: function (key, def, cb) { (observers[key] = observers[key] || []).push(cb); if (store[key] === undefined && def !== undefined) store[key] = def; },
    unobserve: function (key, cb) { observers[key] = (observers[key] || []).filter(function (c) { return c !== cb; }); },
  };

  // Classic mozSettings API (some shared code still uses it) ──────────
  navigator.mozSettings = {
    createLock: function () {
      return {
        get: function (key) { return req((function () { var o = {}; o[key] = store[key]; return o; })()); },
        set: function (obj) { for (var k in obj) { store[k] = obj[k]; overrides[k] = obj[k]; notify(k, obj[k]); } saveStore(); return req(true); },
      };
    },
    addObserver: function (key, cb) { (observers[key] = observers[key] || []).push(cb); },
    removeObserver: function (key, cb) { observers[key] = (observers[key] || []).filter(function (c) { return c !== cb; }); },
  };

  // ── Faked hardware managers ───────────────────────────────────────
  // Reactive Wi-Fi: the panel writes wifi.enabled then disables its buttons
  // until the hardware confirms via onenabled/ondisabled. With no real radio we
  // simulate that: observe wifi.enabled and fire the matching event so the
  // panel's toggle updates and re-enables (otherwise it stays stuck "off").
  var wifi = (function () {
    var w = {
      enabled: store['wifi.enabled'] !== false,
      macAddress: '02:00:00:00:00:01',
      connection: { status: 'connected', network: { ssid: 'KaiOS-Sim', security: 'WPA2', signalStrength: 92 } },
      onenabled: null, ondisabled: null, onstatuschange: null, onconnectioninfoupdate: null,
      onwifihasinternet: null, oncaptiveportallogin: null,
      setStaticIpMode: function () { return req(true); },
      getNetworks: function () { return req([
        { ssid: 'KaiOS-Sim', security: 'WPA2', signalStrength: 92, relSignalStrength: 92, connected: true, keyManagement: ['WPA-PSK'] },
        { ssid: 'Home_5G', security: 'WPA2', signalStrength: 70, relSignalStrength: 70, keyManagement: ['WPA-PSK'] },
        { ssid: 'CoffeeShop', security: '', signalStrength: 48, relSignalStrength: 48, keyManagement: [] },
      ]); },
      getKnownNetworks: function () { return req([{ ssid: 'KaiOS-Sim', security: 'WPA2' }]); },
      associate: function () { return req(true); }, forget: function () { return req(true); },
      wps: function () { return req(true); },
    };
    return lenient(w);
  })();
  // Bridge the wifi.enabled setting to the manager's hardware events.
  window.__kaiSettings.observe('wifi.enabled', true, function (e) {
    var on = e.settingValue !== false;
    wifi.enabled = on;
    var ev = { type: on ? 'enabled' : 'disabled' };
    setTimeout(function () {
      if (on && typeof wifi.onenabled === 'function') wifi.onenabled(ev);
      if (!on && typeof wifi.ondisabled === 'function') wifi.ondisabled(ev);
      if (typeof wifi.onstatuschange === 'function') wifi.onstatuschange({ status: on ? 'connected' : 'disconnected' });
    }, 30);
  });
  // Reactive Bluetooth adapter — BtContext derives its on/off from adapter.state
  // and reacts to attributechanged({attrs:['state']}) events, so enable()/
  // disable() must transition the state AND fire the event (and persist the
  // setting so re-entering the panel shows the right state).
  var bt = (function () {
    var listeners = {};
    var a = {
      address: '02:00:00:AA:BB:CC', name: 'KaiOS Simulator', discoverable: false, discovering: false,
      state: store['bluetooth.enabled'] ? 'enabled' : 'disabled',
      onattributechanged: null, ondevicepaired: null, ondeviceunpaired: null,
      addEventListener: function (t, cb) { (listeners[t] = listeners[t] || []).push(cb); },
      removeEventListener: function (t, cb) { if (listeners[t]) listeners[t] = listeners[t].filter(function (c) { return c !== cb; }); },
      getPairedDevices: function () { return a.state === 'enabled' ? [{ name: 'JBL Speaker', address: '11:22:33:44:55:66', paired: true, type: 'audio-card', cod: { majorDeviceClass: 4, majorServiceClass: 0, minorDeviceClass: 1 } }] : []; },
      startDiscovery: function () { a.discovering = true; fire('discovering'); return req(lenient(evt())); },
      stopDiscovery: function () { a.discovering = false; fire('discovering'); return req(true); },
      setDiscoverable: function (v) { a.discoverable = !!v; fire('discoverable'); return req(true); },
      setName: function (n) { a.name = String(n); fire('name'); return req(true); },
      pair: function () { return req(true); }, unpair: function () { return req(true); },
      enable: function () { return transition(true); },
      disable: function () { return transition(false); },
    };
    function fire(attr) {
      var e = { type: 'attributechanged', attrs: [attr] };
      if (typeof a.onattributechanged === 'function') { try { a.onattributechanged(e); } catch (x) {} }
      (listeners.attributechanged || []).forEach(function (cb) { try { cb(e); } catch (x) {} });
    }
    function transition(on) {
      a.state = on ? 'enabling' : 'disabling'; fire('state');
      return new Promise(function (resolve) {
        setTimeout(function () {
          a.state = on ? 'enabled' : 'disabled';
          store['bluetooth.enabled'] = on; overrides['bluetooth.enabled'] = on; notify('bluetooth.enabled', on); saveStore();
          fire('state'); resolve();
        }, 40);
      });
    }
    return lenient(a);
  })();

  // SpeakerManager — the Volume panel does `new ApiManager.SpeakerManager()`
  // (= window.SpeakerManager). Without it the whole panel throws on init and
  // the sliders never respond. A minimal stub is enough; the sliders drive the
  // audio.volume.* settings directly.
  function SpeakerManager() {
    this.speakerforced = false;
    this.forcespeaker = false;
    this.onspeakerforcedchange = null;
  }
  window.SpeakerManager = window.MozSpeakerManager = SpeakerManager;

  // Report a fixed battery instead of the host machine's, so the simulator is
  // deterministic. level=1 + charging → the app's Battery module derives the
  // state "charged" (it only says "charging" below 100%).
  (function () {
    var battery = Object.assign(evt(), { level: 1, charging: true, chargingTime: 0, dischargingTime: Infinity });
    try {
      Object.defineProperty(navigator, 'getBattery', {
        configurable: true, writable: true,
        value: function () { return Promise.resolve(battery); },
      });
    } catch (e) {}
  })();

  // Airplane mode drives the radios, like the real device: turning it on saves
  // the current Wi-Fi/Bluetooth state and switches them off; turning it off
  // restores whatever was on before. Wi-Fi reacts to its setting; Bluetooth is
  // driven through the adapter so BtContext sees the state change.
  (function () {
    var SAVE = 'kaios.airplane.saved';
    function getSaved() { try { return JSON.parse(localStorage.getItem(SAVE) || 'null'); } catch (e) { return null; } }
    function setSaved(v) { try { v == null ? localStorage.removeItem(SAVE) : localStorage.setItem(SAVE, JSON.stringify(v)); } catch (e) {} }
    var btOn = function () { return bt.state === 'enabled' || bt.state === 'enabling'; };
    window.__kaiSettings.observe('airplaneMode.status', 'disabled', function (e) {
      if (e.settingValue === 'enabled') {
        if (getSaved() == null) setSaved({ wifi: store['wifi.enabled'] !== false, bt: btOn() });
        if (store['wifi.enabled'] !== false) window.__kaiSettings.set([{ name: 'wifi.enabled', value: false }]);
        if (btOn()) bt.disable();
      } else {
        var saved = getSaved();
        if (saved) {
          if (saved.wifi) window.__kaiSettings.set([{ name: 'wifi.enabled', value: true }]);
          if (saved.bt && !btOn()) bt.enable();
          setSaved(null);
        }
      }
    });
  })();

  var b2g = {
    settings: navigator.mozSettings,
    wifiManager: wifi,
    bluetooth: lenient(Object.assign(evt(), { defaultAdapter: bt, getAdapters: function () { return [bt]; } })),
    mobileConnections: (function () {
      var conn = lenient(Object.assign(evt(), {
        voice: { connected: false, state: 'notSearching', signalStrength: null, relSignalStrength: 0, network: null, roaming: false, emergencyCallsOnly: false, type: null },
        data: { connected: false, state: 'notSearching', network: null, type: null },
        // No SIM: iccId stays null so SimCardHelper.hasValidCard() is false. The
        // app then hides the IMEI / ICCID / Phone number rows itself (with the
        // .hidden class, so navigation skips them too) and keeps SIM manager and
        // Mobile network & data locked — exactly as on a device with no card.
        iccId: null, radioState: 'enabled', networkSelectionMode: 'automatic',
        getSupportedNetworkTypes: function () { return ['gsm', 'wcdma', 'lte']; },
        getNetworks: function () { return req([]); }, getPreferredNetworkType: function () { return req('wcdma/gsm'); },
        getDeviceIdentities: function () { return { imei: '', imeisv: '', meid: '', esn: '' }; },
      }));
      var arr = [conn]; arr.addEventListener = function () {}; arr.removeEventListener = function () {};
      return lenient(arr);
    })(),
    iccManager: lenient(Object.assign(evt(), { iccIds: [], getIccById: function () { return null; } })),
    telephony: lenient(Object.assign(evt(), { calls: [], active: null })),
    downloadManager: lenient(Object.assign(evt(), { getDownloads: function () { return P([]); }, clearAllDone: function () { return P([]); } })),
    audioChannelManager: lenient(Object.assign(evt(), { volumeControlChannel: 'content', headphones: false })),
    // Simulate a device sitting on the charger: the Battery panel reads
    // powerSupplyOnline to grey out Power save mode + Turn on automatically.
    // (It must be an explicit boolean — an undefined prop would fall through to
    // the lenient proxy's hybrid(), which is truthy but confusing.)
    powerSupplyManager: lenient(Object.assign(evt(), { chargingStatus: 'Charging', powerSupplyOnline: true, batteryLevel: 100 })),
    usbManager: lenient(Object.assign(evt(), { enabled: false })),
    tetheringManager: lenient(Object.assign(evt(), {})),
    permissions: lenient(Object.assign(evt(), { get: function () { return 'granted'; }, set: function () {}, remove: function () {} })),
    mobileMessageManager: lenient(Object.assign(evt(), {})),
    externalapi: { getToken: function () { return Promise.reject(new Error('no-daemon')); }, addEventListener: function () {} },
    getDeviceStorage: function (name) { return lenient(Object.assign(evt(), {
      storageName: name || 'sdcard',
      get: function () { return req(null); }, available: function () { return req('available'); },
      freeSpace: function () { return req(4 * 1024 * 1024 * 1024); },
      // Nothing is stored in the sim: 0 B for every storage, including 'apps'
      // (so the "Application Data" summary row shows 0 B too). The app list's
      // "Other" row computes used − 2×APP_DEFAULT_SIZE = −2048 from this; the
      // showFormatedSize wrapper below renders such tiny negatives as 0 B.
      usedSpace: function () { return req(0); },
      // enumerateAll() does `for await (const f of storage.enumerate())`; an
      // empty async iterator = "no files", letting scans complete instead of
      // choking on the callable-proxy fallback. The 'apps' walk takes ~3s so
      // Application Data shows its scanning bar on EVERY entry (this runs per
      // visit — unlike the apps list, which AppsCache memoises after the first).
      enumerate: function () {
        var delay = (name || 'sdcard') === 'apps' ? 3000 : 0;
        var it = { next: function () {
          return new Promise(function (resolve) {
            setTimeout(function () { resolve({ done: true, value: undefined }); }, delay);
            delay = 0; // only the first pull pays the scan time
          });
        } };
        var iterable = {}; iterable[Symbol.asyncIterator] = function () { return it; };
        return iterable;
      },
    })); },
    getDeviceStorages: function (name) { return [b2g.getDeviceStorage(name)]; },
  };
  // Any unlisted navigator.b2g.X → a lenient fake manager (never undefined).
  navigator.b2g = new Proxy(b2g, {
    get: function (t, k) {
      if (k in t) return t[k];
      if (k === 'then' || typeof k === 'symbol') return t[k];
      return (t[k] = lenient(evt()));
    }
  });

  // Power / apps ──────────────────────────────────────────────────
  navigator.mozPower = navigator.mozPower || { screenBrightness: 0.6, screenEnabled: true, addWakeLock: function () {}, powerOff: function () {}, reboot: function () {} };
  navigator.getMozApps = navigator.mozApps = navigator.mozApps || {
    getSelf: function () { return req({ manifest: { name: 'Settings' }, origin: location.origin }); },
    mgmt: lenient(Object.assign(evt(), { getAll: function () { return req([]); }, addEventListener: function () {} })),
  };

  // Neutralise the api-daemon session layer so nothing opens a WebSocket, but
  // still fake a "session connected" so every manager module that gates its
  // real work behind services-load-* proceeds instead of hanging forever.
  window.api = window.api || {};

  // The About / Device Information panel calls window.api.session
  // .has_service('Fota') on init; without it the panel throws and can't open.
  // Report no optional services (no FOTA, etc.).
  window.api.session = window.api.session || { has_service: function () { return Promise.resolve(false); } };

  // navigator.b2g.getDeviceStorages().totalSize/usedSpace are queried via
  // device_feature's capability keys — real values used across DeviceFeature.
  window.api.devicecapabilitymanager = genericManager({
    get: function (key) {
      var VALUES = {
        'device.wifi': true, 'device.bt': true, 'device.gps': true,
        'device.vowifi': false, 'device.volte': false, 'ril.support.primarysim.switch': false,
        'device.rtt': false, 'device.vilte': false, 'device.readout': false, 'device.dfc': false,
        'device.dual-lte': false, 'device.wifi.certified': true, // → "Wi-Fi" wording
        'hardware.memory': 512, 'device.storage.size': 4096,
        'ro.build.type': 'user', 'device.cdma-apn': false, 'device.flip': false,
      };
      return Promise.resolve(VALUES[key]);
    },
  });
  // A settable clock. The Date & Time panel writes through ApiManager.time.set();
  // with no daemon that was a no-op, so picking a date/time changed nothing. Keep
  // a virtual offset and shift Date so the whole app (clock, "last updated", ...)
  // agrees. Offset starts at 0, so behaviour is identical until the user sets a
  // time.
  var timeService = (function () {
    var offset = 0;   // user-set date/time delta
    var tzDelta = 0;  // selected-timezone vs host-timezone delta
    var RealDate = window.Date;
    function KaiDate() {
      if (!(this instanceof KaiDate)) return RealDate();
      if (arguments.length === 0) return new RealDate(RealDate.now() + offset + tzDelta);
      return new (Function.prototype.bind.apply(RealDate, [null].concat([].slice.call(arguments))))();
    }
    KaiDate.prototype = RealDate.prototype;
    KaiDate.now = function () { return RealDate.now() + offset + tzDelta; };
    KaiDate.parse = RealDate.parse; KaiDate.UTC = RealDate.UTC;
    try { window.Date = KaiDate; } catch (e) {}

    // TimeService (the module ApiManager.time points at) subscribes here with
    // addObserver(TIME_CHANGED, observer); firing observer.callback() is what
    // makes it notify its own listeners — that's how the Date & Time panel
    // learns to redraw. Without it only the clock would move, silently.
    var watchers = [];
    function fireTimeChange() {
      watchers.forEach(function (w) {
        if (w.reason !== 'timeChange') return;
        try { if (w.observer && typeof w.observer.callback === 'function') w.observer.callback(); } catch (e) {}
      });
      window.dispatchEvent(new CustomEvent('timeformatchange'));
    }

    // Timezone → clock sync. time.timezone holds an IANA name ("Asia/Saigon");
    // shift the virtual clock by that zone's UTC offset minus the host's, so
    // picking GMT+X actually moves the displayed time.
    function zoneOffsetMinutes(tz) {
      try {
        var d = new RealDate();
        var p = {};
        new Intl.DateTimeFormat('en-US', {
          timeZone: tz, hour12: false,
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
        var asUTC = RealDate.UTC(+p.year, p.month - 1, +p.day, (+p.hour) % 24, +p.minute, d.getSeconds());
        return Math.round((asUTC - (d.getTime() - d.getMilliseconds())) / 60000);
      } catch (e) { return null; } // unknown zone name → leave the clock alone
    }
    function applyTimezone(tz) {
      var target = tz ? zoneOffsetMinutes(tz) : null;
      var next = target == null ? 0 : (target - (-new RealDate().getTimezoneOffset())) * 60000;
      if (next === tzDelta) return;
      tzDelta = next;
      fireTimeChange();
    }
    window.__kaiSettings.observe('time.timezone', '', function (e) { applyTimezone(e.settingValue); });
    applyTimezone(store['time.timezone']); // honour a persisted choice at boot

    return genericManager({
      id: 'timeservice',
      addObserver: function (reason, observer) { watchers.push({ reason: reason, observer: observer }); return Promise.resolve(); },
      removeObserver: function (reason, observer) {
        watchers = watchers.filter(function (w) { return !(w.reason === reason && w.observer === observer); });
        return Promise.resolve();
      },
      set: function (d) {
        var target = (d instanceof RealDate) ? d.getTime() : Number(d);
        if (isFinite(target)) offset = target - RealDate.now() - tzDelta; // keep tz shift separate
        fireTimeChange();
        return Promise.resolve();
      },
      get: function () { return Promise.resolve(new KaiDate()); },
    });
  })();
  window.api.timeservice = timeService;

  // 12/24-hour display. Panels read window.api.hour12 (the daemon keeps it in
  // step with the locale.hour12 setting); mirror that here and poke the
  // clock-format listeners when it flips.
  function syncHour12(v) { window.api.hour12 = v === true || v === 'true'; }
  syncHour12(store['locale.hour12']);
  window.__kaiSettings.observe('locale.hour12', false, function (e) {
    syncHour12(e.settingValue);
    window.dispatchEvent(new CustomEvent('timeformatchange'));
  });

  // Apps service — Application Data ("Clean Up Storage") scans installed apps
  // via taskScheduler → window.api.appsmanager.getAll(). With the generic fake
  // it resolved undefined and the scan hung on its loading bar forever. Report
  // a few sample apps; their manifests are plain JSON served by the shim host.
  window.api.appsmanager = genericManager({
    getAll: function () {
      var apps = ['browser', 'google'].map(function (id) {
        // Resolve against the document, not the origin root — the bundle runs
        // from file:// (Electron) or a github.io subpath, never at "/".
        var manifestUrl = new URL('__shim/fake-apps/' + id + '.json', location.href).href;
        return {
          manifestUrl: manifestUrl, manifestURL: manifestUrl,
          origin: 'http://' + id + '.localhost',
          removable: true, status: 0,
          // No size seeded: the scan finds no data files, so both apps report
          // 0 B — per request (the sim apps hold no real data).
        };
      });
      // No artificial delay here: AppsCache memoises this after the first call,
      // so it can't provide the per-visit scan time — the 'apps' storage
      // enumeration (which DOES run every visit) carries the ~3s instead.
      return Promise.resolve(apps);
    },
  });

  // Generic fakes for the remaining daemon services (Battery/Date&time/
  // Accounts/Downloads/Contacts panels etc.) — any method resolves harmlessly
  // instead of the request hanging forever with no daemon to answer it.
  ['powermanager', 'timeservice', 'accountmanager', 'appsmanager', 'contactsmanager',
   'audiovolumemanager', 'usbmanager', 'tcpsocketmanager', 'telephonymanager', 'procmanager']
    .forEach(function (name) { if (!window.api[name]) window.api[name] = genericManager(); });

  // Minimal stand-ins for the session-observer base classes. The real ones
  // live in the daemon RPC libs we never load (lib_time.js, lib_accounts.js,
  // lib_contacts.js); TimeService/AccountManager/ContactsManager reference
  // them as soon as our sticky "services-load-observer" event fires.
  function ObserverBase(id, session) { this.id = id; this.session = session; }
  window.lib_time = window.lib_time || { TimeObserverBase: ObserverBase, CallbackReason: { TIME_CHANGED: 'timeChange', TIMEZONE_CHANGED: 'timeZoneChange' } };
  window.lib_accounts = window.lib_accounts || { AccountObserverBase: ObserverBase };
  window.lib_contacts = window.lib_contacts || {
    ChangeReason: { CREATE: 0, UPDATE: 1, REMOVE: 2 },
    FilterByOption: { NAME: 0, GIVEN_NAME: 1, FAMILY_NAME: 2, TEL: 3, EMAIL: 4, CATEGORY: 5 },
    FilterOption: { EQUALS: 0, CONTAINS: 1, MATCH: 2, STARTS_WITH: 3, FUZZY_MATCH: 4 },
    Order: { ASCENDING: 0, DESCENDING: 1 }, SortOption: { GIVEN_NAME: 0, FAMILY_NAME: 1, NAME: 2 },
  };

  Object.defineProperty(window, 'libSession', {
    configurable: true,
    get: function () {
      return {
        sessionInit: function () { return Promise.resolve(); },
        initService: function () { fireSticky(); return Promise.resolve(); },
        session: null,
      };
    },
    set: function () { /* ignore the real LibSession constructor's self-assignment */ }
  });

  // Storage sizes in the sim are all zero, but Application Data's "Other" row
  // is derived as used − (apps × APP_DEFAULT_SIZE) = a small NEGATIVE number,
  // which the stock formatter renders as blank. Clamp tiny negatives to 0 B.
  // (utils.js defines window.DeviceStorageHelper after this shim runs.)
  (function wrapFormatter() {
    var h = window.DeviceStorageHelper;
    if (!h || typeof h.showFormatedSize !== 'function') { setTimeout(wrapFormatter, 250); return; }
    var orig = h.showFormatedSize.bind(h);
    h.showFormatedSize = function (element, l10nId, size) {
      if (typeof size === 'number' && size < 0 && size >= -8192) size = 0;
      return orig(element, l10nId, size);
    };
  })();

  // KaiOS account sign-in (getAccountInfo/showLoginPage/account-manager activity)
  // is faked in account-fake-ui.js — with an empty store it yields "Not signed
  // in"; after a fake login it reflects the signed-in account.

  console.log('[b2g-shim] installed');
})();
