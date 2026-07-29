/* global RingtoneHelper */
import React from 'react';

import BaseComponent from 'base-component';

const SettingsURL = window.SettingsURL;
const withRingtone = (WrappedComponent) => {
  const FALLBACK_RINGTONE = window.AppOrigin.getOrigin('shared') +
    '/resources/media/notifications/notifier_shake.ogg';
  return class extends WrappedComponent {
    audio = new Audio();
    notificationRingtoneURL = new SettingsURL();
    dialerRingtoneURL = new SettingsURL();
    vibrationIntervalID = null;
    vibrationTimerID = null;
    soundTimerID = null;

    constructor(props) {
      super(props);
      SettingsObserver.observe('audio.volume.notification', 0,
        this['_observe_audio.volume.notification'].bind(this));
      SettingsObserver.observe('notification.ringtone', '',
        this['_observe_notification.ringtone'].bind(this));
    }

    '_observe_audio.volume.notification'(value) {
      this.silent = (0 === value);
    }

    '_observe_notification.ringtone'(value) {
      this.notificationRingtoneURL.set(value);
    }

    stopRingtone() {
      if (this.audio.paused) {
        return;
      }
      window.clearTimeout(this.soundTimerID);
      this.soundTimerID = null;
      this.audio.loop = false;
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load();
      this.debug('stop ringtone');
    }

    async setRingtone(behavior={}) {
      let soundFile = '';

      if (behavior.soundFile) {
        // "default_dialer_ringtone" is the magic id for default dialer ringtone
        if (behavior.soundFile.includes('default_dialer_ringtone')) {
          const result = await RingtoneHelper.get();
          this.dialerRingtoneURL.set(result.src);
          soundFile = this.dialerRingtoneURL.get();
        } else {
          soundFile = behavior.soundFile;
        }
      } else {
        soundFile = this.notificationRingtoneURL.get() || FALLBACK_RINGTONE;
      }

      this.stopRingtone();
      this.audio.src = soundFile;
      this.audio.mozAudioChannelType = 'notification';
      this.audio.load();

      // Loop ringtone if option is set to true.
      if (behavior.loopControl && behavior.loopControl.sound) {
        this.audio.loop = true;
      }

      this.debug(`set ringtone: ${soundFile}`);
    }

    async playRingtone(behavior={}) {
      if (this.silent) {
        this.debug('ringtone volume: 0');
        return;
      }
      if (behavior.silent) {
        this.debug('Notification.silent: true');
        return;
      }
      await this.setRingtone(behavior);
      this.audio.play();
      // Stop ringtone if sound's max duration is set.
      if (behavior.loopControl && behavior.loopControl.soundMaxDuration) {
        this.soundTimerID = window.setTimeout(() => {
          this.stopRingtone();
        }, behavior.loopControl.soundMaxDuration);
      }

      this.debug(`playing ringtone: ${this.audio.src}`);
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }
  }
};

const withVibration = (WrappedComponent) => {
  return class extends WrappedComponent {
    constructor(props) {
      super(props);
      SettingsObserver.observe('vibration.enabled', true,
        this['_observe_vibration.enabled'].bind(this));
    }

    '_observe_vibration.enabled'(value) {
      this.vibrationEnabled = value;
    }

    getVibrationPattern(behavior={}) {
      const customPattern = behavior.vibrationPattern;
      const defaultPattern = [200, 200, 200];
      return (customPattern && customPattern.length && customPattern[0] > 0)
        ? customPattern
        : defaultPattern;
    }

    vibrate(behavior={}) {
      this.debug(`this.vibrationEnabled: ${this.vibrationEnabled}`);
      if (!this.vibrationEnabled || behavior.silent) {
        return;
      }
      const pattern = this.getVibrationPattern(behavior);
      this.debug(`vibration pattern: [${pattern}]`);
      navigator.vibrate(pattern);
      // Repeat the pattern every 600ms.
      const interval = pattern.reduce((a, b) => a + b) + 600;
      // Loop vibration if option is set to true.
      if (behavior.loopControl && behavior.loopControl.vibration) {
        this.vibrationIntervalID = window.setInterval(() => {
          navigator.vibrate(pattern);
        }, interval);
      }

      // Stop vibration if max duration is set.
      if (behavior.loopControl && behavior.loopControl.vibrationMaxDuration) {
        this.vibrationTimerID = window.setTimeout(() => {
          this.stopVibration();
        }, behavior.loopControl.vibrationMaxDuration);
      }
    }

    stopVibration() {
      window.clearInterval(this.vibrationIntervalID);
      window.clearTimeout(this.vibrationTimerID);
      this.vibrationIntervalID = null;
      this.vibrationTimerID = null;
      navigator.vibrate(0);
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }
  }
};

const NotificationComponent = withVibration(withRingtone(BaseComponent));
export default NotificationComponent;
