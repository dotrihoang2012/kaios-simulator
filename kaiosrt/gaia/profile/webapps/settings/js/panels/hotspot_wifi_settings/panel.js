
define('panels/hotspot_wifi_settings/panel',['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createHotspotSettings() {
    const WIFI_SSID_KEY = 'tethering.wifi.ssid';
    const WIFI_SECURITY_KEY = 'tethering.wifi.security.type';
    const WIFI_PASSWORD_KEY = 'tethering.wifi.security.password';
    let elements = null;
    let hotspotSettings = null;
    let listElements = null;

    // Validate all settings in the dialog box
    function saveHotspotSettings() {
      const cSet = {};
      cSet[WIFI_SSID_KEY] = elements.hotspotNameInput.value;
      cSet[WIFI_SECURITY_KEY] = elements.hotspotSecuritySelect.value;
      if (elements.hotspotSecuritySelect.value !== 'open') {
        cSet[WIFI_PASSWORD_KEY] = elements.hotspotPasswordInput.value;
      }
      SettingsDBCache.saveSettings(cSet);
      NavigationMap.navigateBack();
    }

    function updateSoftkey() {
      const softParams = {
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
          }
        ]
      };

      const focusElement = elements.panel.querySelector('.focus');
      if (focusElement && focusElement.id === 'hotspot-security') {
        softParams.items.push({
          name: 'Select',
          l10nId: 'select',
          priority: 2,
          method() {
            DebugHelper.debug('SettingsSoftkey select');
          }
        });
        if (elements.hotspotSecuritySelect.value !== 'open') {
          elements.hotspotPassword.classList.remove('hidden');
        } else {
          elements.hotspotPassword.classList.add('hidden');
        }
        window.dispatchEvent(new CustomEvent('refresh'));
      }
      if (!isNotSubmitable()) {
        softParams.items.push({
          name: 'Save',
          l10nId: 'save',
          priority: 3,
          method() {
            saveHotspotSettings();
          }
        });
      }

      SettingsSoftkey.init(softParams);
      SettingsSoftkey.show();
    }

    function isNotSubmitable() {
      const securityType = elements.hotspotSecuritySelect.value;
      const ssidNameLength = elements.hotspotNameInput.value.length;
      const pwdLength = elements.hotspotPasswordInput.value.length;
      return (
        (pwdLength < 8 ||
          pwdLength > 63 ||
          ssidNameLength === 0 ||
          ssidNameLength > 32) &&
        securityType !== 'open'
      );
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          panel,
          hotspotName: panel.querySelector('#hotspot-name'),
          hotspotNameInput: panel.querySelector('#hotspot-name input'),
          hotspotSecurity: panel.querySelector('#hotspot-security'),
          hotspotSecuritySelect: panel.querySelector(
            '#hotspot-security select'
          ),
          hotspotPassword: panel.querySelector('#hotspot-password'),
          hotspotPasswordInput: panel.querySelector('#hotspot-password input')
        };
        listElements = panel.querySelectorAll('li');
      },

      onBeforeShow(panel, options) {
        hotspotSettings = options.settings || hotspotSettings;
        if (!options.visibilityChange) {
          elements.hotspotNameInput.value = hotspotSettings.ssid;
          elements.hotspotPasswordInput.value = hotspotSettings.password;
          if (hotspotSettings.security === 'open') {
            elements.hotspotPassword.classList.add('hidden');
          } else {
            elements.hotspotPassword.classList.remove('hidden');
          }
          const option = `option[value="${hotspotSettings.security}"]`;
          const selectOption = elements.hotspotSecuritySelect.querySelector(
            option
          );
          if (selectOption) {
            selectOption.selected = true;
          }
        }

        elements.hotspotNameInput.addEventListener('input', updateSoftkey);
        elements.hotspotPasswordInput.addEventListener('input', updateSoftkey);
        elements.hotspotSecuritySelect.addEventListener(
          'change',
          updateSoftkey
        );
        ListFocusHelper.addEventListener(listElements, updateSoftkey);
        updateSoftkey();
      },

      onBeforeHide() {
        elements.hotspotNameInput.removeEventListener('input', updateSoftkey);
        elements.hotspotPasswordInput.removeEventListener(
          'input',
          updateSoftkey
        );
        ListFocusHelper.removeEventListener(listElements, updateSoftkey);
      }
    });
  };
});

