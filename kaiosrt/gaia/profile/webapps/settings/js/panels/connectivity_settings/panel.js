/* global SimCardHelper */

define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createConnectivitySettingsPanel() {
    const AIRPLANE_STATUS = 'airplaneMode.status';
    let elements = {};
    let listElements = null;

    function onAPMStateChange(value, key, firstGot) {
      if (value === 'disabled' || value === 'enabled') {
        elements.airplaneMenuItem.classList.remove('none-select');
        elements.airplaneMenuItem.removeAttribute('aria-disabled');
        if (!firstGot) {
          ToastHelper.changeSaved();
        }
      } else {
        elements.airplaneMenuItem.classList.add('none-select');
        elements.airplaneMenuItem.setAttribute('aria-disabled', true);
      }
      updateTelephonyItems(value);
    }

    function updateTelephonyItems(value) {
      if (SimCardHelper.hasValidCard()) {
        const airplaneEnabled = value !== 'disabled' || false;
        if (airplaneEnabled) {
          elements.dataConnectivity.classList.add('none-select');
          elements.dataConnectivity.setAttribute('aria-disabled', true);
        } else {
          elements.dataConnectivity.classList.remove('none-select');
          elements.dataConnectivity.removeAttribute('aria-disabled');
        }
      } else {
        elements.dataConnectivity.classList.add('none-select');
        elements.dataConnectivity.setAttribute('aria-disabled', true);
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          airplaneMenuItem: panel.querySelector('#airplane_mode_switch'),
          airplaneSelect: panel.querySelector('#airplane-mode-select'),
          dataConnectivity: panel.querySelector('#data-connectivity'),
          wifiSpan: panel.querySelector('#connectivity-wifi span'),
          wifiDesc: panel.querySelector('#wifi-desc')
        };

        listElements = panel.querySelectorAll('li');

        elements.wifiSpan.setAttribute(
          'data-l10n-id',
          Customization.getWifiCertifiedStrId('wifi', 'wlan')
        );
        SettingsDBCache.observe('wifi.enabled', true, enabled => {
          const value = enabled ? 'on' : 'off';
          elements.wifiDesc.setAttribute('data-l10n-id', value);
        });
      },

      onBeforeShow(panel) {
        DeviceFeature.ready(() => {
          Customization.initUIForItem(['airplane', 'wifi']);
        });
        ListFocusHelper.addEventListener(listElements);
        SettingsDBCache.observe(AIRPLANE_STATUS, '', onAPMStateChange, true);
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        ListFocusHelper.updateSoftkey(panel);
        SettingsDBCache.getSetting(AIRPLANE_STATUS).then(value => {
          onAPMStateChange(value, AIRPLANE_STATUS, true);
        });
      },

      onBeforeHide() {
        ListFocusHelper.removeEventListener(listElements);
        SettingsDBCache.unobserve(AIRPLANE_STATUS, onAPMStateChange);
      }
    });
  };
});
