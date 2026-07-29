
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createAboutLegalPanel() {
    let elements = null;

    function updateLyfItem(value) {
      if (value) {
        elements.lyfCertificateItem.classList.remove('hidden');
        elements.lyfPrivacyItem.classList.remove('hidden');
      } else {
        elements.lyfCertificateItem.classList.add('hidden');
        elements.lyfPrivacyItem.classList.add('hidden');
      }
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          lyfCertificateItem: panel.querySelector('#lyf-certificate-item'),
          lyfPrivacyItem: panel.querySelector('#lyf-privacy-item')
        };
      },
      onBeforeShow() {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        SettingsDBCache.observe('legal.lyf.show', false, updateLyfItem);
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        SettingsDBCache.unobserve('legal.lyf.show', updateLyfItem);
      }
    });
  };
});
