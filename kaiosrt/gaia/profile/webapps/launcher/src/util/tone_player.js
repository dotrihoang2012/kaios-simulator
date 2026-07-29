/* globals AudioContext */

/* exported TonePlayer */

const kMasterVolume = 0.5;
const kToneVolume = 0.7;
const kShortPressDuration = 0.15;
const kAttackDuration = 0.025;
const kDecayDuration = 0.025;
const kReleaseDuration = 0.05;

const TonePlayer = {
  _audioContext: null,
  _channel: null,
  _gainNode: null,
  _playingNodes: [],
  _initialized: false,
  _audibleNodeCount: 0,

  /**
   * Initializes the tone player by specifying which channel will be used to
   * play sounds. The TonePlayer will lazily create an AudioContext to play
   * sounds when needed and automatically dispose of it when the application is
   * hidden. However if the 'telephony' channel is used then we'll keep the
   * AudioContext around as long as there's an active call.
   *
   * @param channel {String} The default channel used to play sounds.
   */
  init: function tp_init(channel) {
    this._reset();
    this._channel = channel;
    this._initialized = true;
  },

  /**
   * Reset all internal state to its default value.
   */
  _reset: function tp_reset() {
    if (this._audioContext) {
      this._audioContext.close();
      this._audioContext = null;
    }
    this._gainNode = null;
    this._playingNodes = [];
    this._audibleNodeCount = 0;
  },

  _ensureAudio: function tp_ensureAudio() {
    if (this._audioContext || !this._initialized) {
      return;
    }

    if (this._channel) {
      this._audioContext = new AudioContext({ audioChannel: this._channel });
    } else {
      // If no channel was specified stick with the default one.
      this._audioContext = new AudioContext();
    }
  },

  // Pass 0.0 for |when| to play as soon as possible.
  // Pass 0.0 for |duration| to make the tone play until stop is called.
  _startAt: function tp_startAt(frequencies, when, duration) {
    this._audioContext.forceAudioChannelPlaying &&
      this._audioContext.forceAudioChannelPlaying(true);

    let context = this._audioContext;
    let sampleRate = context.sampleRate;
    let envelope =
      context.createBuffer(1, (duration || 0.05) * sampleRate, sampleRate);
    // ADSR
    for (let i = 0; i < envelope.length; i++) {
      let factor = kToneVolume;
      let t = i / sampleRate;
      if (t <= kAttackDuration) {
        factor = t / kAttackDuration;
      } else if (t - kAttackDuration <= kDecayDuration) {
        factor = 1.0 - (((1.0 - kToneVolume) *
          (t - kAttackDuration)) / kDecayDuration);
      }
      if (!duration) {
        // The envelope buffer contains the difference from the sustain value
        factor -= kToneVolume;
      } else if (t > duration - kReleaseDuration) {
        factor *= (duration - t) / kReleaseDuration;
      }
      envelope.getChannelData(0)[i] = factor * kMasterVolume;
    }

    let gainNode = context.createGain();
    gainNode.connect(context.destination);
    if (!duration) {
      // For long presses, the gainNode will be used to release the tone.
      this._gainNode = gainNode;
    }

    let envelopeNode = context.createBufferSource();
    envelopeNode.buffer = envelope;
    envelopeNode.start(when);
    envelopeNode.connect(gainNode.gain);

    // Set the gain which will be summed with the envelope buffer values
    // and will be the constant gain at the end of the tone envelope.  For
    // tones with duration, the envelope covers the entire tone, so the gain
    // at the end is zero.  For tones with no duration, the envelope covers
    // only the attack and delay phases after which the gain is the sustain
    // value.
    gainNode.gain.setValueAtTime(duration ? 0.0 : kToneVolume * kMasterVolume,
                                 0.0);

    for (let i = 0; i < frequencies.length; ++i) {
      let oscNode = this._audioContext.createOscillator();

      // Make sure AudioContext is closed when the last oscillator node ends.
      this._audibleNodeCount++;
      oscNode.onended = () => {
        this._audibleNodeCount--;
        if (this._audibleNodeCount === 0) {
          this._reset();
        }
      };

      oscNode.type = 'sine';
      oscNode.frequency.value = frequencies[i];
      oscNode.start(when);
      if (duration) {
        // If starting immediately, then add some extra time to allow the tone
        // to start, so that the tone doesn't stop short of the end of the
        // envelope.
        oscNode.stop(Math.max(when, context.currentTime + 0.5) + duration);
      } else {
        this._playingNodes.push(oscNode);
      }
      oscNode.connect(gainNode);
    }
  },

  start: function tp_start(frequencies, shortPress) {
    this._ensureAudio();
    this._startAt(frequencies, 0, shortPress ? kShortPressDuration : 0);
  },

  stop: function tp_stop() {
    if (!this._gainNode) {
      return;
    }
    let context = this._audioContext;
    let sampleRate = context.sampleRate;
    let gain = this._gainNode.gain;
    this._gainNode = null;

    let ramp =
      context.createBuffer(1, kReleaseDuration * sampleRate, sampleRate);
    for (let i = 0; i < ramp.length; i++) {
      ramp.getChannelData(0)[i] =
        (((ramp.length - i - 1) / ramp.length) * kToneVolume) * kMasterVolume;
    }

    let rampNode = context.createBufferSource();
    rampNode.buffer = ramp;
    rampNode.start();
    rampNode.connect(gain);
    // Change the current base gain from kToneVolume * kMasterVolume to 0,
    // cancelling the initial change from adding the ramp.
    gain.setValueAtTime(0.0, 0.0);

    // Stop the oscillators some time after the release ramp reaches 0.
    // Some extra time is included to allow the release to start.
    while (this._playingNodes.length) {
      this._playingNodes.pop()
        .stop(context.currentTime + kReleaseDuration + 0.5);
    }
  }
};

export default TonePlayer;
