/* global ObjectURL */

define(['require','modules/settings_panel','panels/volume/slider_handler'],function(require) { // eslint-disable-line
  const SettingsPnl = require('modules/settings_panel');
  const SliderHandler = require('panels/volume/slider_handler');

  return function createVolumePanel() {
    let elements = {};
    const handlers = {
      content: null,
      notification: null,
      alarm: null
    };
    const speakerManager = new ApiManager.SpeakerManager();
    speakerManager.onspeakerforcedchange = () => {
      speakerManager.forcespeaker = speakerManager.speakerforced;
    };

    const keydownHandle = function keydownHandle(evt) {
      if (evt.key === 'Enter') {
        if (evt.target.classList.contains('slider-container')) {
          evt.stopPropagation();
          evt.preventDefault();
        }
      }
    };

    return SettingsPnl({
      onInit(panel) {
        elements = {
          media: panel.querySelector('#volume-media'),
          notification: panel.querySelector('#volume-notification'),
          alarm: panel.querySelector('#volume-alarm')
        };
        if (!handlers.content) {
          handlers.content = SliderHandler();
          handlers.content.init(elements.media, 'content');
          handlers.notification = SliderHandler();
          handlers.notification.init(elements.notification, 'notification');
          handlers.alarm = SliderHandler();
          handlers.alarm.init(elements.alarm, 'alarm');
        }
      },
      onBeforeShow() {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        handlers.notification.updateLabel();
        window.addEventListener('keydown', keydownHandle, true);
      },
      onBeforeHide() {
        SettingsSoftkey.hide();
        handlers.content.stopTone();
        handlers.notification.stopTone();
        handlers.alarm.stopTone();
        window.removeEventListener('keydown', keydownHandle, true);
      },
      onUninit() {
        if (handlers.content.playerUrl) {
          ObjectURL.revokeObjectByURL(handlers.content.playerUrl);
        }
        if (handlers.notification.playerUrl) {
          ObjectURL.revokeObjectByURL(handlers.notification.playerUrl);
        }
        if (handlers.alarm.playerUrl) {
          ObjectURL.revokeObjectByURL(handlers.alarm.playerUrl);
        }
      }
    });
  };
});
