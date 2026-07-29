/* eslint-disable consistent-return */
/**
 * SettingsService is a singleton that provides the navigation service. It
 * call to its basic functions when navigating.
 *
 * @module SettingsService
 */
/* global ScreenLayout FileLoader MenuMap AccountHelper */


define(['require','modules/page_transitions','modules/settings_panel'],function (require) { //eslint-disable-line

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
