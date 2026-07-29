
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createKaiosMorePanel() {
    const softkeyParams = {
      menuClassName: 'menu-button',
      header: {
        l10nId: 'message'
      },
      items: [
        {
          name: 'Done',
          l10nId: 'done',
          priority: 3,
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
