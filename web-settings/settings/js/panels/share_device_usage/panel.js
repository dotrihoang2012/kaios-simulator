
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createShareDeviceUsagePanel() {
    const LYF_PRIVACY_KEY = 'jio.phone.monitor.enabled';
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

    function updateLyfPrivacyInfo(enabled) {
      currentSettingsValue = enabled;
      elements.switchOn.checked = enabled;
      elements.switchOff.checked = !enabled;
      elements.lyfPrivacyDesc.setAttribute(
        'data-l10n-id',
        enabled ? 'on' : 'off'
      );
    }

    function setLyfPrivacy(evt) {
      const enabled = evt.target.value === 'true' || false;
      if (currentSettingsValue === enabled) {
        NavigationMap.navigateBack();
        return;
      }

      const option = {};
      option[LYF_PRIVACY_KEY] = enabled;
      SettingsDBCache.saveSettings(option);
      ToastHelper.showToast('changessaved');
      NavigationMap.navigateBack();
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          switchOn: panel.querySelector('#lyf-privacy-switch-on'),
          switchOff: panel.querySelector('#lyf-privacy-switch-off'),
          lyfPrivacyDesc: panel.querySelector('#lyf-privacy-desc')
        };
      },

      onBeforeShow() {
        SettingsSoftkey.init(softkeyParams);
        SettingsSoftkey.show();
        elements.switchOn.addEventListener('click', setLyfPrivacy);
        elements.switchOff.addEventListener('click', setLyfPrivacy);
        SettingsDBCache.observe(LYF_PRIVACY_KEY, true, updateLyfPrivacyInfo);
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        elements.switchOn.removeEventListener('click', setLyfPrivacy);
        elements.switchOff.removeEventListener('click', setLyfPrivacy);
        SettingsDBCache.unobserve(LYF_PRIVACY_KEY, updateLyfPrivacyInfo);
      }
    });
  };
});
