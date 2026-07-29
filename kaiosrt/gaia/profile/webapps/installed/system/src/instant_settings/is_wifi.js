/* global SettingsObserver, DeviceCapabilityManager */

import BaseModule from 'base-module';

class InstantSettingsStore__Wifi extends BaseModule {
  name = 'InstantSettingsStore__Wifi';

  SHOW = 0;
  HIDE = 1;
  GRAYOUT = 2;

  config = {
    name: 'wifi',
    icon: {
      init: 'wifi-32px',
      inactive: 'wifi-off-32px'
    },
    title: 'wlan',
    observerSetting: 'wifi.enabled',
    removed: true,
    order: {
      portrait: 3,
      landscape: 0
    },
    click: this.toggle.bind(this),
    clickType: 'toggle'
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
    SettingsObserver.observe('dm.wifi.settings.ui', 'show', (value) => {
      this.config.dmUIconfig = value;
      this.updateModule();
    });
    SettingsObserver.observe('wifi.settings.ui', this.SHOW, (value) => {
      this.config.simCustomUIconfig = value;
      this.updateModule();
    });
  }

  checkCapability() {
    // feature detection: wifi
    DeviceCapabilityManager.get('device.wifi').then((hasWifi) => {
      if (!hasWifi) {
        return;
      }
      this.config.removed = false;
      this.capability = true;
      if (this.observer && !this.hasObserver) {
        this.toggleObserver(true);
      }
      this.moduleUIObserve();
    });
    DeviceCapabilityManager.get('device.wifi.certified')
      .then((isWifiCertified) => {
      this.config.title = isWifiCertified ? 'wifi' : 'wlan';
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
    SettingsObserver.setValue([{
      name: this.config.observerSetting,
      value: !this.config.isActive
    }]);
  }

  blocker(blocking = true) {
    this.isUpdating = blocking;
    this.config.isDisabled = blocking || this.config.isSetDisabled;
    this.emit('change');
  }
}

const instantSettingsStore__Wifi = new InstantSettingsStore__Wifi();

export default instantSettingsStore__Wifi;
