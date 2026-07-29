
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createGeolocationPrivacyPanel() {
    let privacyframe = null;
    const softkeyParams = {
      menuClassName: 'menu-button',
      header: {
        l10nId: 'message'
      },
      items: [
        {
          name: 'Ok',
          l10nId: 'ok',
          priority: 2,
          method() {
            DebugHelper.debug('SettingsSoftkey OK');
          }
        }
      ]
    };

    function initIframe() {
      privacyframe.focus();
      privacyframe.contentDocument.dir = window.document.dir;
      privacyframe.contentDocument.addEventListener('keydown', handleEvent);
    }

    function handleEvent(evt) {
      switch (evt.key) {
        case 'Enter':
        case 'Backspace':
          evt.preventDefault();
          NavigationMap.navigateBack();
          break;
        default:
          break;
      }
    }

    return SettingsPanel({
      onInit(panel) {
        privacyframe = panel.querySelector('#geo-privacy');
        window.addEventListener('panelready', initIframe);
      },

      onBeforeShow() {
        SettingsSoftkey.init(softkeyParams);
        SettingsSoftkey.show();
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
      },

      onUninit() {
        window.removeEventListener('panelready', initIframe);
        privacyframe.contentDocument.removeEventListener(
          'keydown',
          handleEvent
        );
      }
    });
  };
});
