/* global navigator */

import BaseModule from 'base-module';

class InstantSettingsStore__Airplanemode extends BaseModule {
  name = 'InstantSettingsStore__Airplanemode';

  config = {
    name: 'airplane-mode',
    icon: {
      init: 'airplane-mode',
      inactive: 'airplane-mode-off'
    },
    jio_icon: {
      init: 'apm_on',
      inactive: 'apm_off'
    },
    title: 'airplane-mode',
    // The key to enable/disable the airplane mode.
    activateSetting: 'airplaneMode.enabled',
    // The key to observe whether the airplane mode is enabled/disabled.
    observerSetting: 'airplaneMode.status',
    order: {
      portrait: 2,
      landscape: 5
    },
    click: this.toggle.bind(this),
    clickType: 'toggle'
  };

  constructor() {
    super();
    this.checkCapability();
  }

  observeCallback = (value) => {
    switch(value){
      case 'enabled':
        this.config.isActive = true;
        this.config.subtitle = 'on';
        this.blocker(false);
        break;
      case 'disabled':
        this.config.isActive = false;
        this.config.subtitle = 'off';
        this.blocker(false);
        break;
    }
  };

  checkCapability() {
    this.capability = true;
  }

  toggleObserver(active = true) {
    if (!this.capability) {
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

    // Enable/Disable the airplane mode.
    SettingsObserver.setValue([{
      name: this.config.activateSetting,
      value: !this.config.isActive
    }]);
  }

  blocker(blocking = true) {
    this.isUpdating = blocking;
    this.config.isDisabled = blocking;
    this.emit('change');
  }
}

const instantSettingsStore__Airplanemode = new InstantSettingsStore__Airplanemode();

export default instantSettingsStore__Airplanemode;
