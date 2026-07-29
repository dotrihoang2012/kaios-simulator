'use strict';
/* global SettingsObserver */
/* global Service*/

(function(exports) {

  /**
   * Accessibility enables and disables the screenreader after the user
   * gestures using the hardware buttons of the phone. To toggle the setting.
   * the user must press volume up, then volume down three times in a row.
   * @class Accessibility
   * @requires SettingsObserver
   */
  function Accessibility() {}

  Accessibility.prototype = {

    name: 'Accessibility',

    /**
     * Cap the full range of contrast. Actual -1 is completely gray, and 1
     * makes things hard to see. This value is the max/min contrast.
     */
    CONTRAST_CAP: 0.6,

    /**
     * Timeout (in milliseconds) between when a vc-change event fires
     * and when interaction hints (if any) are spoken
     */
    HINTS_TIMEOUT: 2000,

    SOFTKEY_UPDATE_TIMEOUT: 2000,
    /**
     * Current counter for button presses in short succession.
     * @type {Number}
     * @memberof Accessibility.prototype
     */
    counter: 0,

    softKeys: undefined,
    /**
     * Expected complete time stamp.
     * @type {Number}
     * @memberof Accessibility.prototype
     */
    expectedCompleteTimeStamp: 0,

    /**
     * Accessibility settings to be observed.
     * @type {Object} name: value pairs.
     * @memberof Accessibility.prototype
     */
    settings: {
      'accessibility.screenreader': false,
      'accessibility.screenreader-volume': 1,
      'accessibility.screenreader-rate': 0,
      'accessibility.colors.enable': false,
      'accessibility.colors.invert': false,
      'accessibility.colors.grayscale': false,
      'accessibility.colors.contrast': '0.0'
    },

    /**
     * Audio used by the screen reader.
     * Note: Lazy-loaded when first needed
     * @type {Object}
     * @memberof Accessibility.prototype
     */
    sounds: {
      clickedAudio: null,
      vcKeyAudio: null,
      vcMoveAudio: null,
      noMoveAudio: null
    },

    /**
     * URLs for screen reader audio files.
     * @type {Object}
     * @memberof Accessibility.prototype
     */
    soundURLs: {
      clickedAudio: './resources/sounds/screen_reader_clicked.ogg',
      vcKeyAudio: './resources/sounds/screen_reader_virtual_cursor_key.ogg',
      vcMoveAudio: './resources/sounds/screen_reader_virtual_cursor_move.ogg',
      noMoveAudio: './resources/sounds/screen_reader_no_move.ogg'
    },

    /**
     Copy from nsIAccessibleRole in gecko
     */
    AccessibleRole: {
      ROLE_PASSWORD_TEXT: 82
    },
    /**
     * Start listening for events.
     * @memberof Accessibility.prototype
     */
    start: function ar_init() {

      this.screen = document.getElementById('screen');

      this.speechSynthesizer = speechSynthesizer;


      window.addEventListener('accessibility-output', this);
      window.addEventListener('logohidden', this);
      window.addEventListener('screenchange', this);

      // XXX: This is a hack because navigation is done in navigation_xxxx.js.
      // It shall be done in value selector itself.
      document.addEventListener('focusChanged', (evt) => {
        this.announceElement(evt.detail.focusedElement);
      });

      Service.register('speak', this);
      Service.register('cancelSpeech', this);
      Service.register('announceElement', this);
      Service.register('startCustomAccessOutput', this);
      Service.register('stopCustomAccessOutput', this);
      Service.register('currentSoftKeyUpdate', this);
      Service.registerState('screenReaderEnabled', this);
      Service.registerState('callerIdReadoutOption', this);

      // Attach all observers.
      Object.keys(this.settings).forEach(function attach(settingKey) {
        SettingsObserver.observe(settingKey, this.settings[settingKey],
          function observe(aValue) {
            this.settings[settingKey] = aValue;
            switch (settingKey) {
              case 'accessibility.screenreader':
                // Show Accessibility panel if it is not already visible
                if (aValue) {
                  SettingsObserver.setValue([{
                    name: 'accessibility.screenreader-show-settings',
                    value: true
                  }]);
                } else {
                  this.cancelHints();
                }
                break;

              case 'accessibility.colors.enable':
                SettingsObserver.setValue([{
                  name: 'layers.effect.invert',
                  value: aValue ?
                    this.settings['accessibility.colors.invert'] : false
                }, {
                  name: 'layers.effect.grayscale',
                  value: aValue ?
                    this.settings['accessibility.colors.grayscale'] : false,
                }, {
                  name: 'layers.effect.contrast',
                  value: aValue ?
                    this.settings['accessibility.colors.contrast'] *
                    this.CONTRAST_CAP : '0.0'
                }]);
                break;
              case 'accessibility.colors.invert':
              case 'accessibility.colors.grayscale':
              case 'accessibility.colors.contrast':
                if (this.settings['accessibility.colors.enable']) {
                  var effect = settingKey.split('.').pop();
                  if (effect === 'contrast') {
                    SettingsObserver.setValue([{
                      name: 'layers.effect.contrast',
                      value: aValue * this.CONTRAST_CAP
                    }]);
                  } else {
                    SettingsObserver.setValue([{
                      name: 'layers.effect.' + effect,
                      value: aValue
                    }]);
                  }
                }
                break;
            }
          }.bind(this));
      }, this);
    },

    /**
     * Play audio for a screen reader notification.
     * @param  {String} aSoundKey a key for the screen reader audio.
     * XXX: When Bug 848954 lands we should be able to use Web Audio API.
     * @memberof Accessibility.prototype
     */
    _playSound: function ar__playSound(aSoundKey) {
      if (!this.sounds[aSoundKey]) {
        this.sounds[aSoundKey] = new Audio(this.soundURLs[aSoundKey]);
        this.sounds[aSoundKey].load();
      }
      var audio = this.sounds[aSoundKey].cloneNode(false);
      audio.volume = this.volume;
      audio.play();
    },

    /**
     * Get current screen reader volume defined by the setting.
     * @return {Number} Screen reader volume within the [0, 1] interval.
     * @memberof Accessibility.prototype
     */
    get volume() {
      return this.settings['accessibility.screenreader-volume'];
    },

    /**
     * Get current screen reader speech rate defined by the setting.
     * @return {Number} Screen reader rate within the [0.2, 10] interval.
     * @memberof Accessibility.prototype
     */
    get rate() {
      var rate = this.settings['accessibility.screenreader-rate'];
      return rate >= 0 ? rate + 1 : 1 / (Math.abs(rate) + 1);
    },

    /**
     * Start a timeout that waits to display hints
     * @memberof Accessibility.prototype
     */
    setHintsTimeout: function ar_setHintsTimeout() {
      this.cancelHints();
      this.hintsTimer = setTimeout(() => {
        this.hintsTimer = null;
        if (!this.settings['accessibility.screenreader']) {
          return;
        }
        this.cancelSoftKeyUpdateHints();
        var softKeys = this.getCurrentSoftKeys();
        if (softKeys && Service.query('screenEnabled')) {
          this.isSpeakingHints = true;
          this.speak(softKeys, () => {
            this.isSpeakingHints = false;
          }, {
            enqueue: true
          });
        }
      }, this.HINTS_TIMEOUT);
    },

    /**
     * Handle accessibility-output.
     * @param  {Object} AccessFu details object.
     * @memberof Accessibility.prototype
     */
    handleAccessFuOutput: function ar_handleAccessFuOutput(aDetails) {
      var options = aDetails.options || {};
      window.dispatchEvent(new CustomEvent('accessibility-action'));
      switch (aDetails.eventType) {
        case 'vc-change':
          // Vibrate when the virtual cursor changes.
          navigator.vibrate(options.pattern);
          this._playSound(options.isKey ? 'vcKeyAudio' : 'vcMoveAudio');
          break;
        case 'action':
          if (aDetails.data[0].string === 'clickAction') {
            // If element is clicked, play 'click' sound instead of speech.
            this._playSound('clickedAudio');
            return;
          }
          break;
        case 'no-move':
          this._playSound('noMoveAudio');
          return;
        case 'text-change':
          if (options.role === this.AccessibleRole.ROLE_PASSWORD_TEXT) {
            if (options.isInserted === true) {
              navigator.vibrate(100);
            }
            return;
          }
          break;
        case 'announcement':
          if (Service.query('isFtuRunning') && 'screenReaderStarted' ===
            (aDetails.data.length && aDetails.data[0].string)) {
            return;
          }
          break;
      }
      this.cancelHints();
      if (Service.query('screenEnabled')) {
        this.inAccessFuOutput = true;
        this.speak(aDetails.data, function hintsCallback() {
          this.inAccessFuOutput = false;
          if (aDetails.data.length) {
            this.setHintsTimeout();
          }
        }.bind(this), {
          enqueue: options.enqueue
        });
      }
    },

    /**
     * Listen for screen change events and stop speaking if the
     * screen is disabled (in 'off' state)
     * @memberof Accessibility.prototype
     */
    handleScreenChange: function ar_handleScreenChange(aDetail) {
      if (!aDetail.screenEnabled) {
        this.cancelHints();
        this.cancelSpeech();
      }
    },

    /**
     * Remove aria-hidden from the screen element to make content accessible to
     * the screen reader.
     * @memberof Accessibility.prototype
     */
    activateScreen: function ar_activateScreen() {
      // Screen reader will not say anything until the splash animation is
      // hidden and the aria-hidden attribute is removed from #screen.
      this.screen.removeAttribute('aria-hidden');
      window.removeEventListener('logohidden', this);
    },

    /**
     * Handle event.
     * @param  {Object} aEvent accessibility-output/logohidden/
     * @memberof Accessibility.prototype
     */
    handleEvent: function ar_handleEvent(aEvent) {
      switch (aEvent.type) {
        case 'screenchange':
          this.handleScreenChange(aEvent.detail);
          break;
        case 'logohidden':
          this.activateScreen();
          break;
        case 'accessibility-output':
          this.handleAccessFuOutput(JSON.parse(aEvent.detail));
          break;
      }
    },

    setSoftKeyUpdateHints: function ar_setSoftKeyUpdateHints() {
      const topMostUI = Service.query('getTopMostUI');
      if (topMostUI && topMostUI.name === 'InstantSettings') {
        return;
      }
      this.cancelSoftKeyUpdateHints();
      this.softkeyUpdateHintsTimer = setTimeout(() => {
        this.softkeyUpdateHintsTimer = null;
        if (!this.settings['accessibility.screenreader'] ||
          this.hintsTimer || this.inAccessFuOutput) {
          return;
        }
        let softKeys = this.getCurrentSoftKeys();
        if (softKeys && Service.query('screenEnabled')) {
          this.isSpeakingHints = true;
          this.speak(softKeys, () => {
            this.isSpeakingHints = false;
          }, {
            enqueue: true
          });
        }
      }, this.SOFTKEY_UPDATE_TIMEOUT);
    },

    cancelSoftKeyUpdateHints: function ar_cancelSoftKeyUpdateHints() {
      clearTimeout(this.softkeyUpdateHintsTimer);
      this.softkeyUpdateHintsTimer = null;
      if (this.isSpeakingHints) {
        this.cancelSpeech();
        this.isSpeakingHints = false;
      }
    },

    currentSoftKeyUpdate: function ar_currentSoftKeyUpdate() {
      this.setSoftKeyUpdateHints();
    },

    getCurrentSoftKeys: function ar_getCurrentSoftKeys() {
      // Get softkeys from top window.
      const _ = window.api.l10n.get;
      let keysInfo;
      if (Service.query('SoftKeyManager.isActive')) {
        const metaName = 'og:kaios:softkeyinfo';
        const softkeyInfoMeta = document.head.querySelector(
          `meta[name="${metaName}"]`
        );
        keysInfo = softkeyInfoMeta && softkeyInfoMeta.content;
      } else {
        if (Service.query('getTopMostUI').name === 'SystemDialogManager' &&
          Service.query('getTopMostUI').states.activeDialog.getSoftkeys) {
          keysInfo =
            Service.query('getTopMostUI').states.activeDialog.getSoftkeys();
        } else {
          keysInfo = Service.query('getTopMostWindow').getSoftkeys();
        }
      }
      const keysIdArray = ['SoftLeft', 'Enter', 'SoftRight'];
      keysIdArray.forEach(keysId => {
        const key = `${keysId}:`;
        keysInfo = keysInfo.replace(key, `${_(keysId)}:`);
      });
      return keysInfo;
    },
    /**
     * Check for Hints speech/timer and clear.
     * @memberof Accessibility.prototype
     */
    cancelHints: function ar_cancelHints() {
      clearTimeout(this.hintsTimer);
      this.hintsTimer = null;
      if(this.isSpeakingHints){
        this.cancelSpeech();
        this.isSpeakingHints = false;
      }
    },

    announceElement: function ar_announceElement(element) {
      if (!element) return;
      var evt = new CustomEvent('custom-accessible', {
        detail: { domNode: element }
      });
      window.dispatchEvent(evt);
    },

    startCustomAccessOutput: function ar_announceElement() {
      var evt = new CustomEvent('start-custom-access-output');
      window.dispatchEvent(evt);
    },

    stopCustomAccessOutput: function ar_announceElement() {
      var evt = new CustomEvent('stop-custom-access-output');
      window.dispatchEvent(evt);
    },

    screenReaderEnabled: function ar_screenReaderEnabled() {
      return this.settings['accessibility.screenreader'];
    },

    callerIdReadoutOption: function ar_calleridReadoutEnabled() {
      return this.settings['accessibility.callid_readout'];
    },
    /**
     * Use speechSynthesis to speak screen reader utterances.
     * @param  {?Array} aData Speech data before it is localized.
     * @param  {?Function} aCallback aCallback A callback after the speech
     * synthesis is completed.
     * @param  {?Object} aOptions = {} Speech options such as enqueue etc.
     * @memberof Accessibility.prototype
     */
    speak: function ar_speak(aData, aCallback, aOptions = {}) {
      if (aOptions.repeat) {
        this.isRepeating = true;
        this.repeatData = aData;
        this.repeatOptions = aOptions;
        this.repeatCallback = aCallback;
        this.speechSynthesizer.speak(aData, aOptions, this.rate, this.volume,
          this.repeating.bind(this));
      } else {
        this.speechSynthesizer.speak(aData, aOptions, this.rate, this.volume,
          aCallback);
      }
    },

    repeating: function ar_endSpeech() {
      if (this.isRepeating) {
        this.repeatingTimer = window.setTimeout(() => {
          this.speechSynthesizer.speak(this.repeatData, this.repeatOptions,
            this.rate, this.volume, this.repeating.bind(this));
        }, 500);
      } else {
        this.repeatCallback();
        this.repeatCallback = null;
      }
    },

    /**
     * Cancel any utterances currently being spoken by speechSynthesis.
     * @memberof Accessibility.prototype
     */
    cancelSpeech: function ar_cancelSpeech() {
      if (this.isRepeating) {
        window.clearTimeout(this.repeatingTimer);
        this.repeatingTimer = null;
        this.isRepeating = false;
        this.repeatData = null;
        this.repeatOptions = null;
      }
      this.speechSynthesizer.cancel();
    }
  };

  /**
   * A speech synthesizer component that handles speech localization and
   * pronunciation.
   * @type {Object}
   */
  var speechSynthesizer = {
    /**
     * Speech Synthesis
     * @type {Object}
     * @memberof speechSynthesizer
     */
    get speech() {
      delete this.speech;
      // If there are no voices bundled, consider speech synthesis unavailable.
      if (!window.speechSynthesis ||
        window.speechSynthesis.getVoices().length === 0) {
        this.speech = null;
      }
      this.speech = window.speechSynthesis;
      return this.speech;
    },

    /**
     * Speech utterance
     * @type {Object}
     * @memberof speechSynthesizer
     */
    get utterance() {
      delete this.utterance;
      this.utterance = window.SpeechSynthesisUtterance;
      return this.utterance;
    },

    /**
     * Cancel speech if the screen reader is speaking.
     * @memberof speechSynthesizer
     */
    cancel: function ss_cancel() {
      if (this.speech) {
        this.speech.cancel();
      }
    },

    /**
     * Localize speech data.
     * @param  {Object} aDetails Speech data object.
     * @return {String} Localized speech data.
     * @memberof speechSynthesizer
     */
    localize: function ss_localize(aDetails) {
      if (!aDetails || typeof aDetails === 'string') {
        return aDetails;
      }
      var string = aDetails.string;
      var data = {
        count: aDetails.count
      };
      if (!string) {
        return '';
      } else {
        string = `accessibility-${string}`;
      }

      if (aDetails.args) {
        data = aDetails.args.reduce(function(aData, val, index) {
          aData[index] = val;
          return aData;
        }, data);
      }
      return window.api.l10n.get(string, data);
    },

    /**
     * Build a complete utterance string by localizing an array of speech data.
     * @param  {?Array} aData Speech data.
     * @return {String} A complete localized string from speech array data.
     * @memberof speechSynthesizer
     */
    buildUtterance: function ss_buildUtterance(aData) {
      if (!Array.isArray(aData)) {
        aData = [aData];
      }
      var words = [], localize = this.localize;
      aData.reduce(function(words, details) {
        var localized = localize(details);
        if (localized) {
          var word = localized.trim();
          if (word) {
            words.push(word);
          }
        }
        return words;
      }, words);

      return words.join(' ');
    },

    /**
     * Utter a message with a speechSynthesizer.
     * @param {?Array} aData A messages array to be localized.
     * @param {JSON} aOptions Options to be used when speaking. For example: {
     *   enqueue: false
     * }
     * @param {Number} aRate Speech rate.
     * @param {Number} aVolume Speech volume.
     * @param {Function} aCallback A callback after the speech synthesis is
     * completed.
     * @memberof speechSynthesizer
     */
    speak: function ss_speak(aData, aOptions, aRate, aVolume, aCallback) {
      if (!this.speech || !this.utterance) {
        if (aCallback) {
          aCallback();
        }
        return;
      }

      if (!aOptions.enqueue) {
        this.cancel();
      }

      var sentence = this.buildUtterance(aData);
      if (!sentence) {
        if (aCallback) {
          aCallback();
        }
        return;
      }

      var utterance = new this.utterance(sentence);
      utterance.volume = aVolume;
      utterance.rate = aRate;
      utterance.addEventListener('end', function() {
        if (aCallback) {
          aCallback();
        }
      }.bind(this));

      this.speech.speak(utterance);
    }
  };

  exports.Accessibility = Accessibility;

}(window));
