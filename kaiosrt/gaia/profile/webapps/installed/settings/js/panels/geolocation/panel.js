
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createGeolocationPanel() {
    const GEOLOCATION_KEY = 'geolocation.enabled';
    let currentSettingsValue = false;
    let elements = null;

    const softkeyParams = {
      menuClassName: 'menu-button',
      header: {
        l10nId: 'message'
      },
      items: [
        {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1,
          method() {
            NavigationMap.navigateBack();
          }
        },
        {
          name: 'Select',
          l10nId: 'select',
          priority: 2,
          method() {
            DebugHelper.debug('SettingsSoftkey select');
          }
        }
      ]
    };

    function updateGeoInfo(enabled) {
      currentSettingsValue = enabled;
      elements.switchOn.checked = enabled;
      elements.switchOff.checked = !enabled;
    }

    function setGeoValue(evt) {
      const enabled = evt.target.value === 'true' || false;
      if (currentSettingsValue === enabled) {
        NavigationMap.navigateBack();
        return;
      }

      const option = {};
      option[GEOLOCATION_KEY] = enabled;
      SettingsDBCache.saveSettings(option);
      ToastHelper.showToast('changessaved');
      NavigationMap.navigateBack();
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          switchOn: panel.querySelector('#geolocation_switch_on'),
          switchOff: panel.querySelector('#geolocation_switch_off'),
          geoDsc: panel.querySelector('#geolcation_description')
        };

        DeviceFeature.ready(() => {
          if (DeviceFeature.getValue('wifi') !== 'true') {
            elements.geoDsc.setAttribute(
              'data-l10n-id',
              'geolocation-privacy-description-withoutwifi-1'
            );
          } else {
            elements.geoDsc.setAttribute(
              'data-l10n-id',
              Customization.getWifiCertifiedStrId(
                'geolocation-privacy-description-1',
                'geolocation-privacy-description-1-wlan'
              )
            );
          }
        });
      },

      onBeforeShow() {
        SettingsSoftkey.init(softkeyParams);
        SettingsSoftkey.show();
        elements.switchOn.addEventListener('click', setGeoValue);
        elements.switchOff.addEventListener('click', setGeoValue);
        SettingsDBCache.observe(GEOLOCATION_KEY, false, updateGeoInfo);
      },

      onShow(panel, options) {
        if (!(options.visibilityChange || Settings.isBackHref)) {
          SettingsDBCache.getSetting(GEOLOCATION_KEY).then(value => {
            const liItem = panel.querySelectorAll('li');
            if (value) {
              ListFocusHelper.requestFocus(panel, liItem[0]);
            } else {
              ListFocusHelper.requestFocus(panel, liItem[1]);
            }
          });
        }
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        elements.switchOn.removeEventListener('click', setGeoValue);
        elements.switchOff.removeEventListener('click', setGeoValue);
        SettingsDBCache.unobserve(GEOLOCATION_KEY, updateGeoInfo);
      }
    });
  };
});
