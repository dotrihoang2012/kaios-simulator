'use strict';
/* global SettingsHelper, BaseModule, SIMSlotManager, Service,
   SettingsObserver */

(function() {
  /**
   * TelephonySettings sets voice privacy and roaming modes based on
   * the users saved settings.
   * @requires SettingsHelper
   * @class TelephonySettings
   */
  function TelephonySettings(core) {
    this.started = false;
    this.connections = core.mobileConnections || [];
  }

  TelephonySettings.SERVICES = [
    'setPreferredNetworkType'
  ];
  TelephonySettings.SETTINGS = [
    'tty.mode.enabled',
    'accessibility.hac_mode',
    'ril.ims.enabled',
    'ril.radio.preferredNetworkType',
    'ril.defaultServiceId.preferredNetworkType',
    'ril.data.defaultServiceId',
    'ril.data.defaultServiceId.iccId',
    'ril.ims.preferredProfile',
    'ril.dsds.ims.enabled',
    'ril.dsds.ims.preferredProfile',
    'ril.rtt.enabled'
  ];

  TelephonySettings.STATES = [
    'hacMode'
  ];

  BaseModule.create(TelephonySettings, {
    name: 'TelephonySettings',
    EVENT_PREFIX: '',
    hacMode: false,
    prefNetworkType: {},
    defaultPrefNetworkType: null,
    defaultServiceId: 0,
    prefSimIccId: null,
    taskScheduler: null,
    /**
     * Initialzes all settings.
     * @memberof TelephonySettings.prototype
     */
    _start: function() {
      this.taskScheduler = this._taskScheduler();
      this.initVoicePrivacy();
      this.initRoaming();
      if (!SIMSlotManager.isMultiSIM() ||
        !Service.query('supportSwitchPrimarysim')) {
        this.initPreferredNetworkType();
      }
    },

    _taskScheduler: function() {
      return {
        _isLocked: false,
        _tasks: [],
        _lock: function() {
          this._isLocked = true;
        },
        _unlock: function() {
          this._isLocked = false;
          this._executeNextTask();
        },
        _executeNextTask: function() {
          if (this._isLocked) {
            return;
          }
          var nextTask = this._tasks.shift();
          if (nextTask) {
            this._lock();
            nextTask.func(nextTask.cardIndex, nextTask.value).then(() => {
              this._unlock();
            }, () => {
              this._unlock();
            });
          }
        },
        enqueue: function(cardIndex, value, func) {
          this._tasks.push({
            cardIndex: cardIndex,
            value: value,
            func: func
          });
          this._executeNextTask();
        }
      };
    },

    '_observe_tty.mode.enabled': function(value) {
      if (navigator.b2g.telephony) {
        navigator.b2g.telephony.ttyMode = value;
      }
    },

    '_observe_accessibility.hac_mode': function(value) {
      this.hacMode = value;
      this.publish('hacchange');
      if (navigator.b2g.telephony) {
        navigator.b2g.telephony.hacMode = value;
      }
    },

    '_observe_ril.radio.preferredNetworkType': function(value) {
      if (!value) {
        this._getDefaultPreferredNetworkTypes().then(defaultValues => {
          this.prefNetworkType = defaultValues;
          this.savePreferredNetworkType();
        });
      } else {
        this.prefNetworkType = value;
        this.savePreferredNetworkType();
      }
    },

    '_observe_ril.defaultServiceId.preferredNetworkType': function(value) {
      this.defaultPrefNetworkType = value;
    },

    '_observe_ril.data.defaultServiceId': function(value) {
      this.defaultServiceId = value;
    },

    '_observe_ril.data.defaultServiceId.iccId': function(value) {
      this.prefSimIccId = value;
      this.savePreferredNetworkType();
    },

    '_observe_ril.ims.enabled': function(value) {
      if (Service.query('supportDualLte')) {
        return;
      }
      var simSlots = SIMSlotManager.getSlots();
      for (var index = 0; index < simSlots.length; index++) {
        if (this.connections[index] && this.connections[index].imsHandler) {
          this.taskScheduler.enqueue(index, value, (cardIndex, value) => {
            var imsHandler = this.connections[cardIndex].imsHandler;
            return imsHandler.setEnabled(value);
          });
        }
      }
    },

    '_observe_ril.ims.preferredProfile': function(value) {
      if (Service.query('supportDualLte')) {
        return;
      }
      var simSlots = SIMSlotManager.getSlots();
      for (var index = 0; index < simSlots.length; index++) {
        if (this.connections[index] && this.connections[index].imsHandler) {
          this.taskScheduler.enqueue(index, value, (cardIndex, value) => {
            var imsHandler = this.connections[cardIndex].imsHandler;
            return imsHandler.setPreferredProfile(value);
          });
        }
      }
    },

    '_observe_ril.dsds.ims.enabled': function(values) {
      if (!Service.query('supportDualLte')) {
        return;
      }
      let simSlots = SIMSlotManager.getSlots();
      for (let index = 0; index < simSlots.length; index++) {
        if (this.connections[index].imsHandler) {
          let value = values[index];
          this.taskScheduler.enqueue(index, value, (cardIndex, value) => {
            let imsHandler = this.connections[cardIndex].imsHandler;
            return imsHandler.setEnabled(value);
          });
        }
      }
    },

    '_observe_ril.dsds.ims.preferredProfile': function(values) {
      if (!Service.query('supportDualLte')) {
        return;
      }
      let simSlots = SIMSlotManager.getSlots();
      for (let index = 0; index < simSlots.length; index++) {
        if (this.connections[index].imsHandler) {
          let value = values[index];
          this.taskScheduler.enqueue(index, value, (cardIndex, value) => {
            let imsHandler = this.connections[cardIndex].imsHandler;
            return imsHandler.setPreferredProfile(value);
          });
        }
      }
    },

    '_observe_ril.rtt.enabled': function(value) {
      if (!Service.query('hasRtt')) {
        return;
      }
      var simSlots = SIMSlotManager.getSlots();
      for (var index = 0; index < simSlots.length; index++) {
        if (this.connections[index] && this.connections[index].imsHandler) {
          this.taskScheduler.enqueue(index, value, (cardIndex, value) => {
            var imsHandler = this.connections[cardIndex].imsHandler;
            return imsHandler.setRttEnabled(!!value);
          });
        }
      }
    },

    savePreferredNetworkType: function() {
      var cardIndex = this.defaultServiceId;
      const conns = navigator.b2g.mobileConnections || [];
      if (this.prefSimIccId && conns[cardIndex] &&
        this.prefSimIccId === conns[cardIndex].iccId) {
        var preferredNetworkType =
          SettingsHelper('ril.defaultServiceId.preferredNetworkType');
        preferredNetworkType.set(this.prefNetworkType[cardIndex]);
      }
    },
    /**
     * Initializes voice privacy based on user setting.
     */
    initVoicePrivacy: function() {
      SettingsObserver.getValue('ril.voicePrivacy.enabled').then((values) => {
        if (!values) {
          console.log('ril.voicePrivacy.enabled is undefined, ' +
            'device does not support CDMA');
          return;
        }
        this.connections.forEach(function vp_iterator(conn, index) {
          var setReq = conn.setVoicePrivacyMode(values[index]);
          setReq.onerror = function set_vpm_error() {
            if (setReq.error.name === 'RequestNotSupported' ||
                setReq.error.name === 'GenericFailure') {
              console.log('Request not supported.');
            } else {
              console.error('Error setting voice privacy.');
            }
          };
        });
      });
    },

    /**
     * Initializes roaming based on user setting.
     */
    initRoaming: function() {
      var defaultRoamingPreferences =
        this.connections.map(function() { return 'any'; });
      var roamingPreferenceHelper =
        SettingsHelper('ril.roaming.preference', defaultRoamingPreferences);
      roamingPreferenceHelper.get(function got_rp(values) {
        this.connections.forEach(function rp_iterator(conn, index) {
          var setReq = conn.setRoamingPreference(values[index]);
          setReq.onerror = function set_vpm_error() {
            if (setReq.error.name === 'RequestNotSupported' ||
                setReq.error.name === 'GenericFailure') {
              console.log('Request not supported.');
            } else {
              console.error('Error roaming preference.');
            }
          };
        });
      }.bind(this));
    },
    // cardsState.state:
    // 1. 'newPrefCard' --> set data to other card
    // 2. 'oldCard' --> reboot device and card not change
    // 3. 'recordPrefCard' -->  insert new card and the card is the last card
    //                          that user set mobile data
    // 4. 'noSimCard' --> no sim card in device
    // 5. 'noMobileData' --> the card not set mobile data.
    // 6. 1 & 4 set with allType
    // 7. 2 set with 'ril.radio.preferredNetworkType'
    // 8. 3 set with 'ril.defaultServiceId.preferredNetworkType'
    // 9. 5 set allType;
    setPreferredNetworkType: function(cardsState) {
      this.connections.forEach((conn, index) => {
        this._getDefaultPreferredNetworkType(index).then((allType) => {
          console.log('getPreferredNetworkType ' + allType + ' ' +
            cardsState[index].state);
          var state = cardsState[index].state;
          if (state === 'newPrefCard' || state === 'noSimCard') {
            this.prefNetworkType[index] = allType;
          } else if (state === 'recordPrefCard') {
            this.prefNetworkType[index] =
              this.defaultPrefNetworkType || allType;
          } else if (state === 'noMobileData') {
            this.prefNetworkType[index] = allType;
          }
          this._setDefaultPreferredNetworkType(conn,
            this.prefNetworkType[index]);
          var preferredNetworkTypeHelper =
            SettingsHelper('ril.radio.preferredNetworkType');
          preferredNetworkTypeHelper.set(this.prefNetworkType);
        });
      });
    },

    /**
     * Initialize preferred network type. If the default value is null, we
     * should use the option that makes the device able to connect all supported
     * netwrok types.
     */
    initPreferredNetworkType: function() {
      var preferredNetworkTypeHelper =
        SettingsHelper('ril.radio.preferredNetworkType');
      preferredNetworkTypeHelper.get((values) => {
        this._getDefaultPreferredNetworkTypes().then(defaultValues => {
          if (!values || !values.length) {
            values = defaultValues;
            preferredNetworkTypeHelper.set(values);
          } else if (typeof values == 'string') {
            // do the migration
            let tempDefault = defaultValues;
            tempDefault[0] = values;
            values = tempDefault;
            preferredNetworkTypeHelper.set(values);
          }
          this.connections.forEach((conn, index) => {
            this._setDefaultPreferredNetworkType(conn, values[index]);
          });
        });
      });
    },

    _isSubSidyLock: function(index) {
      const SUBSIDY_LOCK_SIM_NETWORK = 1;
      if (navigator.subsidyLockManager) {
        return new Promise((resolve) => {
          navigator.subsidyLockManager[index].getSubsidyLockStatus()
            .then((value) => {
            if (value && value.includes(SUBSIDY_LOCK_SIM_NETWORK)) {
              resolve(true);
            } else {
              resolve(false);
            }
          });
        });
      } else {
        return Promise.resolve(false);
      }
    },

    _setDefaultPreferredNetworkType: function(conn, preferredNetworkType) {
      var doSet = function() {
        var setReq = conn.setPreferredNetworkType(preferredNetworkType);
        setReq.onerror = function set_vpm_error() {
          console.error('Error setting preferred network type: ' +
            preferredNetworkType);
        };
      };
      if (conn.radioState === 'enabled') {
        doSet();
      } else {
        conn.addEventListener('radiostatechange', function onchange() {
          if (conn.radioState === 'enabled') {
            conn.removeEventListener('radiostatechange', onchange);
            doSet();
          }
        });
      }
    },

    /**
     * Returns an array specifying the default preferred network types of all
     * mobile connections.
     */
    _getDefaultPreferredNetworkTypes: function() {
      return new Promise((resolve) => {
        let promises = [];
        this.connections.forEach((conn, index) => {
          promises.push(this._getDefaultPreferredNetworkType(index));
        });
        Promise.all(promises).then(values => {
          resolve(values);
        });
      });
    },

    /**
     * Returns the default preferred network types based on the hardware
     * supported network types.
     */
    _getDefaultPreferredNetworkType: function(index) {
      const conn = navigator.b2g.mobileConnections &&
        navigator.b2g.mobileConnections[index];
      return new Promise((resolve) => {
        Promise.all([conn.getSupportedNetworkTypes(),
          this._isSubSidyLock(index)])
          .then((values) => {
          let allTypes = ['lte', 'wcdma', 'tdscdma', 'gsm', 'cdma', 'evdo'];
          if (values[1]) {
            if (values[0].indexOf('lte') > -1) {
              allTypes = ['wcdma', 'tdscdma', 'gsm', 'cdma', 'evdo'];
            } else {
              allTypes = ['gsm', 'cdma', 'evdo'];
            }
          }
          let types = allTypes.filter((type) => {
            return (values[0] && values[0].indexOf(type) !== -1);
          }).join('/');
          resolve(types);
        });
      });
    }
  });

}());
