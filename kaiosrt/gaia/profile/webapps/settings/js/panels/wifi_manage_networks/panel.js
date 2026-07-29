
// eslint-disable-next-line
define('panels/wifi_manage_networks/panel',['require','modules/settings_panel'],function(require) {
  const SettingsPanel = require('modules/settings_panel');

  return function ctorWifiManageNetworksPanel() {
    let macAddress = null;
    const listElements = document.querySelectorAll('#wifi_manage_networks li');

    function initSoftkey() {
      const params = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: [
          {
            name: 'Select',
            l10nId: 'select',
            priority: 2
          }
        ]
      };

      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    return SettingsPanel({
      onInit(panel) {
        macAddress = panel.querySelector('[data-name="deviceinfo.mac"]');
        // We would update this value all the time
        SettingsDBCache.observe('deviceinfo.mac', '', value => {
          macAddress.textContent = value;
        });
      },

      onBeforeShow() {
        initSoftkey();
        ListFocusHelper.addEventListener(listElements);
      },

      onBeforeHide() {
        ListFocusHelper.removeEventListener(listElements);
      }
    });
  };
});

