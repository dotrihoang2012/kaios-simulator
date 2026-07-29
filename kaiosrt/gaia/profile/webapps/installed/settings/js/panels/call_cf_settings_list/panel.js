
define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createCallForwardingListPanel() {
    let elements = null;
    let serviceId = 0;

    function handleClick(evt) {
      evt.stopPropagation();
      const options = {
        'li-voice-call': 'voice',
        'li-video-call': 'video'
      };

      const type = options[evt.target.id] || 'voice';
      Settings.setCurrentPanel('#call_cf_settings', {
        type,
        serviceId
      });
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          voiceCallElement: panel.querySelector('#li-voice-call'),
          videoCallElement: panel.querySelector('#li-video-call')
        };
      },

      onBeforeShow(panel, options) {
        serviceId = options.serviceId || serviceId;
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        elements.voiceCallElement.addEventListener('click', handleClick);
        elements.videoCallElement.addEventListener('click', handleClick);
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        elements.voiceCallElement.removeEventListener('click', handleClick);
        elements.videoCallElement.removeEventListener('click', handleClick);
      }
    });
  };
});
