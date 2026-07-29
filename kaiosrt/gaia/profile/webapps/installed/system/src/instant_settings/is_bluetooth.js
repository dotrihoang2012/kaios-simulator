/* global SettingsObserver, DeviceCapabilityManager */

import BaseModule from 'base-module';
import * as utils from '../util/utils';

class InstantSettingsStore__Bluetooth extends BaseModule {
  name = 'InstantSettingsStore__Bluetooth';

  SHOW = 0;
  HIDE = 1;
  GRAYOUT = 2;

  config = {
    name: 'bluetooth',
    icon: {
      init: 'bluetooth-32px',
      inactive: 'bluetooth-off-32px',
    },
    jio_icon: {
      init: 'bluetooth_on',
      inactive: 'bluetooth_off',
    },
    title: 'bluetooth',
    removed: true,
    observerSetting: 'bluetooth.enabled',
    order: {
      portrait: 5,
      landscape: 4
    },
    click: this.toggle.bind(this),
    clickType: 'toggle',
  };

  constructor() {
    super();
    this.checkCapability();
  }

  observeCallback = (value) => {
    this.config.isActive = value;
    this.config.subtitle = value ? 'on' : 'off';
    this.blocker(false);
  };

  updateModule() {
    this.config.hidden =
      this.config.simCustomUIconfig === this.HIDE ||
      this.config.dmUIconfig === 'hide';
    this.config.isSetDisabled =
      !!(this.config.simCustomUIconfig === this.GRAYOUT ||
      this.config.dmUIconfig === 'gray');
    this.emit('change');
    window.Service.request('InstantSettings:exit');
  }

  moduleUIObserve() {
    SettingsObserver.observe('dm.bluetooth.settings.ui', 'show', (value) => {
      this.config.dmUIconfig = value;
      this.updateModule();
    });
    SettingsObserver.observe('bluetooth.settings.ui', this.SHOW, (value) => {
      this.config.simCustomUIconfig = value;
      this.updateModule();
    });
  }

  checkCapability() {
    // feature detection: bluetooth
    DeviceCapabilityManager.get('device.bt').then((hasBluetooth) => {
      if (!hasBluetooth || !navigator.b2g.bluetooth) {
        return;
      }
      this.capability = true;
      if (this.observer && !this.hasObserver) {
        this.toggleObserver(true);
      }

      // If phone is reboot and bluetooth adapter is null.
      // It need prepare to init bluetooth adapter for user experience.
      if (!navigator.b2g.bluetooth.defaultAdapter) {
        navigator.b2g.bluetooth.onattributechanged = (evt) => {
          if (evt.attrs.includes('defaultAdapter')) {
            navigator.b2g.bluetooth.onattributechanged = null;
          }
        };
      }
      this.moduleUIObserve();
    });
  }

  toggleObserver(active = true) {
    this.observer = active;
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
    utils.toggleBluetooth(!this.config.isActive ? 'enable' : 'disable').then(
      (e) => {
        this.debug(e);
      },
      (reason) => {
        console.warn(reason);
      }
    );
  }

  blocker(blocking = true) {
    this.isUpdating = blocking;
    this.config.isDisabled = blocking || this.config.isSetDisabled;
    this.emit('change');
  }
}

const instantSettingsStore__Bluetooth = new InstantSettingsStore__Bluetooth();

export default instantSettingsStore__Bluetooth;
