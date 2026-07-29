
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createKaiosAccountAboutPanel() {
    function initSoftKey() {
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
              NavigationMap.navigateBack();
            }
          }
        ]
      };
      SettingsSoftkey.init(softkeyParams);
      SettingsSoftkey.show();
    }

    return SettingsPanel({
      onBeforeShow() {
        initSoftKey();
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
      }
    });
  };
});
