/* global navigator */

import BaseModule from 'base-module';
import FlashlightHelper from '../util/flashlight_helper';

class InstantSettingsStore__Flashlight extends BaseModule {
  name = 'InstantSettingsStore__Flashlight';

  config = {
    name: 'flashlight',
    icon: {
      init: 'flashlight-on',
      inactive: 'flashlight-off',
    },
    jio_icon: {
      init: 'flashlight_on',
      inactive: 'flashlight_off',
    },
    title: 'flashlight',
    removed: true,
    order: {
      portrait: 0,
      landscape: 1
    },
    click: this.toggle.bind(this),
    clickType: 'toggle',
  };

  constructor() {
    super();
    this.checkCapability();
  }

  observeCallback = () => {
    this.updateValue();
  };

  checkCapability() {
    this.capability = FlashlightHelper.capability;
  }

  toggleObserver(active = true) {
    if (!FlashlightHelper.capability) {
      return;
    }
    this.checkCapability();
    this.observeCallback();

    let method = active ? 'on' : 'off';
    FlashlightHelper[method]('change', this.observeCallback);
  }

  updateValue() {
    let _flashlightEnabled = false;
    if (FlashlightHelper.flashlightManager) {
      _flashlightEnabled = FlashlightHelper.flashlightManager.flashlightEnabled;
    }
    this.config.isActive = _flashlightEnabled;
    this.config.subtitle = _flashlightEnabled ? 'on' : 'off';
    this.emit('change');
  }

  toggle() {
    FlashlightHelper.toggle();
    this.updateValue();
  }
}

const instantSettingsStore__Flashlight = new InstantSettingsStore__Flashlight();

export default instantSettingsStore__Flashlight;
