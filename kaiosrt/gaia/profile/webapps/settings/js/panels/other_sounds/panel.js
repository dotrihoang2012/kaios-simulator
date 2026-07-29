
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createOtherSoundsPanel() {
    let elements = null;
    return SettingsPanel({
      onInit(panel) {
        elements = {
          dialpad: panel.querySelector('#dial-pad'),
          camera: panel.querySelector('#camera')
        };

        SettingsDBCache.observe('phone.ring.keypad', true, value => {
          elements.dialpad.value = value;
        });

        SettingsDBCache.observe('camera.sound.enabled', true, value => {
          elements.camera.value = value;
        });
      },

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
