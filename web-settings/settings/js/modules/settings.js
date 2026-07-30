/* global PerformanceTestingHelper ScreenLayout */

/**
 * Debug note: to test this app in a desktop browser, you'll have to set
 * the `dom.mozSettings.enabled' preference to false in order to avoid an
 * `uncaught exception: 2147500033' message (= 0x80004001).
 */


const Settings = { // eslint-disable-line
  isTabletAndLandscape: function isTabletAndLandscape() {
    return ScreenLayout.getCurrentLayout('tabletAndLandscaped');
  },

  initialPanelForTablet: '#wifi',
  currentPanel: null,
  isBackHref: false,
  _pendingNav: null,

  getCurrentPanel: function getCurrentPanel() {
    return this.currentPanel;
  },

  setCurrentPanel: function setCurrentPanel(hash, config) {
    if (!hash.startsWith('#')) {
      hash = `#${hash}`;
    }

    if (hash === this.currentPanel) {
      this.isBackHref = false;
      return;
    }

    if (hash === '#display') {
      window.performance.mark('settings-display-start');
    }

    // Take off # first
    let panelID = hash;
    if (panelID.startsWith('#')) {
      panelID = panelID.substring(1);
    }
    this.currentPanel = hash;
    if (this.SettingsService) {
      this.SettingsService.navigate(panelID, config);
    } else {
      this._pendingNav = { id: panelID, config: config };
    }
  },

  init: function init(options) {
    /*
     * If (!navigator.mozSetMessageHandler) {
     *   return;
     * }
     */

    this.SettingsService = options.SettingsService;
    this.ScreenLayout = options.ScreenLayout;

    // Replay pending navigation from before init.
    if (this._pendingNav) {
      var p = this._pendingNav;
      this._pendingNav = null;
      this.currentPanel = null;
      this.SettingsService.navigate(p.id, p.config);
      this.currentPanel = '#' + p.id;
    }

    /*
     * XXX: We need to set to currentPanel here although SettingsService already
     *      knows the default panel id. This line will be removed along with
     *      "currentPanel" soon.
     */

    this.setCurrentPanel(window.LaunchContext.initialPanelId);

    // Make operations not block the load time
    setTimeout(() => {
      /*
       * With async pan zoom enable, the page starts with a viewport
       * of 980px before beeing resize to device-width. So let's delay
       * the rotation listener to make sure it is not triggered by fake
       * positive.
       */
      this.ScreenLayout.watch(
        'tabletAndLandscaped',
        '(min-width: 768px) and (orientation: landscape)'
      );
      // Window.addEventListener('screenlayoutchange', this.rotate);

      /*
       * WifiHelper is guaranteed to be loaded in main.js before calling to
       * this line.
       */
      if (this.isTabletAndLandscape()) {
        this.setCurrentPanel(this.initialPanelForTablet);
      }
      window.performance.mark('fullyLoaded');
    });

    PerformanceTestingHelper.dispatch('startup-path-done');
  }
};

// Hashchange listener for pre-boot navigation (added by build-web.mjs)
window.addEventListener("hashchange", function() {
  var h = location.hash;
  if (h && h !== "#" && h !== Settings.currentPanel) {
    Settings.setCurrentPanel(h);
  }
});
