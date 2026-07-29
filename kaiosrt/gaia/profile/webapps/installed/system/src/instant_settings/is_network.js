/* global navigator, SIMSlotManager*/

import BaseModule from 'base-module';
import IS_airplanemode from './is_airplanemode';

class InstantSettingsStore__Network extends BaseModule {
  name = 'InstantSettingsStore__Network';

  SHOW = 0;
  HIDE = 1;
  GRAYOUT = 2;

  config = {
    name: 'network',
    icon: {
      init: 'network-activity',
      inactive: 'network-activity-off'
    },
    title: 'cellular-data',
    observerSetting: 'ril.data.enabled',
    order: {
      portrait: 4,
      landscape: 3
    },
    click: this.toggle.bind(this),
    clickType: 'toggle'
  };

  constructor() {
    super();
    this.checkCapability();
  }

  hasReadySIMCard() {
    let slot = SIMSlotManager.getSlots().find(slot => {
      if (!slot.simCard) {
        return false;
      }
      return slot.getCardState() === 'ready';
    });
    return !!slot;
  }
  observeCallback = (value) => {
    this.config.value = value;
    this.config.isActive =
      value && this.hasReadySIMCard() && !IS_airplanemode.isUpdating;
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
    SettingsObserver.observe('dm.data.settings.ui', 'show', (value) => {
      this.config.dmUIconfig = value;
      this.updateModule();
    });
    SettingsObserver.observe('data.settings.ui', this.SHOW, (value) => {
      this.config.simCustomUIconfig = value;
      this.updateModule();
    });
  }

  checkCapability() {
    this.capability = true;
    this.moduleUIObserve();
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
      this.addSimCardObserver();
      IS_airplanemode.on('change', this.checkSimCardState);
    } else {
      SettingsObserver.unobserve(this.config.observerSetting,
        this.observeCallback);
      this.removeSimCardObserver();
      IS_airplanemode.off('change', this.checkSimCardState);
    }
  }

  /**
   * Observer sim card state by voicechange event to update network button state.
   * But voicechange event will be fired every 3 ~ 5 seconds,
   * so we will add observer when UI is focused, and remove observer when exit.
   */
  addSimCardObserver() {
    if (this.isSimCardObserverAdded) {
      return;
    }
    this.isSimCardObserverAdded = true;
    this.checkSimCardState();
    const conns = navigator.b2g.mobileConnections;
    if (conns) {
      [...conns].forEach((conn) => {
        conn.addEventListener('voicechange', this);
      }, this);
    }
    window.addEventListener('simslotready', this);
  }

  removeSimCardObserver() {
    this.isSimCardObserverAdded = false;
    const conns = navigator.b2g.mobileConnections;
    if (conns) {
      [...conns].forEach((conn) => {
        conn.removeEventListener('voicechange', this);
      }, this);
    }
    window.removeEventListener('simslotready', this);
  }

  checkSimCardState = () => {
    let hasReadySIMCard = this.hasReadySIMCard();
    this.config.isDisabled =
      IS_airplanemode.config.isActive || IS_airplanemode.isUpdating ||
      !hasReadySIMCard;
    this.config.isActive =
      !this.config.isDisabled && (this.config.subtitle === 'on' ? true : false);
    if (!hasReadySIMCard && this.config.isActive) {
      this.toggle();
    }
    if (this.config.isDisabled) {
      this.config.subtitle = 'disabled';
    } else {
      this.config.subtitle = this.config.value ? 'on' : 'off';
    }
    this.emit('change');
  }

  _handle_simslotready() {
    this.checkSimCardState();
  }

  _handle_voicechange() {
    this.checkSimCardState();
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
    this.checkSimCardState();
    this.emit('change');
  }
}

const instantSettingsStore__Network = new InstantSettingsStore__Network();

export default instantSettingsStore__Network;
