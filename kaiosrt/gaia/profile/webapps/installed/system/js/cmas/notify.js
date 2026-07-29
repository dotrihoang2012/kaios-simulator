/* global SettingsObserver */

(function(exports) {
  'use strict';

  const SETTINGS = {
    notificationVolume: 'audio.volume.notification',
    vibration: 'vibration.enabled'
  };

  const ATTENTION_PATTERN = [4, 1, 2, 1, 2, 1, 4, 1, 2, 1, 2, 1];
  const ATTENTION_SOUND_VOLUME = 0.3;

  function getSetting(key) {
    if (!SettingsObserver) {
      return Promise.reject(new Error('The SettingsObserver is not available.'));
    }

    return SettingsObserver.getValue(key).then(
      (result) => result
    );
  }

  function getSettings(settings) {
    return Promise.all(
      settings.map(getSetting)
    ).catch((e) => {
      // catch and log errors
      console.error('Error while retrieving settings', e.message, e);
      return settings.map(() => null);
    }).then((results) => {
      return settings.reduce((result, setting, i) => {
        result[setting] = results[i];
        return result;
      }, {});
    });
  }

  // Converts from the ATTENTION_PATTERN (suitable for the Vibration API) to a
  // Float32Array suitable for the Audio API.
  //
  // The Float32Array will be interpolated so we just need to have the changes.
  // Each value will last a "unit" of time.
  function getAttentionCurveWave() {
    var result = [];
    var currentValue = ATTENTION_SOUND_VOLUME;
    let sampleCount = 0;
    /**
     * Increase the attention curve's sample rate to avoid a gradual change of
     * the volume, which can be introduced by linear interpolations between
     * samples. See:
     * https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setValueCurveAtTime
     **/ 
    const ATTENTION_CURVE_SCALE = 100;

    ATTENTION_PATTERN.forEach(duration => {
      sampleCount = duration * ATTENTION_CURVE_SCALE;
      result.push(...Array(sampleCount).fill(currentValue));
      currentValue = ATTENTION_SOUND_VOLUME - currentValue;
    });

    return new Float32Array(result);
  }

  function ringtone() {
    var audioChannel = 'notification';
    var audioCtx = new AudioContext(audioChannel);

    var o1 = audioCtx.createOscillator();
    var o2 = audioCtx.createOscillator();
    var gain = audioCtx.createGain();

    var time = audioCtx.currentTime;
    o1.type = o2.type = 'sine';
    o1.frequency.value = 853;
    o2.frequency.value = 960;

    o1.start();
    o2.start();
    // Eventually stop the oscillator to allow garbage collecting.
    o1.stop(time + 11);
    o2.stop(time + 11);

    var wave = getAttentionCurveWave();
    gain.gain.setValueCurveAtTime(wave, time, 11);

    o1.connect(gain);
    o2.connect(gain);
    gain.connect(audioCtx.destination);
  }

  function vibrate() {
    var pattern = ATTENTION_PATTERN.map((value) => value * 500);
    // vibration only works when App is in the foreground
    if (document.hidden) {
      window.addEventListener('visibilitychange', function waitOn() {
        window.removeEventListener('visibilitychange', waitOn);
        navigator.vibrate(pattern);
      });
    } else {
      navigator.vibrate(pattern);
    }
  }

  var Notify = {
    notify: function notification_ringtone() {
      return getSettings(
        [SETTINGS.notificationVolume, SETTINGS.vibration]
      ).then((settings) => {
        if (settings[SETTINGS.notificationVolume] && !navigator.b2g.audioChannelManager.headphones) {
          ringtone();
        }

        if (settings[SETTINGS.vibration]) {
          vibrate();
        }
      });
    }
  };

  exports.Notify = Notify;
}(window));
