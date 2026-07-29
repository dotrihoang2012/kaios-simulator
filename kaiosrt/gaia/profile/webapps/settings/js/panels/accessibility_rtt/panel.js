
define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createAccessibilityRttPanel() {
    const RTT_ENABLED = 'ril.rtt.enabled';
    const RTT_PREFERRED_ENABLED = 'ril.rtt.preferredSettings';
    let elements = null;

    function handleChange(value, key) {
      if (key === RTT_ENABLED) {
        elements.rttPreference.classList.toggle('hidden', !value);
      } else if (key === RTT_PREFERRED_ENABLED) {
        elements.rttPreferenceSelect.value = value;
      }
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    return SettingsPanel({
      onInit: function onInit(panel) {
        elements = {
          rttPreference: panel.querySelector(
            '#accessaccessibility-rtt-preference'
          ),
          rttPreferenceSelect: panel.querySelector(
            '#accessaccessibility-rtt-preference select'
          )
        };
      },

      onBeforeShow() {
        SettingsDBCache.observe(RTT_ENABLED, false, handleChange);
        SettingsDBCache.observe(
          RTT_PREFERRED_ENABLED,
          'visible-during-calls',
          handleChange
        );
        SettingsSoftkey.show();
      },

      onBeforeHide() {
        SettingsDBCache.unobserve(RTT_ENABLED, handleChange);
        SettingsDBCache.unobserve(RTT_PREFERRED_ENABLED, handleChange);
      }
    });
  };
});
