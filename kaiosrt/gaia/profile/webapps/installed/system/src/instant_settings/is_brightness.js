/* global navigator */

import BaseModule from 'base-module';

class InstantSettingsStore__Brightness extends BaseModule {
  name = 'InstantSettingsStore__Brightness';

  config = {
    name: 'brightness',
    icon: {
      init: 'brightness',
    },
    jio_icon: {
      init: 'brightness'
    },
    isShortcut: true,
    title: 'brightness',
    subtitle: 'percentage-number',
    subtitleArgs: {
      number: 0
    },
    observerSetting: 'screen.brightness',
    order: {
      portrait: 1,
      landscape: 2
    },
    clickType: 'toggle',
    click: this.toggle.bind(this)
  };

  brightnessMap = {
    100: 0.1,
    10: 0.4,
    40: 0.7,
    70: 1
  };

  constructor() {
    super();
    this.checkCapability();
  }

  observeCallback = (value) => {
    this.brightnessValue = value;
    this.config.subtitleArgs.number = value * 100;
    this.blocker(false);
  };

  checkCapability() {
    this.capability = true;
  }

  toggleObserver(active = true) {
    if (!this.capability || (this.hasObserver === active)) {
      return;
    }
    this.hasObserver = active;
    this.blocker(true);
    if (active) {
      SettingsObserver.observe(this.config.observerSetting, '',
        this.observeCallback);
    } else {
      SettingsObserver.unobserve(this.config.observerSetting,
        this.observeCallback);
    }
  }

  toggle() {
    if (this.isUpdating) {
      return;
    }
    this.blocker(true);

    let _brightnessValue = this.brightnessMap[this.config.subtitleArgs.number] || 0.1;
    SettingsObserver.setValue([{
      name: this.config.observerSetting,
      value: _brightnessValue
    }]);
  }

  blocker(blocking = true) {
    this.isUpdating = blocking;
    this.config.isDisabled = blocking;
    this.emit('change');
  }
}

const instantSettingsStore__Brightness = new InstantSettingsStore__Brightness();

export default instantSettingsStore__Brightness;
