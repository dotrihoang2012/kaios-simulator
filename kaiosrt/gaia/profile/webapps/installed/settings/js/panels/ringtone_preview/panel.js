/**
 * The panel.js file is used to implement WEA RingTone page.
 */

define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createWeaRingPanel() {
    const ringTimer = 10500;
    let timer = null;
    const weaPlayIcon = document.getElementById('play-icon');
    const softkeyParams = {
      menuClassName: 'menu-button',
      header: {
        l10nId: 'message'
      },
      items: [
        {
          name: 'Play',
          l10nId: 'ring-play',
          priority: 2,
          method() {
            setRing();
          }
        }
      ]
    };
    const params = {
      menuClassName: 'menu-button',
      header: {
        l10nId: 'message'
      },
      items: [
        {
          name: 'stop',
          l10nId: 'ring-stop',
          priority: 2,
          method() {
            setRing();
          }
        }
      ]
    };
    const SETTINGS = {
      notificationVolume: 'audio.volume.notification',
      vibration: 'vibration.enabled'
    };

    const ATTENTION_PATTERN = [4, 1, 2, 1, 2, 1, 4, 1, 2, 1, 2, 1];
    const ATTENTION_CURVE_SCALE = 100;

    const ATTENTION_SOUND_VOLUME = 0.3;
    const audioChannel = 'notification';
    const audioCtx = new AudioContext(audioChannel);
    let gainNode = null;

    /*
     * Converts from the ATTENTION_PATTERN (suitable for the Vibration API) to a
     * Float32Array suitable for the Audio API.
     *
     * The Float32Array will be interpolated so we just need to have the changes.
     * Each value will last a "unit" of time.
     */
    function getAttentionCurveWave() {
      const result = [];
      let currentValue = ATTENTION_SOUND_VOLUME;
      let sampleCount = 0;

      ATTENTION_PATTERN.forEach(duration => {
        /*
         *  Increase the attention curve's sample rate to avoid a gradual change of
         *  the volume, which can be introduced by linear interpolations between
         *  samples. See:
         *  https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setValueCurveAtTime
         */

        sampleCount = duration * ATTENTION_CURVE_SCALE;
        result.push(...Array(sampleCount).fill(currentValue));
        currentValue = ATTENTION_SOUND_VOLUME - currentValue;
      });

      return new Float32Array(result);
    }

    function ringtone() {
      const o1 = audioCtx.createOscillator();
      const o2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      const time = audioCtx.currentTime;

      o1.type = 'sine';
      o2.type = 'sine';
      o1.frequency.value = 853;
      o2.frequency.value = 960;

      o1.start();
      o2.start();
      // Eventually stop the oscillator to allow garbage collecting.
      o1.stop(time + 11);
      o2.stop(time + 11);

      const wave = getAttentionCurveWave();
      gain.gain.setValueCurveAtTime(wave, time, 11);

      o1.connect(gain);
      o2.connect(gain);
      gain.connect(audioCtx.destination);
      gainNode = gain;
    }

    function vibrate() {
      const pattern = ATTENTION_PATTERN.map(value => value * 500);
      // Vibration only works when App is in the foreground
      if (document.hidden) {
        window.addEventListener('visibilitychange', function waitOn() {
          window.removeEventListener('visibilitychange', waitOn);
          navigator.vibrate(pattern);
        });
      } else {
        navigator.vibrate(pattern);
      }
    }

    function play() {
      SettingsDBCache.getSettings(
        [SETTINGS.notificationVolume, SETTINGS.vibration],
        results => {
          if (
            results[SETTINGS.notificationVolume] &&
            !navigator.b2g.audioChannelManager.headphones
          ) {
            ringtone();
          }

          if (results[SETTINGS.vibration]) {
            vibrate();
          }
        }
      );
    }

    function stop() {
      SettingsDBCache.getSettings(
        [SETTINGS.notificationVolume, SETTINGS.vibration],
        results => {
          if (
            gainNode &&
            results[SETTINGS.notificationVolume] &&
            !navigator.b2g.audioChannelManager.headphones
          ) {
            gainNode.disconnect(audioCtx.destination);
          }

          if (results[SETTINGS.vibration]) {
            navigator.vibrate(0);
          }
        }
      );
    }

    function updateSoftkey(param) {
      SettingsSoftkey.init(param);
      SettingsSoftkey.show();
    }

    function setRing() {
      const status = weaPlayIcon.getAttribute('data-icon');
      if (status !== 'sound-max') {
        weaPlayIcon.setAttribute('data-icon', 'sound-max');
        play();
        updateSoftkey(params);
        timer = setTimeout(() => {
          weaPlayIcon.setAttribute('data-icon', '');
          updateSoftkey(softkeyParams);
        }, ringTimer);
      } else {
        weaPlayIcon.setAttribute('data-icon', '');
        stop();
        updateSoftkey(softkeyParams);
        clearTimeout(timer);
      }
    }

    return SettingsPanel({
      onBeforeShow() {
        updateSoftkey(softkeyParams);
      },

      onBeforeHide() {
        if (weaPlayIcon.getAttribute('data-icon') === 'sound-max') {
          weaPlayIcon.setAttribute('data-icon', '');
          stop();
          clearTimeout(timer);
        }
      }
    });
  };
});
