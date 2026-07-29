
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createLyfPrivacy() {
    const LYF_PRIVACY_KEY = 'jio.phone.monitor.enabled';
    let lyfPrivacyDesc = null;

    function updateLyfPrivacyInfo(enabled) {
      lyfPrivacyDesc.setAttribute('data-l10n-id', enabled ? 'on' : 'off');
    }

    function updateShareDeviceUsageMenu(value) {
      const shareDeviceUsage = document.getElementById(
        'about-share-device-usage'
      );
      const current = shareDeviceUsage.classList.contains('hidden');
      switch (value) {
        case 'show':
          shareDeviceUsage.classList.remove('hidden');
          shareDeviceUsage.removeAttribute('aria-disabled');
          break;
        case 'gray':
          shareDeviceUsage.classList.remove('hidden');
          shareDeviceUsage.setAttribute('aria-disabled', true);
          shareDeviceUsage.classList.add('none-select');
          break;
        default:
          break;
      }
      if (shareDeviceUsage.classList.contains('hidden') !== current) {
        window.dispatchEvent(new CustomEvent('refresh'));
      }
    }

    return SettingsPanel({
      onInit(panel) {
        lyfPrivacyDesc = panel.querySelector('#lyf-privacy-desc');
      },

      onBeforeShow() {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        SettingsDBCache.observe(LYF_PRIVACY_KEY, true, updateLyfPrivacyInfo);
        SettingsDBCache.observe(
          'dm.datacollector.settings.ui',
          'show',
          updateShareDeviceUsageMenu
        );
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        SettingsDBCache.unobserve(LYF_PRIVACY_KEY, updateLyfPrivacyInfo);
        SettingsDBCache.unobserve(
          'dm.datacollector.settings.ui',
          updateShareDeviceUsageMenu
        );
      }
    });
  };
});
