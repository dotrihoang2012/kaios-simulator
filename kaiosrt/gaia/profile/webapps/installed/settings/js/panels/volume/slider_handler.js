/* global ObjectURL AppOrigin*/

define([],function() { // eslint-disable-line
  const TONEKEYS = {
    content: 'media.ringtone',
    notification: 'dialer.ringtone',
    alarm: 'alarm.ringtone'
  };

  const VIBRATION_KEY = 'vibration.enabled';

  const SliderHandler = function SliderHandler() {
    this.liContainer = null;
    this.inputElement = null;
    this.levelLabel = null;
    this.channelType = '';
    this.channelKey = '';
    this.toneKey = '';
    this.previous = null;
    this.preVibrate = false;
    this.lock = false;
    this.player = new Audio();
    this.playerUrl = null;
  };

  SliderHandler.prototype = {
    init: function init(container, channelType) {
      this.liContainer = container;
      this.inputElement = container.querySelector('input');
      this.levelLabel = container.querySelector('span.level');
      this.channelType = channelType;
      this.channelKey = `audio.volume.${channelType}`;
      this.toneKey = TONEKEYS[channelType];

      this.boundSetSliderValue = function boundSetSliderValue(value) {
        if (value === this.previous) {
          this.lock = false;
        }
        this.volumeValue = value;
        this.setSliderValue(value);
        this.updateLabel();
      }.bind(this);

      // Get the volume value for the slider, also observe the value change.
      SettingsDBCache.observe(
        this.channelKey,
        '',
        this.boundSetSliderValue.bind(this)
      );

      if (this.channelType === 'notification') {
        this.onVibrationSet = function onVibrationSet(value) {
          this.isVibrate = value;
          this.preVibrate = value;
          this.updateLabel();
        }.bind(this);
        SettingsDBCache.observe(
          VIBRATION_KEY,
          '',
          this.onVibrationSet.bind(this)
        );
      }

      this.liContainer.addEventListener(
        'keydown',
        this.keydownHandler.bind(this)
      );
    },

    isRtl: () => 'rtl' === document.dir,

    stopTone: function stopTone() {
      this.player.pause();
      this.player.removeAttribute('src');
      this.player.load();
    },

    /**
     * Play the tone
     *
     * @access private
     * @memberOf SliderHandler.prototype
     * @param  {Blob} blob tone blob
     */
    playTone: function playTone(blob) {
      if (this.channelType !== 'content') {
        this.player.mozAudioChannelType = this.channelType;
      }
      if (this.playerUrl) {
        ObjectURL.revokeObjectByURL(this.playerUrl);
      }
      this.playerUrl = ObjectURL.createURLByBlob(blob);
      this.player.src = this.playerUrl;
      this.player.load();
      this.player.loop = false;
      this.player.play();
    },

    setSliderValue: function setSliderValue(value) {
      this.inputElement.value = value;

      if (this.inputElement.style.opacity !== 1) {
        this.inputElement.style.opacity = 1;
      }

      if (this.previous === null) {
        this.previous = value;
      }
    },

    updateLabel: function updateLabel() {
      if (this.channelType === 'notification' && this.volumeValue === 0) {
        this.levelLabel.textContent = l10n.get(
          this.isVibrate ? 'vibrate' : 'silent'
        );
      } else {
        this.levelLabel.textContent = `${this.volumeValue}/${this.inputElement.max}`;
      }
    },

    getToneByURL: function getToneByURL(toneURL, callback) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', toneURL);
      xhr.overrideMimeType('audio/ogg');
      xhr.responseType = 'blob';
      xhr.send();
      xhr.onload = () => {
        callback(xhr.response);
      };
    },

    getToneBlob: function getToneBlob(callback) {
      SettingsDBCache.getSetting(this.toneKey).then(value => {
        if (value.startsWith(AppOrigin.getProtocol())) {
          this.getToneByURL(value, blob => {
            callback(blob);
          });
        } else {
          // Only ringtones can save in sdcard, media and alarm could not changed by user.
          const storage = ApiManager.getDeviceStorage('sdcard');
          const request = storage.get(value);
          request.onsuccess = () => {
            callback(request.result);
          };
          request.onerror = () => {
            DebugHelper.log('The ring tone file get failed.');
            SettingsDBCache.getSettings(
              [
                'dialer.ringtone.default',
                'dialer.ringtone.name.default',
                'dialer.ringtone.id.default'
              ],
              results => {
                this.getToneByURL(results['dialer.ringtone.default'], blob => {
                  callback(blob);
                });

                const cSet = {};
                cSet['dialer.ringtone'] = results['dialer.ringtone.default'];
                cSet['dialer.ringtone.name'] =
                  results['dialer.ringtone.name.default'];
                cSet['dialer.ringtone.id'] =
                  results['dialer.ringtone.id.default'];
                SettingsDBCache.saveSettings(cSet);
              }
            );
          };
        }
      });
    },

    setVolume: function setVolume(down) {
      const settings = {};
      let value = this.volumeValue;
      if (this.lock) {
        return;
      }
      if (down) {
        value =
          this.volumeValue <= this.inputElement.min
            ? parseInt(this.inputElement.min, 10)
            : this.volumeValue - 1;
      } else if (
        this.channelType !== 'notification' ||
        this.volumeValue !== 0 ||
        this.isVibrate
      ) {
        value =
          this.volumeValue >= this.inputElement.max
            ? parseInt(this.inputElement.max, 10)
            : this.volumeValue + 1;
      }
      settings[this.channelKey] = value;
      const retval = this.shouldUpdateVibration(down);
      if (retval.update) {
        if (
          retval.isVibrate &&
          !value &&
          (this.preVibrate !== retval.isVibrate || value !== this.previous)
        ) {
          navigator.vibrate(200);
        }
        settings[VIBRATION_KEY] = retval.isVibrate;
        this.preVibrate = retval.isVibrate;
      }
      // Only set the new value if it does not equal to the previous one.
      if (value !== this.previous || retval.update) {
        SettingsDBCache.saveSettings(settings);
        this.lock = true;
        this.previous = value;
      }
    },

    shouldUpdateVibration: function shouldUpdateVibration(down) {
      const retval = {};
      retval.isVibrate = false;
      retval.update = false;
      if (this.channelType === 'notification') {
        if (down) {
          if (this.previous === 1 || this.previous === 0) {
            retval.isVibrate = this.previous === 1;
            retval.update = true;
          }
        } else if (this.previous === 0 && !this.preVibrate) {
          retval.isVibrate = true;
          retval.update = true;
        }
      }
      return retval;
    },

    keydownHandler: function keydownHandler(event) {
      // Add support to RTL
      const directions = this.isRtl()
        ? ['ArrowRight', 'ArrowLeft']
        : ['ArrowLeft', 'ArrowRight'];
      switch (directions.indexOf(event.key)) {
        case 0:
          this.setVolume(true);
          if (this.volumeValue > 1) {
            this.getToneBlob(blob => {
              this.playTone(blob);
            });
          }
          break;
        case 1:
          this.setVolume(false);
          this.getToneBlob(blob => {
            this.playTone(blob);
          });
          break;

        default:
          this.stopTone();
          break;
      }
    }
  };

  return function createSliderHandler() {
    return new SliderHandler();
  };
});
