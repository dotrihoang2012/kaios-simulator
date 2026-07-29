
define('panels/sound/panel',['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const settingsPanel = require('modules/settings_panel');

  return function createSoundPanel() {
    return settingsPanel({
      onBeforeShow() {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
      },
      onBeforeHide() {
        SettingsSoftkey.hide();
      }
    });
  };
});

