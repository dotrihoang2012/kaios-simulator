
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createLyfPanel() {
    let lyfIframe = null;

    function initIframe() {
      lyfIframe.focus();
    }

    function handleEvent(evt) {
      switch (evt.key) {
        case 'Enter':
        case 'Backspace':
          NavigationMap.navigateBack();
          evt.preventDefault();
          break;
        default:
          break;
      }
    }

    return SettingsPanel({
      onInit(panel) {
        lyfIframe = panel.querySelector('#lyf-certificate');
      },

      onBeforeShow() {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        window.addEventListener('panelready', initIframe);
        lyfIframe.contentDocument.addEventListener('keydown', handleEvent);
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        window.removeEventListener('panelready', initIframe);
        lyfIframe.contentDocument.removeEventListener('keydown', handleEvent);
      }
    });
  };
});
