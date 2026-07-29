
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line

  const SettingsPanel = require('modules/settings_panel');

  return function createReadoutPanel() {
    const SCREEN_READER = 'accessibility.screenreader';
    const SCREEN_READER_RATE = 'accessibility.screenreader-rate';
    let elements = {};

    function handleChange(value, key) {
      if (key === SCREEN_READER) {
        elements.rateItem.classList.toggle('hidden', !value);
        window.dispatchEvent(new CustomEvent('refresh'));
      } else if (key === SCREEN_READER_RATE) {
        elements.rateSelector.value = value;
      }
    }

    function handleEvent() {
      const { value } = elements.rateSelector;
      const cSet = {};
      cSet['accessibility.screenreader-rate'] = parseFloat(value);
      SettingsDBCache.saveSettings(cSet);
      ToastHelper.showToast('changessaved');
    }

    return SettingsPanel({
      onInit: function onInit(panel) {
        elements = {
          items: panel.querySelectorAll('li'),
          rateItem: panel.querySelector('#rate-item'),
          rateSelector: panel.querySelector('#speech-rate-select')
        };
      },

      onBeforeShow(panel) {
        SettingsDBCache.observe(SCREEN_READER, false, handleChange);
        SettingsDBCache.observe(SCREEN_READER_RATE, '0', handleChange);
        elements.rateSelector.addEventListener('change', handleEvent);
        SettingsSoftkey.init(SoftParams.defaultSelect);
        ListFocusHelper.updateSoftkey(panel);
        ListFocusHelper.addEventListener(elements.items);
      },

      onBeforeHide() {
        SettingsDBCache.unobserve(SCREEN_READER, handleChange);
        SettingsDBCache.unobserve(SCREEN_READER_RATE, handleChange);
        elements.rateSelector.removeEventListener('change', handleEvent);
        ListFocusHelper.removeEventListener(elements.items);
      }
    });
  };
});
