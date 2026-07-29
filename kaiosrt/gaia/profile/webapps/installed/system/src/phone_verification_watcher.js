import BaseModule from 'base-module';

class PhoneVerificationWatcher extends BaseModule {
  
  name = 'PhoneVerificationWatcher';

  DEBUG = false;

  VERIFIED_ICCID = '';

  ACCOUNT_STATUS = 'logout';

  _isInitialized = false;

  start() {
    this.verifiedIccIdHelper = SettingsHelper('account.verified.iccId');
    // Watch mozId to update account status.
    this.watchMozId();
    // Initialize iccId
    this.initIccIdInfo();
    // Watch SIM slot status to check iccId changed or not.
    window.addEventListener('simslot-iccinfochange', this);
  }

  watchMozId() {
    window.navigator.mozId.watch({
      wantIssuer: 'kaios-accounts',
      onready: (e) => {
        this.debug('onready(): ' + e);
      },
      onlogin: (e) => {
        this.debug('onlogin(): ' + e);
        this.ACCOUNT_STATUS = 'login';
        // Only store iccId when the module is initiated completely.
        if (this._isInitialized) {
          // Update and save iccId which is just verified.
          this.VERIFIED_ICCID = this.getIccId();
          this.verifiedIccIdHelper.set(this.VERIFIED_ICCID);
          this.debug('onlogin(): verified iccId to be = ' +
                     this.VERIFIED_ICCID);
        }
        Antitheft_Requester.setHawk(e);
      },
      onlogout: (e) => {
        this.debug('onlogout(): ' + e);
        this.ACCOUNT_STATUS = 'logout';
        // Only store iccId when the module is initiated completely.
        if (this._isInitialized) {
          // Clean up iccId since it's been logout.
          this.VERIFIED_ICCID = '';
          this.verifiedIccIdHelper.set(this.VERIFIED_ICCID);
          this.debug('onlogout(): set verified iccId to be empty');
        }
      },
      onerror: (e) => {
        this.debug('onerror(): ' + e);
      }
    });
  }

  initIccIdInfo() {
    // Get the verified iccId from Settings.
    this.verifiedIccIdHelper.get((verifiedIccId) => {
      if (verifiedIccId && (verifiedIccId !== '')) {
        this.VERIFIED_ICCID = verifiedIccId;
        this.debug('get verifiedIccId from settings = ' + verifiedIccId);
      }
      // Start to fetch current iccId from platform.
      this.logoutAccountWithUnverifiedIccId();
    });
  }

  handleEvent(evt) {
    switch (evt.type) {
      case 'simslot-iccinfochange':
        this.debug('handleEvent(): simslot-iccinfochange');
        if (!this._isInitialized) {
          return;
        }
        // While the slot is changed to be no SIM card,
        // we have to logout account manually.
        if ((this.ACCOUNT_STATUS === 'login') &&
            SIMSlotManager.noSIMCardOnDevice()) {
          this.debug('handleEvent(): no SIM card, logoutAccount()');
          this.logoutAccount();
        }
        break;
    }
  }

  logoutAccountWithUnverifiedIccId() {
    if (SIMSlotManager.noSIMCardOnDevice()) {
      this.debug('logoutAccountWithUnverifiedIccId(): noSIMCardOnDevice');
      // No SIM card in slot, logout account.
      this.VERIFIED_ICCID = '';
      this.logoutAccount(true);
    } else {
      this.debug('logoutAccountWithUnverifiedIccId(): has SIMCardOnDevice');
      // Has SIM card in slot.
      // IccId is verified before, we do not logout the account.
      // IccId is not verified before, we logout the account.
      if (!this.isIccIdVerified()) {
        this.debug('logoutAccountWithUnverifiedIccId(): iccId is not verified');
        this.logoutAccount(true);
      } else {
        this.debug('logoutAccountWithUnverifiedIccId(): iccId is verified');
        this._isInitialized = true;
      }
    }
  }

  isIccIdVerified() {
    let slots = SIMSlotManager.getSlots().filter(function(slot) {
      return !slot.isAbsent() && !slot.isLocked();
    });

    if (slots.length === 0) {
      return false;
    }

    let simslot = slots[0];
    if (simslot.simCard &&
        simslot.simCard.iccInfo &&
        simslot.simCard.iccInfo.iccid) {
      // Check the iccId is verified before or not.
      if ((this.VERIFIED_ICCID === '') ||
          (simslot.simCard.iccInfo.iccid === '')) {
        this.debug('isIccIdVerified() some of the iccId is empty string');
        return false;
      } else {
        this.debug('isIccIdVerified() in compared result');
        return (this.VERIFIED_ICCID === simslot.simCard.iccInfo.iccid);
      }
    } else {
      return false;
    }
  }

  getIccId() {
    let slots = SIMSlotManager.getSlots().filter(function(slot) {
      return !slot.isAbsent() && !slot.isLocked();
    });

    if (slots.length === 0) {
      return '';
    }

    let simslot = slots[0];
    if (simslot.simCard &&
        simslot.simCard.iccInfo &&
        simslot.simCard.iccInfo.iccid) {
      return simslot.simCard.iccInfo.iccid;
    } else {
      this.debug('getIccId() slots[0] has no iccId, return empty string');
      return '';
    }
  }

  logoutAccount(isInitProcess) {
    if (this.ACCOUNT_STATUS === 'login') {
      LazyLoader.load('js/fxa_client.js', () => {
        this.debug('logoutAccount() FxAccountsClient.logout() called');
        FxAccountsClient.logout((data) => {
          this.debug('FxAccountsClient(): onsuccess');
          if (isInitProcess) {
            this._isInitialized = true;
          }
        }, (error) => {
          this.debug('FxAccountsClient(): onerror');
          if (isInitProcess) {
            this._isInitialized = true;
          }
        });
      });
    }

  }
}

var instance = new PhoneVerificationWatcher();
instance.start();

export default instance;
