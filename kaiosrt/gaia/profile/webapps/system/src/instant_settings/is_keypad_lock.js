/* global SettingsObserver */

import BaseModule from 'base-module';
import * as utils from '../util/utils';

class InstantSettingsStore__KeypadLock extends BaseModule {
  name = 'InstantSettingsStore__KeypadLock';

  SHOW = 0;
  HIDE = 1;
  GRAYOUT = 2;

  config = {
    name: 'keypad-lock',
    jio_icon: {
      init: 'keypad_lock',
      inactive: 'keypad_unlock',
    },
    title: 'keypad-lock',
    removed: true,
    observerSetting: 'pocketmode.autolock.enabled',
    order: {
      portrait: 3,
      landscape: 3
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
    SettingsObserver.observe('dm.pocketmode.autolock.settings.ui', 'show', (value) => {
      this.config.dmUIconfig = value;
      this.updateModule();
    });
    SettingsObserver.observe('pocketmode.autolock.settings.ui', this.SHOW, (value) => {
      this.config.simCustomUIconfig = value;
      this.updateModule();
    });
  }

  checkCapability() {
    this.moduleUIObserve();
    const key = 'jio.instantSettings.enabled';
    SettingsObserver.getValue(key).then((value) => {
      this.capability = !!value;
      if (this.observer && this.capability && !this.hasObserver) {
        this.toggleObserver(true);
      }
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
      value: !this.config.isActive ? true : false
    }]);
  }

  blocker(blocking = true) {
    this.isUpdating = blocking;
    this.config.isDisabled = blocking || this.config.isSetDisabled;
    this.emit('change');
  }
}

const instantSettingsStore__KeypadLock = new InstantSettingsStore__KeypadLock();

export default instantSettingsStore__KeypadLock;
