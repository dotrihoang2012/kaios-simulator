/* global */

define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createCellBroadcastMessagePanel() {
    const rilCbDisabled = 'ril.cellbroadcast.disabled';
    let elements = {};
    let serviceId = 0;
    let listElements = null;

    function initSoftKey() {
      const softkeyParams = {
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
      SettingsSoftkey.init(softkeyParams);
    }

    function updateChannelsPanel(disable) {
      if (disable) {
        elements.cellBroadcastConfig.setAttribute('aria-disabled', true);
        elements.cellBroadcastConfig.classList.add('none-select');
      } else {
        elements.cellBroadcastConfig.removeAttribute('aria-disabled');
        elements.cellBroadcastConfig.classList.remove('none-select');
      }

      SettingsDBCache.getSetting(rilCbDisabled).then(value => {
        const cbResult = value;
        cbResult[serviceId] = disable;
        SettingsDBCache.saveSettings({
          'ril.cellbroadcast.disabled': cbResult
        });
      });
    }

    function updateCbSwitch() {
      SettingsDBCache.getSetting(rilCbDisabled).then(result => {
        const value = result[serviceId] ? 'false' : 'true';
        updateChannelsPanel(result[serviceId]);
        elements.cellBroadcastSwitch.value = value;
        elements.cellBroadcastSwitch.classList.remove('hidden');
      });
    }

    return SettingsPanel({
      onInit(panel) {
        listElements = document.querySelectorAll('li');
        elements = {
          cellBroadcastSwitch: panel.querySelector(
            '#cellBroadcast-mode-select'
          ),
          cellBroadcastConfig: panel.querySelector('#cell-broadcast-config')
        };
        elements.cellBroadcastSwitch.addEventListener('change', evt => {
          const disable = evt.target.value !== 'true';
          updateChannelsPanel(disable);
          ToastHelper.showToast('changessaved');
        });
      },

      onBeforeShow(panel, options) {
        serviceId = options.serviceId || serviceId;
        initSoftKey();
        ListFocusHelper.addEventListener(listElements);
        updateCbSwitch();
      },

      onBeforeHide() {
        ListFocusHelper.removeEventListener(listElements);
      }
    });
  };
});
