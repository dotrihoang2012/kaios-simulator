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


define([],function () { //eslint-disable-line

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
