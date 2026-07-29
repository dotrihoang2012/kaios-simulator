/* exported SimSettingsHelper */
/* global SIMSlotManager, SettingsObserver, Service */
'use strict';

(function(exports) {
  var SimSettingsHelper = {
    AUTOREBOOT_TIME_INTERVAL: 3000,
    ALWAYS_ASK_OPTION_VALUE: -1,
    initFromDB: false,
    iccIds: [null, null],
    lastcardsState: ['', ''],
    notification: null,
    timer: null,
    hotPlugHandler: null,
    skipIccCmd: true,
    pendingForceSet: false,
    carrierSimMatchInfo: [],
    resetDataFlag: false,
    carrierSimMatchResult: [],
    isMultiSim: false,
    start: function ssh_init() {
      this.isMultiSim = SIMSlotManager.isMultiSIM();
      this.loadCarrierSimMatchInfo();
      this.loadResetDataFlag();
      Service.register('updateDefaultServiceSettings', this);
      if (this.isMultiSim) {
        if (SIMSlotManager.ready) {
          this.initSimSettings();
        } else {
          window.addEventListener('simslotready',
            this.initSimSettings.bind(this));
          if (SIMSlotManager.noSIMCardOnDevice()) {
            this.skipIccCmd = false;
          }
        }
        this.observeUserSimSettings();
        window.addEventListener('logohidden', () => {
          this.observerSimCardHotPlug();
        });
      }
    },

    matchSimInfo: function ssh_matchSimInfo(iccCard, matchInfo) {
      return new Promise(resolve => {
        if (iccCard && iccCard.iccInfo &&
          iccCard.iccInfo.mcc === matchInfo.mcc &&
          iccCard.iccInfo.mnc === matchInfo.mnc) {
          if (matchInfo.mvno_type) {
            let request = iccCard.matchMvno(matchInfo.mvno_type,
              matchInfo.mvno_match_data);
            request.onsuccess = () => {
              resolve(request.result);
            };
            request.onerror = () => {
              resolve(false);
            };
          } else {
            resolve(true);
          }
        } else {
          resolve(false);
        }
      });
    },

    isCarrierSimCard: function ssh_isCarrierSimCard(index) {
      return new Promise(resolve => {
        const iccManager = navigator.b2g.iccManager;
        const conns = navigator.b2g.mobileConnections;
        const iccCard = iccManager && conns && conns[index] &&
          iccManager.getIccById(conns[index].iccId);
        const carrierInfo = this.carrierSimMatchInfo;
        if (carrierInfo && iccCard) {
          let matchPromises = [];
          Array.prototype.forEach.call(carrierInfo, (matchInfo) => {
            matchPromises.push(this.matchSimInfo(iccCard, matchInfo));
          });
          Promise.all(matchPromises).then(retvals => {
            if (retvals.find(retval => retval)) {
              resolve(true);
            } else {
              resolve(false);
            }
          });
        } else {
          resolve(false);
        }
      });
    },

    loadCarrierSimMatchInfo: function ssh_loadCarrierSimMatchInfo() {
      // [{
      // 'mcc':
      // 'mnc':
      // 'mvno_type':
      // 'mvno_match_data':
      // }, {...]]
      let key = 'carrier.sim.match.info';
      SettingsObserver.getValue(key).then((value) => {
        this.carrierSimMatchInfo = value;
      });
    },

    loadResetDataFlag: function ssh_loadResetDataFlag() {
      let key = 'change-sim.rematch.outgoingData';
      SettingsObserver.getValue(key).then((value) => {
        this.resetDataFlag = value;
      });
    },

    updateDefaultServiceSettings:
      function ssh_updateDefaultServiceSettings(forceSet) {
      let cardsState = [null, null];

      SIMSlotManager.getSlots().forEach((slot, index) => {
        if (!slot.simCard) {
          cardsState[index] = null;
        } else {
          let cardState = slot.getCardState();
          cardsState[index] = cardState === 'ready' ? 'ready' : 'locked';
        }
      });

      if (cardsState[0] === this.lastcardsState[0] &&
        (!this.isMultiSim || cardsState[1] === this.lastcardsState[1])) {
        return;
      }

      if (forceSet || this.pendingForceSet ||
        (cardsState[0] !== 'locked' && cardsState[1] !== 'locked')) {
        if (this.isMultiSim) {
          if (!this.initFromDB) {
            this.pendingForceSet = true;
            return;
          }
          if (cardsState[0] !== 'locked' && cardsState[1] !== 'locked') {
            Promise.all([this.isCarrierSimCard(0), this.isCarrierSimCard(1)])
              .then(retvals => {
              SettingsObserver.setValue([{
                name: 'carrier.sim.match.result',
                value: retvals
              }]);
              this.carrierSimMatchResult = retvals;
              this.simslotUpdatedHandler();
            });
          } else {
            this.simslotUpdatedHandler();
          }
        } else {
          this.simslotUpdatedHandler();
        }
        this.pendingForceSet = false;
        this.lastcardsState = cardsState;
      }
    },

    initSimSettings: function ssh_recordCurrentIccIds() {
      const conns = navigator.b2g.mobileConnections || [];
      for (var i = 0; i < conns.length; i++) {
        this.iccIds[i] = conns[i].iccId;
      }
      this.updateDefaultServiceSettings();
      this.skipIccCmd = false;
    },

    _hotPlugHandler: function(evt) {
      if (!Service.query('supportSimHotswap')) {
        return;
      }
      if (!this.skipIccCmd) {
        let contentId = 'sim-hot-plug';
        if (
          evt.type === 'iccundetected' && SIMSlotManager.noSIMCardOnDevice()) {
          contentId = 'sim-hot-plug-empty';
        }
        this.skipIccCmd = true;
        Service.request('DialogService:show', {
          id: 'power-off-alert',
          header: 'sim-confirmation-title',
          content: contentId,
          ok: 'ok',
          type: 'alert',
          noClose: true,
          onOk: () => {
            clearTimeout(this.timer);
            Service.request('startPowerOff', true, 'sim-hot-plug');
            Service.request('DialogService:hide', 'power-off-alert');
          }
        });
        this.timer = window.setTimeout(() => {
          Service.request('startPowerOff', true, 'sim-hot-plug-timeout');
        }, this.AUTOREBOOT_TIME_INTERVAL)
      }
    },

    observerSimCardHotPlug: function() {
      const iccManager = navigator.b2g.iccManager;
      if (iccManager) {
        this.hotPlugHandler = this._hotPlugHandler.bind(this);
        iccManager.addEventListener('iccdetected', this.hotPlugHandler);
        iccManager.addEventListener('iccundetected', this.hotPlugHandler);
      }
    },

    overrideUserSimSettings: function() {
      this.setServiceOnCard('outgoingCall');
      this.setServiceOnCard('outgoingMessages');
      this.setServiceOnCard('outgoingData');
    },

    simslotUpdatedHandler: function() {
      if (this.isMultiSim) {
        this.overrideUserSimSettings();
        if (!this['ril.notFirst.sim.settings']) {
          SettingsObserver.setValue([{
            name: 'ril.notFirst.sim.settings',
            value: true
          }]);
        }
      }
    },

    showSimCardConfirmation: function(cardIndex) {
      if (this.notification) {
        this.notification.close();
        this.notification = null;
      }
      if (SIMSlotManager.noSIMCardOnDevice() ||
        !this['ril.notFirst.sim.settings']) {
        return null;
      }
      var _ = window.api.l10n.get;
      var title = _('sim-confirmation-notice-title') || '';
      var body = _('sim-confirmation-notice') || '';

      var notification = new window.Notification(title, {
        body: body,
        tag: 'simCard',
        icon: 'sim-card'
      });

      notification.onclick = function(cardIndex) {
        var _ = window.api.l10n.get;
        var header = _('sim-confirmation-title');
        var content = _('sim-confirmation-content', {
          'n': cardIndex + 1
        });
        if (this.notification) {
          this.notification.close();
          this.notification = null;
        }

        Service.request('DialogService:show', {
          id: 'sim-confirmation-alert',
          header: header,
          content: content,
          translated: true,
          type: 'alert',
          noClose: true,
          onOk: () => {
            Service.request('DialogService:hide', 'sim-confirmation-alert');
          }
        });
      }.bind(this, cardIndex);
      return notification;
    },

    observeUserSimSettings: function ssh_observeUserSimSettings() {
      var mozKeys = [];
      var servicePromises = [];
      mozKeys.push('ril.telephony.defaultServiceId');
      mozKeys.push('ril.voicemail.defaultServiceId');
      mozKeys.push('ril.telephony.defaultServiceId.iccId');
      mozKeys.push('ril.voicemail.defaultServiceId.iccId');

      mozKeys.push('ril.sms.defaultServiceId');
      mozKeys.push('ril.sms.defaultServiceId.iccId');

      mozKeys.push('ril.mms.defaultServiceId');
      mozKeys.push('ril.data.defaultServiceId');
      mozKeys.push('ril.mms.defaultServiceId.iccId');
      mozKeys.push('ril.data.defaultServiceId.iccId');
      mozKeys.push('ril.notFirst.sim.settings');
      mozKeys.push('ril.sim.iccIds');

      mozKeys.forEach((eachKey) => {
        var promise = new Promise((resolve) => {
          SettingsObserver.getValue(eachKey).then((value) => {
            this[eachKey] = value;
            resolve();
          });
          SettingsObserver.observe(eachKey, '', function onChange(value) {
            // 1. 'newPrefCard' --> set data to other card
            // 2. 'oldCard' --> reboot device and card not change
            // 3. 'recordPrefCard' -->  insert new card and the card is the last
            //                          card that user set mobile data
            // 4. 'noSimCard' --> no sim card in device
            // 5. 'noMobileData' --> the card not set mobile data.
            console.log('SimSettingsHelper ' + eachKey + ' : ' + value);
            if (eachKey === 'ril.data.defaultServiceId' &&
              Service.query('supportSwitchPrimarysim')) {
              var cardsState = [{
                state: 'newPrefCard'
              }, {
                state: 'newPrefCard'
              }];
              var anotherCardIndex = value^1;
              if (this['ril.sim.iccIds'][anotherCardIndex] ===
                this.iccIds[anotherCardIndex] && this[eachKey] === value) {
                cardsState[anotherCardIndex].state = 'oldCard';
              } else {
                cardsState[anotherCardIndex].state = 'noMobileData';
              }
              // No simCard in device
              if (!this.iccIds[value]) {
                cardsState[value].state = 'noSimCard';
              } else if (this.iccIds[value] ===
                this['ril.data.defaultServiceId.iccId']) {
                cardsState[value].state = 'recordPrefCard';
              } else if (this['ril.sim.iccIds'][value] === this.iccIds[value] &&
                this[eachKey] === value) {
                cardsState[value].state = 'oldCard';
              }
              Service.request('setPreferredNetworkType', cardsState);
            }

            this[eachKey] = value;
            // For support SIM1* SIM2* mode, record
            // ril.data.defaultServiceId.iccID in settings app
            if (eachKey === 'ril.data.defaultServiceId.iccId') {
              if (this.notification) {
                this.notification.close();
                this.notification = null;
              }
            } else if (eachKey.indexOf('iccId') < 0 && value >= 0 &&
              (eachKey !== 'ril.data.defaultServiceId' ||
              !this['ril.notFirst.sim.settings'] || this.resetDataFlag) &&
              this.lastcardsState[0] !== 'locked' &&
              this.lastcardsState[1] !== 'locked') {
              SettingsObserver.setValue([{
                name: eachKey + '.iccId',
                value: this.iccIds[value]
              }]);
            }
          }.bind(this), true);
        });
        servicePromises.push(promise);
      });
      Promise.all(servicePromises).then(() => {
        this.initFromDB = true;
        if (SIMSlotManager.ready || SIMSlotManager.noSIMCardOnDevice()) {
          this.updateDefaultServiceSettings();
        }
      });
    },

    setServiceOnCard: function ssh_setServiceOnCard(serviceName) {
      var mozKeys = [];
      var notFirstSet = this['ril.notFirst.sim.settings'];
      var cardIndex = this.ALWAYS_ASK_OPTION_VALUE;
      switch (serviceName) {
        case 'outgoingCall':
          mozKeys.push('ril.telephony.defaultServiceId');
          mozKeys.push('ril.voicemail.defaultServiceId');
          break;

        case 'outgoingMessages':
          mozKeys.push('ril.sms.defaultServiceId');
          mozKeys.push('ril.mms.defaultServiceId');
          break;

        case 'outgoingData':
          mozKeys.push('ril.data.defaultServiceId');
          if (this.resetDataFlag &&
            (this['ril.sim.iccIds'][0] !== this.iccIds[0] ||
            this['ril.sim.iccIds'][1] !== this.iccIds[1])) {
            notFirstSet = false;
          }
          break;
      }
      // First time run and first set.
      if (!notFirstSet) {
        if (SIMSlotManager.noSIMCardOnDevice()) {
          cardIndex = this.ALWAYS_ASK_OPTION_VALUE;
        } else {
          cardIndex = SIMSlotManager.isSIMCardAbsent(0) ? 1 : 0;
          if (serviceName === 'outgoingData' &&
            this.carrierSimMatchResult[0] === false &&
            this.carrierSimMatchResult[1] === true) {
            cardIndex = 1;
          }
        }
      }

      if (this.lastcardsState[0] === 'locked' &&
        this.lastcardsState[1] === 'ready') {
        cardIndex = 1;
      } else if (this.lastcardsState[1] === 'locked' &&
        this.lastcardsState[0] === 'ready') {
        cardIndex = 0;
      }

      mozKeys.forEach((eachKey) => {
        if (cardIndex === this.ALWAYS_ASK_OPTION_VALUE && notFirstSet) {
          // Not first set, need compare remembered iccid
          // if not matched, then set to -1. (always ask)
          var iccId = this[eachKey + '.iccId'];
          if (iccId) {
            if (iccId === this.iccIds[0] &&
              this.lastcardsState[0] === 'ready') {
              cardIndex = 0;
            } else if (iccId === this.iccIds[1] &&
              this.lastcardsState[1] === 'ready') {
              cardIndex = 1;
            }
          }
        }
        if (eachKey === 'ril.data.defaultServiceId') {
          if (cardIndex === this.ALWAYS_ASK_OPTION_VALUE) {
            // 1. No simcard
            // 2. slot1 empty & slot2 new simcard
            // 3. slot1 new simcard & slot2 empty
            // 4. slot1 & slot2 both new simcards (slot1 is ready)
            // 5. slot1 & slot2 both new simcards (slot1  locked, slot2 ready)
            // 1, 3, 4 cardIndex set to 0, 2 & 5 set to 1
            var slots = SIMSlotManager.getSlots();
            if (slots[0].isAbsent() && !slots[1].isAbsent()) {
              cardIndex = 1;
            } else {
              cardIndex = 0;
            }
          }

          if (this.lastcardsState[0] !== 'locked' &&
            this.lastcardsState[1] !== 'locked' &&
            (!this['ril.sim.iccIds'] ||
            this['ril.sim.iccIds'][cardIndex] !== this.iccIds[cardIndex] ||
            this['ril.data.defaultServiceId'] !== cardIndex)) {
            this.notification = this.showSimCardConfirmation(cardIndex);
          }
          SettingsObserver.setValue([{
            name: 'ril.sim.iccIds',
            value: this.iccIds
          }]);
        }
        SettingsObserver.setValue([{
          name: eachKey,
          value: cardIndex
        }]);
      });
    }
  };
  exports.SimSettingsHelper = SimSettingsHelper;
})(window);
