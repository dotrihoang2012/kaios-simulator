
/* eslint "camelcase": 'off' */
require.config({
  baseUrl: 'js',
  paths: {
    modules: 'modules',
    panels: 'panels'
  },
  shim: {
    utils: {
      exports: ''
    }
  },
  modules: [
    {
      name: 'main'
    },
    {
      name: 'modules/apn/apn_settings_manager',
      exclude: [
        'main',
        'modules/async_storage',
        'modules/mvvm/observable',
        'modules/apn/apn_const'
      ]
    },
    {
      name: 'panels/root/panel',
      exclude: ['main', 'modules/apps_cache']
    },
    {
      name: 'panels/languages/panel',
      exclude: ['main']
    },
    {
      name: 'panels/app_notices_list/panel',
      exclude: ['main', 'modules/apps_cache']
    },
    {
      name: 'panels/screen_lock/panel',
      exclude: ['main']
    },
    {
      name: 'panels/screen_lock_passcode/panel',
      exclude: ['main']
    },
    {
      name: 'panels/display/panel',
      exclude: ['main', 'modules/mvvm/observable']
    },
    {
      name: 'panels/input_methods/panel',
      exclude: ['main']
    },
    {
      name: 'panels/input_languages_selection/panel',
      exclude: ['main']
    },
    {
      name: 'panels/app_storage/panel',
      exclude: ['main', 'modules/app_storage', 'modules/apps_cache']
    },
    {
      name: 'panels/wifi/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_auth/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_enter_certificate_nickname/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_join_hidden/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_manage_certificates/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_manage_networks/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_select_certificate_file/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_status/panel',
      exclude: ['main']
    },
    {
      name: 'panels/wifi_wps/panel',
      exclude: ['main']
    },
    {
      name: 'panels/date_time/panel',
      exclude: ['main', 'modules/mvvm/observable']
    },
    {
      name: 'panels/search/panel',
      exclude: ['main']
    },
    {
      name: 'panels/sound/panel',
      exclude: ['main']
    },
    {
      name: 'panels/simcard_manager/panel',
      exclude: ['main']
    },
    {
      name: 'panels/hotspot/panel',
      exclude: ['main', 'modules/mvvm/observable']
    },
    {
      name: 'panels/hotspot_wifi_settings/panel',
      exclude: ['main', 'modules/mvvm/observable']
    },
    {
      name: 'panels/about/panel',
      exclude: ['main']
    },
    {
      name: 'panels/about_more_info/panel',
      exclude: ['main']
    },
    {
      name: 'panels/developer/panel',
      exclude: ['main', 'modules/apps_cache']
    },
    {
      name: 'panels/developer_hud/panel',
      exclude: ['main']
    },
    {
      name: 'panels/call_barring/panel',
      exclude: ['main', 'modules/mvvm/observable']
    },
    {
      name: 'panels/call_barring_passcode_change/panel',
      exclude: ['main']
    }
  ]
});

define("config/require", function(){});

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
    this.SettingsService.navigate(panelID, config);
  },

  init: function init(options) {
    /*
     * If (!navigator.mozSetMessageHandler) {
     *   return;
     * }
     */

    this.SettingsService = options.SettingsService;
    this.ScreenLayout = options.ScreenLayout;

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

define("modules/settings", function(){});

/**
 * PageTransitions provides transition functions used when navigating panels.
 *
 * @module PageTransitions
 */

define('modules/page_transitions',[],function() { //eslint-disable-line
  const sendPanelReady = function sendPanelReady(oldPanelHash, newPanelHash) {
    const detail = {
      previous: oldPanelHash,
      current: newPanelHash
    };
    const event = new CustomEvent('panelready', { detail });
    window.dispatchEvent(event);
  };

  return {
    /**
     * Typically used with phone size device layouts.
     *
     * @alias module:PageTransitions#oneColumn
     * @param {String} oldPanel
     * @param {String} newPanel
     * @param {Function} callback
     */
    oneColumn: function oneColumn(oldPanel, newPanel, callback) {
      if (oldPanel === newPanel) {
        callback();
        return;
      }

      // Switch previous/current classes
      if (oldPanel) {
        oldPanel.className = newPanel.className ? '' : 'previous';
      }
      if (newPanel.className === 'current') {
        sendPanelReady(oldPanel && `#${oldPanel.id}`, `#${newPanel.id}`);

        if (callback) {
          callback();
        }
        return;
      }

      newPanel.className = 'current';

      /**
       * Most browsers now scroll content into view taking CSS transforms into
       * account.  That's not what we want when moving between <section>s,
       * because the being-moved-to section is offscreen when we navigate to its
       * #hash.  The transitions assume the viewport is always at document 0,0.
       * So add a hack here to make that assumption true again.
       * https://bugzilla.mozilla.org/show_bug.cgi?id=803170
       */
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }

      window.setTimeout(() => {
        if (oldPanel) {
          sendPanelReady(`#${oldPanel.id}`, `#${newPanel.id}`);
          if (oldPanel.className === 'current') {
            return;
          }
        } else {
          sendPanelReady(null, `#${newPanel.id}`);
        }
        if (callback) {
          callback();
        }
      }, 100);
    },

    /**
     * Typically used with tablet size device layouts.
     *
     * @alias module:PageTransitions#twoColumn
     * @param {String} oldPanel
     * @param {String} newPanel
     * @param {Function} callback
     */
    twoColumn: function twoColumn(oldPanel, newPanel, callback) {
      if (oldPanel === newPanel) {
        callback();
        return;
      }

      if (oldPanel) {
        oldPanel.className = newPanel.className ? '' : 'previous';
        newPanel.className = 'current';
        sendPanelReady(`#${oldPanel.id}`, `#${newPanel.id}`);
      } else {
        newPanel.className = 'current';
        sendPanelReady(null, `#${newPanel.id}`);
      }

      if (callback) {
        callback(); //eslint-disable-line
      }
    }
  };
});

/**
 * Panel is the basic element for navigation. Which defines Six basic
 * functions: show, hide, beforeShow, beforeHide, init, and uninit for
 * navigation. These functions are called by `SettingsService` during the
 * navigation.
 * Internal functions onShow, onHide, onBeforeShow, onBeforeHide, onInit,
 * and onUninit are called respectively in the basic functions.
 *
 * @module Panel
 */
/* global */


define('modules/panel',[],function () { //eslint-disable-line

  const emptyFunc = function emptyFunc() {};

  /**
   * @alias module:Panel
   * @param {Object} options
   *                 Options are used to override the internal functions.
   * @returns {Panel}
   */
  const Panel = function Panel(options) {
    let initialized = false;

    options = options || {};
    options.onInit = options.onInit || emptyFunc;
    options.onUninit = options.onUninit || emptyFunc;
    options.onShow = options.onShow || emptyFunc;
    options.onHide = options.onHide || emptyFunc;
    options.onBeforeShow = options.onBeforeShow || emptyFunc;
    options.onBeforeHide = options.onBeforeHide || emptyFunc;

    return {
      /**
       * Get a value that indicates whether the panel has been initialized.
       *
       * @alias module:Panel#initialized
       * @return {Boolean}
       */
      get initialized() {
        return initialized;
      },

      /**
       * Called at the first time when the beforeShow function is called.
       *
       * @alias module:Panel#init
       * @param {HTMLElement} panel
       * @param {Object} initOptions
       */
      init(panel, initOptions) {
        if (initialized) {
          return;
        }
        initialized = true;

        return options.onInit(panel, initOptions); //eslint-disable-line
      },

      /**
       * Called when cleanup.
       *
       * @alias module:Panel#uninit
       */
      uninit(panelElement) {
        if (!initialized) {
          return;
        }
        initialized = false;
        return options.onUninit(panelElement); //eslint-disable-line
      },

      /**
       * Called when the panel is navigated into the viewport.
       *
       * @alias module:Panel#show
       * @param {HTMLElement} panel
       * @param {Object} showOptions
       */
      show(panel, showOptions) {
        // Initialize at the first call to show if necessary.
        return Promise.resolve(this.init(panel, showOptions)).then(() =>
          options.onShow(panel, showOptions)
        );
      },

      /**
       * Called when the panel is navigated out of the viewport.
       *
       * @alias module:Panel#hide
       */
      hide() {
        return options.onHide();
      },

      /**
       * Called when the panel is about to be navigated to into the viewport.
       *
       * @alias module:Panel#beforeShow
       * @param {HTMLElement} panel
       * @param {Object} beforeShowOptions
       */
      beforeShow(panel, beforeShowOptions) {
        // Initialize at the first call to beforeShow.
        return Promise.resolve(this.init(panel, beforeShowOptions)).then(() =>
          options.onBeforeShow(panel, beforeShowOptions)
        );
      },

      /**
       * Called when the panel is about to be navigated out of the viewport.
       *
       * @alias module:Panel#beforeHide
       * @param {HTMLElement} panel
       * @param {Object} beforeShowOptions
       */
      beforeHide() {
        return options.onBeforeHide();
      }
    };
  };
  return Panel;
});


define('modules/panel_utils',[],function() { //eslint-disable-line

  return {
    preset: function preset(panel) {
      const dbList = [];
      const dataNameElements = panel.querySelectorAll('[data-name]');
      for (let i = 0; i < dataNameElements.length; i++) {
        dbList.push(dataNameElements[i].getAttribute('data-name'));
      }
      const dataShowElements = panel.querySelectorAll('[data-show-name]');
      for (let i = 0; i < dataShowElements.length; i++) {
        dbList.push(dataShowElements[i].getAttribute('data-show-name'));
      }
      SettingsDBCache.getSettings(dbList, result => {
        panel = panel || document;

        // Preset all checkboxes
        let rule = 'input[type="checkbox"]:not([data-ignore])';
        const checkboxes = panel.querySelectorAll(rule);
        let count = null;
        let i = null;
        let key = null;
        for (i = 0, count = checkboxes.length; i < count; i++) {
          key = checkboxes[i].getAttribute('data-name');
          if (!key) {
            continue;
          }
          if (result[key] !== Constants.UNDEFINED) {
            checkboxes[i].checked = !!result[key];
          }
        }

        // Preset all radio buttons
        rule = 'input[type="radio"]:not([data-ignore])';
        const radios = panel.querySelectorAll(rule);
        for (i = 0, count = radios.length; i < count; i++) {
          key = radios[i].getAttribute('data-name');
          if (!key) {
            continue;
          }
          if (result[key] !== Constants.UNDEFINED) {
            radios[i].checked = result[key] === radios[i].value;
          }
        }

        // Preset all text inputs
        rule = 'input[type="text"]:not([data-ignore])';
        const texts = panel.querySelectorAll(rule);
        for (i = 0, count = texts.length; i < count; i++) {
          key = texts[i].getAttribute('data-name');
          if (!key) {
            continue;
          }
          if (result[key] !== Constants.UNDEFINED) {
            texts[i].value = result[key];
          }
        }

        // Preset all range inputs
        rule = 'input[type="range"]:not([data-ignore])';
        const ranges = panel.querySelectorAll(rule);
        for (i = 0, count = ranges.length; i < count; i++) {
          key = ranges[i].getAttribute('data-name');
          if (!key) {
            continue;
          }
          if (result[key] !== Constants.UNDEFINED) {
            ranges[i].value = parseFloat(result[key]);
          }
        }

        // Preset all select
        const selects = panel.querySelectorAll('select');
        for (i = 0, count = selects.length; i < count; i++) {
          const select = selects[i];
          key = select.getAttribute('data-name');
          if (!key) {
            continue;
          }
          if (result[key] !== Constants.UNDEFINED) {
            const value = result[key];
            const option = `option[value="${value}"]`;
            const selectOption = select.querySelector(option);
            if (selectOption) {
              selectOption.selected = true;
            }
          }
        }

        // Preset all small with data-name fields
        rule = 'small[data-name]:not([data-ignore])';
        const smallFields = panel.querySelectorAll(rule);
        for (i = 0, count = smallFields.length; i < count; i++) {
          key = smallFields[i].getAttribute('data-name');

          if (result[key] !== Constants.UNDEFINED) {
            smallFields[i].textContent = result[key];
          }
        }

        rule = '[data-show-name]:not([data-ignore])';
        const hiddenItems = panel.querySelectorAll(rule);
        for (i = 0; i < hiddenItems.length; i++) {
          key = hiddenItems[i].dataset.showName;
          hiddenItems[i].classList.toggle('hidden', !result[key]);
        }
      });
    },

    /**
     * When a link element is clicked, the function navigates the app to the
     * panel of the id specified by the "href" attribute of the element.
     *
     * @alias module:PanelUtils#handleLinkClick
     * @param {Event} event
     */
    handleLinkClick: function handleLinkClick(panel, event) {
      const { target } = event;
      let href = null;

      const nodeName = target.nodeName.toLowerCase();
      if (nodeName !== 'a' || target.parentNode.hasAttribute('aria-disabled')) {
        return;
      }
      href = target.getAttribute('href');
      if (!href || href === '#') {
        return;
      }

      Settings.setCurrentPanel(href);
      event.preventDefault();
    },

    handleChange: function handleChange(panel, event) {
      const { target } = event;
      if (!target.getAttribute('data-name')) {
        return;
      }

      const { type } = target;
      let value = null;
      switch (type) {
        case 'checkbox':
          value = target.checked; // Boolean
          break;
        case 'range':
          /*
           * Bug 906296:
           *   We parseFloat() once to be able to round to 1 digit, then
           *   we parseFloat() again to make sure to store a Number and
           *   not a String, otherwise this will make Gecko unable to
           *   apply new settings.
           */
          value = parseFloat(parseFloat(target.value).toFixed(1)); // Float
          break;
        case 'select-one':
        case 'radio':
        case 'text':
        case 'password':
          if (target.dataset.valueType === 'integer') {
            // Integer
            value = parseInt(target.value, 10);
          } else if (target.dataset.valueType === 'boolean') {
            value = (target.value === 'true') || false; // eslint-disable-line
          } else {
            // Default as text
            value = target.value; // eslint-disable-line
          }
          break;
        default:
          break;
      }
      const cSet = {};
      cSet[target.getAttribute('data-name')] = value;
      SettingsDBCache.saveSettings(cSet);
    }
  };
});

/**
 * SettingsPanel extends Panel with basic settings services. It presets the UI
 * elements based on the values in mozSettings and add listeners responding to
 * mozSettings changes in onReady. In onInit it parses the panel element for
 * activating links. It also removes listeners in onDone so that we can avoid
 * unwanted UI updates when the panel is outside of the viewport.
 *
 * @module SettingsPanel
 */

define('modules/settings_panel',['require','modules/panel','modules/panel_utils'],function(require) { //eslint-disable-line
  const Panel = require('modules/panel');
  const PanelUtils = require('modules/panel_utils');

  const emptyFunc = function emptyFunc() {};

  /**
   * @alias module:SettingsPanel
   * @param {Object} options
   *                 Options are used to override the internal functions of
   *                 Panel.
   * @returns {SettingsPanel}
   */
  const SettingsPanel = function SettingsPanel(options) {
    /**
     * The root element of the panel.
     *
     * @type {HTMLElement}
     */
    let currentPanel = null;

    /**
     * The handler is called when settings change.
     *
     * @param {Event} event
     */
    const clickHandler = function clickHandler(event) {
      PanelUtils.handleLinkClick(currentPanel, event);
    };

    const changeHandler = function changeHandler(event) {
      PanelUtils.handleChange(currentPanel, event);
    };

    /**
     * Add listeners to make the panel be able to respond to setting changes
     * and user interactions.
     *
     * @param {HTMLElement} panel
     */
    const addListeners = function addListeners(panel) {
      if (!panel) {
        return;
      }

      panel.addEventListener('change', changeHandler);
      panel.addEventListener('click', clickHandler);
    };

    /**
     * Remove all listeners.
     *
     * @param {HTMLElement} panel
     */
    const removeListeners = function removeListeners(panel) {
      if (!panel) {
        return;
      }
      panel.removeEventListener('change', changeHandler);
      panel.removeEventListener('click', clickHandler);
    };

    options = options || {};
    options.onInit = options.onInit || emptyFunc;
    options.onUninit = options.onUninit || emptyFunc;
    options.onShow = options.onShow || emptyFunc;
    options.onHide = options.onHide || emptyFunc;
    options.onBeforeShow = options.onBeforeShow || emptyFunc;
    options.onBeforeHide = options.onBeforeHide || emptyFunc;

    return Panel({
      onInit(panel, initOptions) {
        if (!panel) {
          return;
        }

        currentPanel = panel;
        return options.onInit(panel, initOptions); //eslint-disable-line
      },
      onUninit(panelElement) {
        currentPanel = null;
        options.onUninit(panelElement);
        panelElement.parentNode.removeChild(panelElement);
      },
      onShow(panel, showOptions) {
        return options.onShow(panel, showOptions);
      },
      onHide() {
        // Remove listeners.
        removeListeners(currentPanel);

        return options.onHide();
      },
      onBeforeShow(panel, beforeShowOptions) {
        // Preset the panel every time when it is presented.
        PanelUtils.preset(panel);
        addListeners(panel);
        return options.onBeforeShow(panel, beforeShowOptions);
      },
      onBeforeHide() {
        return options.onBeforeHide();
      }
    });
  };
  return SettingsPanel;
});

/* global */


define('modules/async_storage',['require'],function(require) { //eslint-disable-line

  return {
    getItem: function getItem(key) {
      return new Promise(resolve => {
        window.asyncStorage.getItem(key, resolve);
      });
    },
    setItem: function setItem(key, value) {
      return new Promise(resolve => {
        window.asyncStorage.setItem(key, value, resolve);
      });
    }
  };
});

/* eslint-disable consistent-return */
/**
 * SettingsService is a singleton that provides the navigation service. It
 * call to its basic functions when navigating.
 *
 * @module SettingsService
 */
/* global ScreenLayout FileLoader MenuMap AccountHelper */


define('modules/settings_service',['require','modules/page_transitions','modules/settings_panel'],function (require) { //eslint-disable-line

  const PageTransitions = require('modules/page_transitions');
  const SettingsPanel = require('modules/settings_panel');

  let rootPanelId = null;

  /**
   * CurrentNavigation caches information of the current panel including id,
   * element, module, and options.
   */
  let currentNavigation = null;
  let navigating = false;
  let pendingNavigationRequest = null;

  let cachedNavigation = null;
  let cachedNavigationOptions = {};

  const cachedPanel = {}; // It refers to the HTML element of the panel
  const panelCache = {}; //  It refers to the function of the panel

  let activityHandler = null;

  let loadModulesForSubPanelsPromise = null;

  const isTabletAndLandscape = function isTabletAndLandscape() {
    return ScreenLayout.getCurrentLayout('tabletAndLandscaped');
  };

  const retriveParentPanelId = function retriveParentPanelId(panelId) {
    const headerSelector = `#${panelId} > gaia-header`;
    const header = document.querySelector(headerSelector);
    return ((header && header.dataset.href) || '').replace('#', '');
  };

  const shallCloseActivity = function shallCloseActivity(panelId) {
    /*
     * If we're handling an activity and the 'back' button is hit, close the
     * activity if the panel id to be navigated equals the parent panel id.
     */

    // This is for the root panel
    if (panelId === 'home') {
      return true;
    }

    if (!currentNavigation) {
      return false;
    }

    // Get the parent panel id of the current panel.
    const parentPanelId = retriveParentPanelId(currentNavigation.panelId);

    /*
     * Close the activity if the current panel is the original target panel,
     * and the new panel is the parent panel of the current panel.
     */
    return (
      currentNavigation.panelId === activityHandler.targetPanelId &&
      panelId === parentPanelId
    );
  };

  const transit = function transit(oldPanel, newPanel, callback) {
    const promise = new Promise(resolve => {
      const wrappedCallback = function wrappedCallback() {
        if (typeof callback === 'function') {
          callback();
          return;
        }
        resolve();
      };

      if (isTabletAndLandscape()) {
        PageTransitions.twoColumn(oldPanel, newPanel, wrappedCallback);
      } else {
        PageTransitions.oneColumn(oldPanel, newPanel, wrappedCallback);
      }
    });
    return promise;
  };

  const loadPanel = function loadPanel(panelId, callback) {
    if (activityHandler && activityHandler.targetPanelId === panelId) {
      callback();
      return;
    }
    if (panelId === 'root' || cachedPanel[panelId]) {
      callback(); //eslint-disable-line
    } else {
      FileLoader.loader([`elements/${panelId}.html`], callback);
    }
  };

  const getPanel = function getPanel(panelId, callback) {
    if (!panelId && !callback) {
      return;
    }

    if (panelCache[panelId]) {
      if (callback) {
        callback(panelCache[panelId]); //eslint-disable-line
      }
    } else {
      // Get the path of the panel creation function
      const panelElement = document.getElementById(panelId);
      if (panelElement) {
        const pathElement = panelElement.querySelector('panel');
        const path = pathElement ? pathElement.dataset.path : null;

        const panelFuncLoaded = function panelFuncLoaded(panelFunc) {
          const panel = panelFunc();
          panelCache[panelId] = panel;
          if (callback) {
            callback(panel); //eslint-disable-line
          }
        };

        if (path) {
          require([path], panelFunc => {
            // Create a new panel object for static panels.
            panelFuncLoaded(panelFunc ? panelFunc : SettingsPanel);
          });
        } else {
          panelFuncLoaded(SettingsPanel);
        }
      }
    }
  };

  const loadModulesForSubPanels = function loadModulesForSubPanels(panelId) {
    if (panelId === rootPanelId) {
      return Promise.resolve();
    }
    if (!loadModulesForSubPanelsPromise) {
      loadModulesForSubPanelsPromise = new Promise(resolve => {
        require([
          /*
           * XXX: It is assumed that the string for the header of the root
           *      Panel always fits and the font size utils are not
           *      Required.
           */
          'modules/async_storage'
        ], resolve);
      });
    }
    return loadModulesForSubPanelsPromise;
  };

  const restoreFocus = function restoreFocus(panel) {
    if (!document.hidden) {
      const lastFocused = panel.querySelector('.focus');
      if (lastFocused) {
        const input = lastFocused.querySelector('input');
        if (input && ['tel', 'text', 'password'].indexOf(input.type) > -1) {
          input.focus();
        } else {
          lastFocused.focus();
        }
      }
    } else if (MenuMap.optionsShow) {
      window.dispatchEvent(
        new CustomEvent('menuChangeEvent', {
          detail: {
            action: 'closeMenu'
          }
        })
      );
    }
  };

  /**
   * When the app becomes invisible, we should call to beforeHide and hide
   * functions of the current panel. When the app becomes visible, we should
   * call to beforeShow and show functions of the current panel with the
   * cached options.
   */
  const handleVisibilityChange = function handleVisibilityChange(visible) {
    if (!currentNavigation) {
      return;
    }

    const { panel } = currentNavigation;
    const element = currentNavigation.panelElement;
    const { options } = currentNavigation;

    if (!panel) {
      return;
    }
    restoreFocus(element);
    options.visibilityChange = visible;
    if (visible) {
      panel.beforeShow(element, options);
      panel.show(element, options);
    } else {
      panel.beforeHide();
      panel.hide();
      /*
       * If (
       *   navigator.mozPower.screenEnabled &&
       *   'configure-window' === ActivityHandler.activitySource.data.name
       * ) {
       *   ActivityHandler.postResult();
       * }
       */
    }
  };

  const onVisibilityChange = function onVisibilityChange() {
    AccountHelper.updateAccount();
    handleVisibilityChange(!document.hidden);
  };

  const navigatePanel = function navigatePanel(panelId, options, callback) {
    /*
     * Early return if the panel to be navigated is the same as the
     * current one.
     */
    if (currentNavigation && currentNavigation.panelId === panelId) {
      callback();
      return;
    }

    loadPanel(panelId, () => {
      getPanel(panelId, panel => {
        const newPanelElement = document.getElementById(panelId);
        // TranslateHelper.translateElements(newPanelElement);
        const currentPanelId = currentNavigation && currentNavigation.panelId;
        const currentPanelElement =
          currentNavigation && currentNavigation.panelElement;
        const currentPanel = currentNavigation && currentNavigation.panel;

        cachedPanel[panelId] = newPanelElement;
        // Keep these to make sure we can use when going back
        cachedNavigation = currentNavigation;
        cachedNavigationOptions = options;

        /*
         * Prepare options and calls to the panel object's before
         * show function.
         */
        options = options || {};

        // 0. start the chain
        loadModulesForSubPanels(panelId)
          // 1. beforeHide previous panel
          .then(() => {
            // We don't deactivate the root panel.
            if (currentPanel && currentPanelId !== rootPanelId) {
              return currentPanel.beforeHide();
            }
          })
          // 2. beforeShow next panel
          .then(() => panel.beforeShow(newPanelElement, options))
          // 3. do the transition
          .then(() => transit(currentPanelElement, newPanelElement))
          // 4. hide previous panel
          .then(() => {
            // We don't deactivate the root panel.
            if (currentPanel && currentPanelId !== rootPanelId) {
              return currentPanel.hide();
            }
          })
          .then(() => {
            // We don't remove dom node of root panel.
            if (Settings.isBackHref && currentPanelId !== rootPanelId) {
              cachedPanel[currentPanelId] = null;
              panelCache[currentPanelId] = null;
              return currentPanel.uninit(currentPanelElement);
            }
          })
          // 5. show next panel
          .then(() => {
            return panel.show(newPanelElement, options);
          })
          // 6. keep information
          .then(() => {
            // Update the current navigation object
            currentNavigation = {
              panelId,
              panelElement: newPanelElement,
              panel,
              options
            };

            /*
             * XXX we need to remove this line in the future
             * to make sure we won't manipulate Settings
             * directly
             */
            Settings.currentPanel = `#${panelId}`;
            Settings.isBackHref = false;
            callback();
          });
      });
    });
  };

  return {
    reset: function reset() {
      rootPanelId = null;
      currentNavigation = null;
      cachedNavigation = null;
      cachedNavigationOptions = {};
      activityHandler = null;
      navigating = false;
      pendingNavigationRequest = null;
      window.removeEventListener('visibilitychange', onVisibilityChange);
    },

    /**
     * Init SettingsService.
     *
     * @alias module:SettingsService#init
     * @param {Object} options
     * @param {String} options.rootPanelId
     *                 Panel with the specified id is assumed to be be kept on
     *                 on the screen always. We don't call to its hide and
     *                 beforeHide functions.
     * @param {Object} options.context
     *                 The launch context specifying the default panel and the
     *                 activity handler if the app is invoked by web
     *                 activities.
     * @param {String} options.context.initialPanelId
     * @param {ActivityHandler} options.context.activityHandler
     */
    init: function init(options) {
      if (options) {
        rootPanelId = options.rootPanelId || 'root';
        activityHandler = options.context && options.context.activityHandler;
      }

      window.addEventListener('visibilitychange', onVisibilityChange);
    },
    /**
     * Navigate to a panel with options. The navigation transition is
     * determined based on the current screen size and orientation.
     *
     * @alias module:SettingsService#navigate
     * @param {String} panelId
     * @param {Object} options
     * @param {Function} callback
     */
    navigate: function navigate(panelId, options, callback) {
      // Check if the app is invoked by web activity and shall post result.
      if (activityHandler && shallCloseActivity(panelId)) {
        activityHandler.postResult();
        return;
      }

      // Cache the navigation request if it is navigating.
      if (navigating) {
        pendingNavigationRequest = arguments;//eslint-disable-line
        return;
      }

      navigating = true;
      navigatePanel(panelId, options, () => {
        navigating = false;

        // Navigate to the pending navigation if any.
        if (pendingNavigationRequest) {
          const args = pendingNavigationRequest;
          pendingNavigationRequest = null;
          this.navigate.apply(this, args);//eslint-disable-line
        }

        if (callback) {
          callback(); //eslint-disable-line
        }
      });
    },

    /**
     * Go back to previous panel
     *
     * @alias module:SettingsService#back
     */
    back: function back() {
      if (cachedNavigation) {
        this.navigate(cachedNavigation.panelId, cachedNavigationOptions);
        cachedNavigation = null;
        cachedNavigationOptions = {};
      }
    }
  };
});

/* global ScreenLayout */


require(['config/require'], function() { //eslint-disable-line
  define('boot', ['require','utils','modules/settings','modules/settings_service'],function(require) { //eslint-disable-line
    /*
     * The following are the scripts used by many other scripts. We load them
     * at once here. These should be move to the dependency of each panel in the
     * future.
     */
    require('utils');
    require('modules/settings');

    const SettingsService = require('modules/settings_service');

    function isInitialPanel(panel) {
      if (Settings.isTabletAndLandscape()) {
        return panel === Settings.initialPanelForTablet;
      }
      return panel === `#${window.LaunchContext.initialPanelId}`;
    }

    window.addEventListener(
      'panelready',
      function onPanelReady(e) {
        if (!isInitialPanel(e.detail.current)) {
          return;
        }

        window.removeEventListener('panelready', onPanelReady);

        // Activate the animation.
        document.body.dataset.ready = true;
      },
      false
    );

    /**
     * In two column layout, the root panel should not be deactivated. We pass
     * the id of the root panel to SettingsService so that it won't deactivate
     * the root panel when in two column.
     * XXX: Currently we don't separate the navigation logic of one column and
     *      two column layout, so that the root panel will not be deactivated
     *      in one column layout.
     */
    SettingsService.init({
      rootPanelId: 'root',
      context: window.LaunchContext
    });

    const options = {
      SettingsService,
      ScreenLayout
    };
    Settings.init(options);

    /*
     * Tell audio channel manager that we want to adjust the notification
     * channel if the user press the volumeup/volumedown buttons in Settings.
     */
    if (navigator.b2g.audioChannelManager) {
      navigator.b2g.audioChannelManager.volumeControlChannel = 'notification';
    }
  });

  require(['boot']); // eslint-disable-line
});

define("main", function(){});

