// Drop-in replacement for shared/js/session/settings/settings_observer.js —
// served by the host in place of the real file (source untouched). The real one
// talks to the api-daemon over a session; this one is backed by the b2g shim's
// localStorage store (window.__kaiSettings) so every non-SIM panel reads/writes
// real, persistent settings. Public API matches what the settings app uses:
//   init, getValue, getBatch, setValue, observe, unobserve, addObserver, removeObserver
(function () {
  function store() {
    return window.__kaiSettings || {
      get: function () { return Promise.resolve(undefined); },
      getBatch: function (k) { return Promise.resolve(k.map(function (n) { return { name: n, value: undefined }; })); },
      set: function () { return Promise.resolve(true); },
      observe: function () {}, unobserve: function () {},
    };
  }
  var entries = []; // {name, callback}

  var SettingsObserver = {
    initiated: true,
    init: function () {},
    getValue: function (name) { return store().get(name); },
    getBatch: function (names) { return store().getBatch(Array.isArray(names) ? names : [names]); },
    setValue: function (pairs) { return store().set(pairs); },
    observe: function (name, defaultValue, callback, observeOnly) {
      if (typeof callback !== 'function') return Promise.resolve();
      var entry = { name: name, callback: callback };
      entries.push(entry);
      store().observe(name, defaultValue, function (e) { callback(e.settingValue, e.settingName); });
      // Deliver the CURRENT value at subscribe time so panels can render initial
      // state (e.g. geolocation's On/Off radio, volume sliders) — UNLESS the
      // caller passed observeOnly=true. That flag means "only notify me on
      // future changes"; honouring it stops panels like Notifications from
      // firing their confirmation dialog every time the panel opens.
      if (!observeOnly) {
        store().get(name).then(function (v) { callback(v === undefined ? defaultValue : v, name); });
      }
      return Promise.resolve();
    },
    unobserve: function (name, callback) {
      entries = entries.filter(function (o) { return !(o.name === name && (!callback || o.callback === callback)); });
      store().unobserve(name, callback);
    },
    addObserver: function (name, callback) { return this.observe(name, undefined, callback, true); },
    removeObserver: function (name, callback) { return this.unobserve(name, callback); },
  };

  window.SettingsObserver = SettingsObserver;
  // Some modules read the settings service straight off window.api.
  window.api = window.api || {};
  if (!window.api.settingsmanager) {
    window.api.settingsmanager = {
      get: function (n) { return store().get(n); },
      getBatch: function (n) { return store().getBatch(n); },
      set: function (p) { return store().set(p); },
      addObserver: function () {}, removeObserver: function () {}, clear: function () { return Promise.resolve(); },
    };
  }
})();
