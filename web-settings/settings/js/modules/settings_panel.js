/**
 * SettingsPanel extends Panel with basic settings services. It presets the UI
 * elements based on the values in mozSettings and add listeners responding to
 * mozSettings changes in onReady. In onInit it parses the panel element for
 * activating links. It also removes listeners in onDone so that we can avoid
 * unwanted UI updates when the panel is outside of the viewport.
 *
 * @module SettingsPanel
 */

define(['require','modules/panel','modules/panel_utils'],function(require) { //eslint-disable-line
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
