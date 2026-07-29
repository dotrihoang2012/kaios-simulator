import BaseModule from 'base-module';

class SimLockStore extends BaseModule {
  name = 'SimLockStore';

  nckSkipButton = false;
  showAttentionInNck = false;

  nckIsSkipped = [false, false];
  DEBUG = false;

  state = {
    active: false,
    slots: [],
    nckSkipButton: false,
    showAttentionInNck: false
  };

  constructor() {
    super();
    if (!navigator.b2g.mobileConnections) {
      return;
    }
    this.mobileConnections = Array.from(navigator.b2g.mobileConnections);
    SettingsObserver.getValue('custom.nck.behavior').then((value) => {
      this.customNckBehavior = value || null;
    });
    Service.register('setNckSkipped', this)
  }

  EVENTS = [
    'simslotready',
    'ftucomms',
    'ftuskip',
    'ftudone',
    'appopened',
    'simslot-updated',
    'simslot-cardstatechange',
    'simslot-iccinfochange'
  ];

  name = 'SimLockManager';
  // Only valid after ftu open or ftu skip
  _skipSimDialog = true;

  _ShowInFtu = true;

  start() {
    this.EVENTS.forEach((evt) => {
      window.addEventListener(evt, this);
    });
    this.showIfLocked();
  }

  setNckSkipped(index) {
    this.nckIsSkipped[index] = true;
    if (SIMSlotManager.isMultiSIM()) {
      Service.request('updateDefaultServiceSettings', true);
    }
  }

  _handle_simslotready() {
    this.showIfLocked();
  }

  '_handle_simslot-updated'() {
    this.showIfLocked();
  }

  '_handle_simslot-iccinfochange'() {
    this.showIfLocked();
  }

  '_handle_simslot-cardstatechange'() {
    this.showIfLocked();
  }

  '_handle_ftucomms'(evt) {
    const url = evt.detail.url;
    const location = url.split('#')[1];
    if (location && location !== 'languages' && location !== 'input-method' &&
      this._ShowInFtu) {
      this._skipSimDialog = false;
      this.showIfLocked();
      this._ShowInFtu = false;
    }
  }

  '_handle_ftuskip'() {
    this._skipSimDialog = false;
    this.showIfLocked();
  }

  '_handle_ftudone'() {
    this._skipSimDialog = false;
  }

  close() {
    this.state = {
      active: false,
      slots: []
    };
    this.emit('changed');
  }

  _handle_appopened(evt) {
    // If an app needs 'telephony' or 'sms' permissions (i.e. mobile
    // connection) and the SIM card is locked, the SIM PIN unlock screen
    // should be launched

    let app = evt.detail;
    if (!app || !app.manifest || !app.manifest.permissions) {
      return;
    }

    // Ignore apps that don't require a mobile connection
    if (!('telephony' in app.manifest.permissions ||
      'sms' in app.manifest.permissions)) {
      return;
    }

    // If SIM is locked, cancel app opening in order to display
    // it after the SIM PIN dialog is shown
    // XXX, always add 1s delay to avoid flash when app opend
    setTimeout(() => {this.showIfLocked(null, true);}, 1000);

    // XXX: We don't block the app from launching if it requires SIM
    // but only put the SIM PIN dialog upon the opening/opened app.
    // Will revisit this in
    // https://bugzilla.mozilla.org/show_bug.cgi?id=SIMPIN-Dialog
  }

  isBothSlotsLocked() {
    if (!SIMSlotManager.isMultiSIM() ||
        SIMSlotManager.hasOnlyOneSIMCardDetected()) {
      return false;
    }

    let simSlots = SIMSlotManager.getSlots();
    let isBothLocked = true;
    for (let i = 0; i < simSlots.length; i++) {
      let currentSlot = simSlots[i];
      let unknownState = currentSlot.isUnknownState();
      let currentLocked = currentSlot.isLocked() || unknownState;
      isBothLocked = isBothLocked && currentLocked;
    }
    return isBothLocked;
  }

  /*
   * vehaviroValue: 'toast','inputDialog','inputDialogNoskip',
   *   'attentionDialog','attentionDialogNoskip'
   * multiSIM:
   * 'custom.nck.behavior' = {
   *   'carrier-non_carrier': behaviorValue1,
   *   'non_carrier-carrier': behaviorValue3,
   *   'non_carrier-non_carrier': behaviorValue4,
   *   'non_carrier-blank': behaviorValue5,
   *   'blank-non_carrier': behaviorValue7,
   * }
   * singleSIM:
   * 'custom.nck.behavior' = {
   *   'non_carrier': behaviorValue
   * }
   */
  getCustomBehavior(cardsState) {
    let behavior = {
      index: 1,
      toast: false,
      nckSkipButton: false,
      showAttentionInNck: false
    }
    if (this.customNckBehavior) {
      let customBehavior;
      if (SIMSlotManager.isMultiSIM()) {
        customBehavior =
          this.customNckBehavior[cardsState[0] + '-' + cardsState[1]];
      } else {
        customBehavior =
          this.customNckBehavior[cardsState[0]];
      }
      if (cardsState[0] === 'non_carrier') {
        behavior.index = 1;
      } else {
        behavior.index = 2;
      }
      switch (customBehavior) {
        case 'toast':
          behavior.toast = true;
          break;
        case 'attentionDialog':
          behavior.showAttentionInNck = true;
          behavior.nckSkipButton = true;
          break;
        case 'inputDialog':
          behavior.nckSkipButton = true;
          break;
        case 'attentionDialogNoskip':
          behavior.showAttentionInNck = true;
          break;
        case 'inputDialogNoskip':
          break;
      }
    }
    return behavior;
  }

  showIfLocked() {
    if (this._skipSimDialog) {
      return false;
    }
    if (!SIMSlotManager.ready) {
      this.debug('SIMSlot not ready yet.');
      return false;
    }

    if (Service.query('supportDFC') === undefined) {
      this.debug('supportDFC not get yet.');
      return false;
    }

    let cardsState = [];
    let slots = SIMSlotManager.getSlots().filter((slot, index) => {
      if (!slot.simCard) {
        this.debug('No SIM card in slot ' + (index + 1));
        cardsState[index] = 'blank';
        return false;
      }
      console.log(slot.simCard.cardState, slot.index);

      switch (slot.getCardState()) {
        // do nothing in either unknown or null card states
        case null:
        case 'unknown':
          this.debug('unknown SIM card state for slot ' + (index + 1));
          break;
        case 'networkSubsetLocked':
        case 'network1Locked':
        case 'network2Locked':
        case 'hrpdNetworkLocked':
        case 'corporateLocked':
        case 'serviceProviderLocked':
        case 'simPersonalizationLocked':
        case 'ruimCorporateLocked':
        case 'ruimServiceProviderLocked':
        case 'networkPukRequired':
        case 'networkSubsetPukRequired':
        case 'network1PukRequired':
        case 'network2PukRequired':
        case 'hrpdNetworkPukRequired':
        case 'corporatePukRequired':
        case 'serviceProviderPukRequired':
        case 'simPersonalizationPukRequired':
        case 'ruimCorporatePukRequired':
        case 'ruimServiceProviderPukRequired':
          return !(Service.query('supportDFC') || Service.query('hasRSU'));
        case 'networkLocked':
          if (Service.query('hasRSU') || Service.query('supportDFC')) {
            return false;
          }
          if (index === 0) {
            let slot2 = SIMSlotManager.getSlots()[1];
            if (slot2 && slot2.simCard) {
              let cardState = slot2.getCardState();
              if (cardState === 'pinRequired' || cardState === 'pukRequired') {
                return false;
              }
            }
          }
          if (this.nckIsSkipped[index]) {
            return false;
          }
          cardsState[index] = 'non_carrier';
          return true;
        case 'permanentBlocked':
          cardsState[index] = 'blank';
          return true;
        case 'pinRequired':
        case 'pukRequired':
          return true;
        default:
          cardsState[index] = 'carrier';
          this.debug('SIM slot ' + (index + 1) + ' is not locked, skipping');
          return false;
      }
    });
    let customBehavior = this.getCustomBehavior(cardsState);
    if (customBehavior.toast) {
      let text;
      if (SIMSlotManager.isMultiSIM()) {
        text = window.api.l10n.get('multiSIMxcklockContent', {
          type: 'NCK',
          n: customBehavior.index
        });
      } else {
        text = window.api.l10n.get('xcklockContent', { type: 'NCK' });
      }
      Service.request('SystemToaster:show', { text: text });
      Service.request('updateDefaultServiceSettings', true);
      return false;
    } else {
      this.state = {
        active: slots.length ? true : false,
        slots: slots,
        nckSkipButton: customBehavior.nckSkipButton,
        showAttentionInNck: customBehavior.showAttentionInNck
      };
      window.api.l10n.once(() => {
        this.emit('changed');
      });
      if (!this.state.active) {
        Service.request('updateDefaultServiceSettings');
      }
    }
  }
}

const instance = new SimLockStore();
instance.start();
window.slm = instance;
window.SIMSlotManager = SIMSlotManager;

export default instance;
