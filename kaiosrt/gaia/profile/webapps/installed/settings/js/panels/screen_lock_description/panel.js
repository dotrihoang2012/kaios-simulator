
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line

  const SettingsPanel = require('modules/settings_panel');

  return function createScreenLockDesPanel() {
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

    return SettingsPanel({
      onBeforeShow() {
        SettingsSoftkey.init(softkeyParams);
        SettingsSoftkey.show();
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
      }
    });
  };
});
