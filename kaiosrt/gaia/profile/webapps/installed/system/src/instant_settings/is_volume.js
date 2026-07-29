/* global navigator, soundManager, SoundManager */

import BaseModule from 'base-module';
import * as utils from '../util/utils';

class InstantSettingsStore__Volume extends BaseModule {
  name = 'InstantSettingsStore__Volume';
  VOLUME_TITLE_L10N_MAPPING = {
    'content': 'is-volume-type-content',
    'telephony': 'is-volume-type-telephony',
    'alarm': 'is-volume-type-alarm',
    'notification': 'is-volume-type-notification'
  };
  VOLUME_SUBTITLE_L10N_MAPPING = {
    'vibrate': 'vibrate-only',
    'silent': 'silent'
  };
  config = {
    name: 'volume',
    icon: {
      init: 'sound-max',
    },
    icons: {
      init: 'sound-max',
      mute: 'mute-32px',
      vibrate: 'vibrate-32px',
    },
    jio_icon: {
      init: 'volume',
    },
    jio_icons: {
      init: 'volume',
      mute: 'mute',
      vibrate: 'vibrate'
    },
    isShortcut: true,
    title: 'volume',
    subtitle: '-/-',
    subtitleTranslated: true,
    softkey: {
      center: ''
    },
    maxValue: 15,
    value: 0,
    order: {
      portrait: 6,
      landscape: 6
    },
    click: this.click.bind(this)
  };

  constructor() {
    super();
    this.checkCapability();
  }

  observerSettings = [
    ...['alarm', 'notification', 'telephony', 'content', 'bt_sco']
    .map(channel => `audio.volume.${channel}`),
    'vibration.enabled',
  ];

  checkCapability() {
    this.capability = true;
  }

  // for init
  toggleObserver(active) {
    if (!this.capability || (this.hasObserver === active)) {
      return;
    }
    this.hasObserver = active;
    window[active ? 'addEventListener' : 'removeEventListener'](
      'soundManagerUpdateValue',
      this.updateValue
    );
  }

  click(key) {
    let offset;
    const isRtl = ('rtl' === document.dir);
    switch (key) {
      case 'Enter':
        if (soundManager.getChannel() === 'notification') {
          if (this.config.value) {
            soundManager.toggleVibrate();
          } else {
            soundManager.setMute(soundManager.vibrationEnabled);
          }
        } else if (soundManager.getChannel() === 'content') {
          if (this.config.value) {
            soundManager.enterSilentMode('content');
          } else {
            soundManager.leaveSilentMode('content');
          }
        }
        break;
      case 'ArrowRight':
        if (!utils.isLandscape) {
          offset = isRtl ? -1 : 1;
        }
        break;
      case 'ArrowLeft':
        if (!utils.isLandscape) {
          offset = isRtl ? 1 : -1;
        }
        break;
      case 'ArrowUp':
        if (utils.isLandscape) {
          offset = 1;
        }
        break;
      case 'ArrowDown':
        if (utils.isLandscape) {
          offset = -1;
        }
        break;
      default:
        break;
    }

    if (offset) {
      soundManager.changeVolume(offset);
    }
  }

  updateValue = () => {
    let channel = soundManager.getChannel();

    let maxValue = SoundManager.MAX_VOLUME[channel];
    let value = soundManager.currentVolume[channel];
    let title  = this.getChannelL10n(channel);
    let subtitle  = `${value}/${maxValue}`;

    this.config = { ...this.config, maxValue, value, title, subtitle };
    let icons = this.config.icons;
    let icon = this.config.icon;
    if (Service.query('isJioInstantSettings')) {
      icons = this.config.jio_icons;
      icon = this.config.jio_icon;
      this.config.softkey.right = 'settings';
    }
    if (value) {
      icon.init = icons.init;
      this.config.softkey.center = channel === 'notification' ?
        'vibrate' : 'silent';
    } else if (soundManager.vibrationEnabled && channel === 'notification') {
      icon.init = icons.vibrate;
      this.config.softkey.center = 'silent';
      this.config.subtitleTranslated = false;
      this.config.subtitle = this.getModeL10n('vibrate');
    } else {
      icon.init = icons.mute;
      this.config.softkey.center = 'volume';
      this.config.subtitleTranslated = false;
      this.config.subtitle = this.getModeL10n('silent');
    }
    this.emit('change');
  }

  getChannelL10n(channel = soundManager.getChannel()) {
    return this.VOLUME_TITLE_L10N_MAPPING[channel];
  }

  getModeL10n(mode) {
    return this.VOLUME_SUBTITLE_L10N_MAPPING[mode];
  }
}

const instantSettingsStore__Volume = new InstantSettingsStore__Volume();

export default instantSettingsStore__Volume;
