'use strict';
/* global MobileOperator */
/* global BaseModule */
/* global SIMSlotManager */
/* global Service */

const GSM_CMAS_LOWER_BOUND = 4370;  //0x1112
const GSM_CMAS_UPPER_BOUND = 4400;  //0x1130
const CDMA_CMAS_LOWER_BOUND = 4096; //0x1000
const CDMA_CMAS_UPPER_BOUND = 4351; //0x10FF

const ETWS_WARNINGTYPE_EARTHQUAKE = 4352;             //0x1100 Earthquake warning!
const ETWS_WARNINGTYPE_TSUNAMI = 4353;                //0x1101 Tsunami waring!
const ETWS_WARNINGTYPE_EARTHQUAKE_TSUNAMI = 4354;     //0x1102 Earthquake-tsunami warning!
const ETWS_WARNINGTYPE_TEST = 4355;                   //0x1103 Test emergency warning!
const ETWS_WARNINGTYPE_OTHER = 4356;                  //0x1104 Other emergency warning!
const ETWS_WARNINGTYPE_EXTENSION_LOWER_BOUND = 4357;  //0x1105 Future extension warning
const ETWS_WARNINGTYPE_EXTENSION_UPPER_BOUND = 4359;  //0x1107 Future extension warning

(function() {
  /**
   * CellBroadcastSystem
   * @class CellBroadcastSystem
   * @requires CarrierInfoNotifier
   * @requires MobileOperator
   */
  let CellBroadcastSystem = function() {}

  CellBroadcastSystem.SETTINGS = [
    'ril.cellbroadcast.disabled',
    'airplaneMode.enabled'
  ];

  BaseModule.create(CellBroadcastSystem, {
    name: 'CellBroadcastSystem',

    lastCBMsg: null,

    TAG_PREFIX: 'cell-broadcast-',

    EVENT_PREFIX: 'cellbroadcast',

    DEBUG: true,

    '_observe_ril.cellbroadcast.disabled': function() {
      Service.request('handleSystemMessageNotification', 'cellbroadcast', this);
      this.toggleCellbroadcast();
    },

    '_observe_airplaneMode.enabled': function() {
      this.clearSpecialNotifications();
    },

    toggleCellbroadcast: function() {
      const cellBroadcast = navigator.b2g.cellBroadcast;
      if (!cellBroadcast) {
        console.warn('No navigator.b2g.cellBroadcast!');
        return;
      }
      if (this._hasNormalCBSDisabled()) {
        this.debug('disabled!');
        cellBroadcast.onreceived = null;
      } else {
        this.debug('enabled!');
        cellBroadcast.onreceived = this.show.bind(this);
      }
      this.publish('msgchanged');
    },

    showCBMessage: function(message) {
      Service.request('DialogService:show', {
        id: 'cb-message-alert',
        header: window.api.l10n.get('cb-channel', { channel: message.messageId }),
        content: message.body,
        type: 'alert',
        translated: true,
        noClose: true,
        onOk: () => {
          Service.request('DialogService:hide', 'cb-message-alert');
        }
      });
    },

    clearSpecialNotifications: function(serviceId = null) {
      if (!this.lastCBMsg) {
        return;
      }
      this.lastCBMsg.forEach((msg, index) => {
        if (msg) {
          if (serviceId !== null && serviceId !== index) {
            return;
          }
          this.clearNotifications(msg, false);
          this.lastCBMsg[serviceId] = null;
        }
      });
    },

    clearNotifications: function(message, fromSW = true) {
      Service.request('removeSystemNoticeByTag', message.tag, fromSW);
    },

    getNetworkType: function(conn) {
      let type = null;
      if (!conn) {
        return type;
      }

      const data = conn.data;
      const voice_data = data ? data : conn.voice;
      if ((data && data.state === 'registered') ||
          (conn.voice && conn.voice.connected)) {
        type = voice_data.type;
      }
      return type;
    },

    /**
     * Check and clear notification messages when network changes for Brazil.
     * Pls see our spec for detail rules.
     */
    updateSpecialNotification: function() {
      const conns = navigator.b2g.mobileConnections;
      if (!conns) {
        return;
      }

      // 2G network type(voice & data)
      const tType = ['gsm', 'edge', 'gprs', 'is95a', 'is95b', '1xrtt'];
      Array.from(conns).forEach((conn, index) => {
        if (this.lastCBMsg[index]) {
          const type = this.getNetworkType(conn);
          const lastType = this.lastCBMsg[index].type;
          if (!type || (type !== lastType &&
              (tType.indexOf(type) > -1 ||
              tType.indexOf(lastType) > -1))) {
            this.clearSpecialNotifications(index);
          }
        }
      });
    },

    initNetwork: function() {
      const conns = navigator.b2g.mobileConnections;
      if (!conns) {
        return;
      }

      if (SIMSlotManager.ready) {
        if (this.bInit) {
          return;
        }
        this.bInit = true;
        Array.from(conns).forEach((conn, index) => {
          if (!SIMSlotManager.isSIMCardAbsent(index)) {
            conn.addEventListener('datachange', this);
            conn.addEventListener('voicechange', this);
          }
        });
      } else {
        window.addEventListener('simslotready', this);
      }
    },

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'voicechange':
        case 'datachange':
          this.updateSpecialNotification();
          break;
        case 'simslotready':
          window.removeEventListener('simslotready', this);
          this.initNetwork();
          break;
      }
    },

    isEmergencyAlert: function (message) {
      return this.isWEAMsg(message) || this.isETWSAlert(message);
    },

    isWEAMsg: function(message) { // WEA
      if (message.cdmaServiceCategory) {
        return (message.cdmaServiceCategory >= CDMA_CMAS_LOWER_BOUND &&
          message.cdmaServiceCategory <= CDMA_CMAS_UPPER_BOUND);
      } else {
        return (message.messageId >= GSM_CMAS_LOWER_BOUND &&
          message.messageId < GSM_CMAS_UPPER_BOUND);
      }
    },

    isETWSAlert: function(message) { // ETWS
      if (message.etws) {
        return (message.messageId === ETWS_WARNINGTYPE_EARTHQUAKE ||
          message.messageId === ETWS_WARNINGTYPE_TSUNAMI ||
          message.messageId === ETWS_WARNINGTYPE_EARTHQUAKE_TSUNAMI ||
          message.messageId === ETWS_WARNINGTYPE_TEST ||
          message.messageId === ETWS_WARNINGTYPE_OTHER ||
          (message.messageId >= ETWS_WARNINGTYPE_EXTENSION_LOWER_BOUND &&
          message.messageId <= ETWS_WARNINGTYPE_EXTENSION_UPPER_BOUND));
      } else {
        return false;
      }
    },

    /**
     * Shows the cell broadcast notification.
     * @memberof CellBroadcastSystem.prototype
     */
    show: function cbs_show(event) {
      this.debug('will show cb if it is not emergency');
      let msg = event.message;
      let serviceId = msg.serviceId || 0;
      const conn = navigator.b2g.mobileConnections &&
        navigator.b2g.mobileConnections[serviceId];
      let id = msg.messageId;

      // Early return CMAS messsage and let network alert app handle it. Please
      // ref http://www.etsi.org/deliver/etsi_ts/123000_123099/123041/
      // 11.06.00_60/ts_123041v110600p.pdf, chapter 9.4.1.2.2 GSM Message
      // identifier Message id from range 4370 to 4399(1112 hex to 112f hex),
      // and CDMA Message identifier Message id from range 4096 to 4351(0x1000
      // hex ro 0x10ff hex) should be CMAS message and network alert will
      // display detail information.
      if (this.isEmergencyAlert(msg)) {
        return;
      }

      if (this._currentCBSEnabled(serviceId)) {
        if (conn && conn.voice.network &&
            conn.voice.network.mcc === MobileOperator.BRAZIL_MCC &&
            id === MobileOperator.BRAZIL_CELLBROADCAST_CHANNEL) {
          if (!this.lastCBMsg) {
            this.lastCBMsg = [null, null];
          }
          if (!this.lastCBMsg[serviceId] ||
              this.lastCBMsg[serviceId].message.body !== msg.body) {
            this.initNetwork();
            this.sendNotification(msg, true);
          }
        } else {
          this.sendNotification(msg);
        }
      }
    },

    cloneMessage: function(message) {
      let nMsg = {};
      for (let key in message) {
        nMsg[key] = message[key];
      }
      return nMsg;
    },

    sendNotification: function(msg, bSpecial) {
      // Because cb message type is MozCellBroadcastMessage, it can't use to
      // show notification, need clone new obj(It can't be copied as a whole,
      // only can be assigned one by one.)
      const message = this.cloneMessage(msg);
      return new Promise((resolve, reject) => {
        let _ = window.api.l10n.get;
        let iconName = '';
        if (SIMSlotManager.isMultiSIM()) {
          iconName = 'cell-broadcast-sim' + (message.serviceId + 1);
        } else {
          iconName = 'cell-broadcast';
        }

        let title = _('cell-broadcast-subtitle') + ' - ' + message.messageId;
        let tag = this.TAG_PREFIX + message.timestamp;
        let options = {
          icon: iconName,
          data: {
            systemMessageTarget: 'cellbroadcast',
            msg: message
          },
          body: message.body,
          tag: tag,
          mozbehavior: {
            noclear: bSpecial
          }
        };
        if (bSpecial) {
          this.clearSpecialNotifications(message.serviceId);
          const conns = navigator.b2g.mobileConnections &&
            navigator.b2g.mobileConnections[message.serviceId];
          const networkType = this.getNetworkType(conns);
          const notification = new Notification(title, options);

          notification.onerror = () => {
            reject(new Error('notification API error'));
          };
          notification.onshow = resolve;
          notification.onclick = (evt) => {
            const msg = evt.target.data.msg;
            this.showCBMessage(msg);
          };

          this.lastCBMsg[message.serviceId] = {
            message: message,
            tag: tag,
            type: networkType
          };
        } else {
          window.NotificationService.send(title, options);
        }
      }, this);
    },

    handleSystemMessageNotification: function(message) {
      this.showCBMessage(message.data.msg);
      this.clearNotifications(message);
    },

    /**
     * To make sure normal CBS pref is disabled
     * @memberof CellBroadcastSystem.prototype
     */
    _hasNormalCBSDisabled: function() {
      if (!this._settings) {
        return true;
      }
      let cbsDisabled = this._settings['ril.cellbroadcast.disabled'];
      let enabled = Array.prototype.some.call((cbsDisabled), (disabled) => {
        return disabled === false;
      });
      return !enabled;
    },

    /**
     * Get current CBS is enabled or not
     */
    _currentCBSEnabled: function(serviceId) {
      if (!this._settings) {
        return false;
      }
      const cbsDisabled = this._settings['ril.cellbroadcast.disabled'];
      return !cbsDisabled[serviceId];
    }
  });
}(window));
