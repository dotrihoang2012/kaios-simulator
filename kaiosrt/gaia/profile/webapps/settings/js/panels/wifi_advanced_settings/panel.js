
// eslint-disable-next-line
define(['require','modules/settings_panel'],function(require) {
  const SettingsPanel = require('modules/settings_panel');

  return function ctorWifiAdvancedSettings() {
    return SettingsPanel({
      onInit(panel) {
        const key = 'wifi.notification';
        let publicNetworksNotices = null;

        publicNetworksNotices = panel.querySelector('#pnn-select');
        publicNetworksNotices.onchange = () => {
          const obj = {};
          obj[key] = publicNetworksNotices.value === 'true';
          SettingsDBCache.saveSettings(obj);
        };

        SettingsDBCache.observe(key, true, enabled => {
          publicNetworksNotices.value = enabled ? 'true' : 'false';
        });

        this.params = {
          menuClassName: 'menu-button',
          header: {
            l10nId: 'message'
          },
          items: [
            {
              name: 'Select',
              l10nId: 'select',
              priority: 2,
              method: () => {}
            }
          ]
        };
      },

      onBeforeShow() {
        SettingsSoftkey.init(this.params);
        SettingsSoftkey.show();
      }
    });
  };
});
