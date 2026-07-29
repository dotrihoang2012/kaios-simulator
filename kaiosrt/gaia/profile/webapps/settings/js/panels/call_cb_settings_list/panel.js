
define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createCallBarringListPanel() {
    let serviceId = 0;
    let elements = null;
    function navigateToSubMenu(evt) {
      evt.stopPropagation();
      const options = {
        'li-voice-call': 'voice',
        'li-video-call': 'video'
      };

      const type = options[evt.target.id] || 'voice';
      Settings.setCurrentPanel('#call_barring', {
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
        ListFocusHelper.updateSoftkey(panel);
        elements.voiceCallElement.addEventListener('click', navigateToSubMenu);
        elements.videoCallElement.addEventListener('click', navigateToSubMenu);
      },

      onBeforeHide() {
        elements.voiceCallElement.removeEventListener(
          'click',
          navigateToSubMenu
        );
        elements.videoCallElement.removeEventListener(
          'click',
          navigateToSubMenu
        );
      }
    });
  };
});
