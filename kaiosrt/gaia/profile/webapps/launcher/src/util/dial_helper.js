/* global window, TelephonyCall, SIMSlotManager */
import BaseEmitter from 'base-emitter';
import Service from 'service';
import SimCardHelper from '../util/sim_card_helper';
import { toL10n, sendActivity } from './utils';

const CALL_TYPE = {
  VOICE_N_VIDEO: 1,
  VT: 4
};

// As defined in 3GPP TS 22.030 version 10.0.0 Release 10 standard
// USSD code used to query call barring supplementary service status
const CALL_BARRING_STATUS_MMI_CODE = '*#33#';
// USSD code used to query call waiting supplementary service status
const CALL_WAITING_STATUS_MMI_CODE = '*#43#';

class DialHelper extends BaseEmitter {

  /* subsidyUnlockPattern example: *#865625*1234567890123456*1#
     { password: "1234567890123456", lockType: 1 }
     password should be 8 digit in normal case, but 15~20 digit for FIH case
   */
  subsidyUnlockPattern = /^\*#865625\*(\d{8}(?:\d{7,12})?)\*([1-5])#$/;

  constructor(props) {
    super(props);
    this.validExp = /^(?!,)([0-9#+*,]){1,50}$/;
    this.extraCharExp = /(\s|-|\.|\(|\))/g;
    this.instantDialNumbers = [
      '*#06#',
      '*#07#',
      '*#2886#',
      '*#*#0574#*#*'
    ];
    this.blockedNumber = new Set();
    this.isLimitCallOut = false;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const resultDate = event.data;
      if (resultDate.name === 'ussd-received') {
        this.onUssdReceived();
      }
    });

    DeviceCapabilityManager.get('device.parental-control').then((isLimit) => {
      this.isLimitCallOut = !!isLimit;
    });

    // Get all blocked number and listen change
    this.initBlockedNumber();

    // hide some number on non-debugger-mode
    SettingsObserver.getValue('debugger.remote-mode')
      .then((remoteMode) => {
        if ('disabled' !== remoteMode) {
          this.debuggerRemoteMode = true;
          this.instantDialNumbers = this.instantDialNumbers.concat([
            '*#0606#',
            '*#8378269#',
            '*#*#2637643#*#*',
            '*#*#33284#*#*'
          ]);
        }
      });
  }

  _handle_blockednumberchange(evt) {
    switch (evt.reason) {
      case 'create':
        this.blockedNumber.add(evt.number);
        break;
      case 'remove':
        this.blockedNumber.delete(evt.number);
        break;
      default:
        break;
    }
  }

  initBlockedNumber() {
    ContactsManager.addEventListener(ContactsManager.EventMap.BLOCKED_NUMBER_CHANGE,
      this._handle_blockednumberchange);
    ContactsManager.getAllBlockedNumbers()
      .then((result) => {
        if (result && result.length) {
          result.forEach((item) => this.blockedNumber.add(item));
        }
      });
  }

  onUssdReceived = () => {
    Service.request('Dialer:resetCallingMarker');
    if (this.mmiloading) {
      this.mmiloading = false;
      Service.request('hideDialog');
    }
  }

  getEmergencyCallNumbers = () => {
    return new Promise((resolve) => {
      navigator.b2g.telephony.getEccList()
        .then((numbers) => {
          resolve(numbers && numbers.split(','));
        })
        .catch(() => console.error('Get ecclist error!'));
    });
  }

  errorCases = {
    invalidNumber: {
      header: 'invalidNumberToDialTitle',
      content: 'invalidNumberToDialMessage'
    },
    NoNetwork: {
      header: 'emergencyDialogTitle',
      content: 'emergencyDialogBodyBadNumber'
    },
    EmergencyCallOnly: {
      header: 'emergency-call-only',
      content: 'emergency-call-error',
      containNumber: true
    },
    RadioNotAvailable: {
      header: 'callAirplaneModeTitle',
      content: 'callAirplaneModeMessage'
    },
    DeviceNotAccepted: {
      header: 'emergencyDialogTitle',
      content: 'emergencyDialogBodyDeviceNotAccepted'
    },
    Busy: {
      header: 'numberIsBusyTitle',
      content: 'numberIsBusyMessage'
    },
    FDNBlocked: {
      header: 'fdnIsActiveTitle',
      content: 'fdnIsActiveMessage',
      containNumber: true
    },
    FdnCheckFailure: {
      header: 'fdnIsActiveTitle',
      content: 'fdnIsActiveMessage',
      containNumber: true
    },
    OtherConnectionInUse: {
      header: 'otherConnectionInUseTitle',
      content: 'otherConnectionInUseMessage'
    }
  };

  listDeviceInfos(type) {
    let simInfos = [...navigator.b2g.mobileConnections]
      .map((conn) => conn.getDeviceIdentities()[type]);

    Service.request('showDialog', {
      type: 'alert',
      header: type.toUpperCase(),
      content: simInfos.join('\n'),
      translated: true,
      noClose: false
    });
  }

  setDebuggerMode(enable) {
    if (enable) {
      SettingsObserver.setValue([{
        name: 'debugger.remote-mode',
        value: 'adb-devtools'
      }]);
    } else {
      SettingsObserver.setValue([{
        name: 'debugger.remote-mode',
        value: 'disabled'
      }]);
    }
  }

  showSarValue() {
    SettingsObserver.getValue('deviceinfo.sar_value')
      .then((sarValue) => {
        Service.request('showDialog', {
          type: 'alert',
          header: 'SAR Information',
          content: `${sarValue || '0'} W/kg`,
          translated: true,
          noClose: false
        });
      });
  }

  instantDialIfNecessary(telNum) {
    return this.instantDialNumbers.includes(telNum);
  }

  mmiHandler(promise, sentMMI) {
    this.mmiloading = true;
    this.emit('mmiloading');
    promise.then((mmiResult) => {
      if (!mmiResult) {
        this.emit('mmiloaded', '!', 'GenericFailure');
        return;
      }

      let title = toL10n(mmiResult.serviceCode);
      let message = mmiResult.statusMessage;
      let additionalInformation = mmiResult.additionalInformation;

      switch (mmiResult.serviceCode) {
        case 'scCall':
          return;
        case 'scUssd':
          if (!message) {
            return;
          }
          break;
        case 'scCallForwarding':
          if (!message) {
            message = 'GenericFailure';
          } else if (additionalInformation) {
            // Call forwarding requests via MMI codes might return an array of
            // nsIDOMMozMobileCFInfo objects. In that case we serialize that array
            // into a single string that can be shown on the screen.
            message = this.processCf(additionalInformation);
          }
          break;
        case 'scCallBarring':
        case 'scCallWaiting':
          // If we are just querying the status of the service, we show a different message,
          // so the user knows she hasn't change anything
          if (sentMMI === CALL_BARRING_STATUS_MMI_CODE ||
              sentMMI === CALL_WAITING_STATUS_MMI_CODE) {
            let additionalInfor = [];
            let msgCase = {
              'smServiceEnabled': 'ServiceIsEnabled',
              'smServiceDisabled': 'ServiceIsDisabled',
              'smServiceEnabledFor': 'ServiceIsEnabledFor'
            };
            // Call barring and call waiting requests via MMI codes might return an
            // array of strings indicating the service it is enabled for or just
            // the disabled status message.
            if (additionalInformation &&
                'smServiceEnabledFor' === message &&
                Array.isArray(additionalInformation)) {
              additionalInfor = additionalInformation.map(toL10n);
            }
            additionalInfor.unshift(toL10n(msgCase[message]) || message);
            message = additionalInfor.join('\n');
          }
          break;
        default:
          break;
      }
      if ('RadioNotAvailable' === message) {
        message = 'callAirplaneModeMessage';
      }

      this.mmiloading = false;
      this.emit('mmiloaded', title, message);
    });
  }

  // Helper function to compose an informative message about a successful
  // request to query the call forwarding status.
  processCf(result) {
    let inactive = toL10n('call-forwarding-inactive');
    let voice = inactive;
    let data = inactive;
    let fax = inactive;
    let sms = inactive;
    let sync = inactive;
    let async = inactive;
    let packet = inactive;
    let pad = inactive;
    let timeSeconds = 0;

    for (let i = 0; i < result.length; i++) {
      if (!result[i].active) {
        continue; // eslint-disable-line no-continue
      }

      for (let serviceClassMask = 1;
           serviceClassMask <= this._conn.ICC_SERVICE_CLASS_MAX;
           serviceClassMask <<= 1) {
        if ((serviceClassMask & result[i].serviceClass) !== 0) {
          timeSeconds = result[i].timeSeconds || 0;
          switch (serviceClassMask) {
            case this._conn.ICC_SERVICE_CLASS_VOICE:
              voice = result[i].number;
              break;
            case this._conn.ICC_SERVICE_CLASS_DATA:
              data = result[i].number;
              break;
            case this._conn.ICC_SERVICE_CLASS_FAX:
              fax = result[i].number;
              break;
            case this._conn.ICC_SERVICE_CLASS_SMS:
              sms = result[i].number;
              break;
            case this._conn.ICC_SERVICE_CLASS_DATA_SYNC:
              sync = result[i].number;
              break;
            case this._conn.ICC_SERVICE_CLASS_DATA_ASYNC:
              async = result[i].number;
              break;
            case this._conn.ICC_SERVICE_CLASS_PACKET:
              packet = result[i].number;
              break;
            case this._conn.ICC_SERVICE_CLASS_PAD:
              pad = result[i].number;
              break;
            default:
              return toL10n('call-forwarding-error');
          }
        }
      }
    }

    let msg = [
      toL10n('call-forwarding-status'),
      timeSeconds
        ? toL10n('call-forwarding-voice-after-seconds', { voice, timeSeconds })
        : toL10n('call-forwarding-voice', { voice }),
      toL10n('call-forwarding-data', { data }),
      toL10n('call-forwarding-fax', { fax }),
      toL10n('call-forwarding-sms', { sms }),
      toL10n('call-forwarding-sync', { sync }),
      toL10n('call-forwarding-async', { async }),
      toL10n('call-forwarding-packet', { packet }),
      toL10n('call-forwarding-pad', { pad })
    ].join('\n');

    return msg;
  }

  dialForcely(number, options = { isRtt: false }) {
    console.warn('dialForcely', number, options);
    const callType = CALL_TYPE.VOICE_N_VIDEO;

    return this.checkLimitCallNumber(number)
      .then(() => Service.request('chooseSim', 'call'))
      .then((serviceId) => {
        return navigator.b2g.telephony.dial(
          number,
          callType,
          options.isRtt,
          serviceId
        );
      });
  }

  dial(number, options = {
    isVideo: false, isRtt: false, serviceId: null, speedDial: false }) {
    // sanitization number
    number = String(number).replace(this.extraCharExp, '');
    if (this.checkSpecialNumber(number)) {
      return Promise.resolve();
    }

    if (!this.isValid(number)) {
      this.errorHandler({ errorName: 'invalidNumber' });
      return Promise.reject();
    }

    return new Promise((resolve, reject) => {
      const { isVideo, isRtt, serviceId, speedDial } = options;

      let dialWithCardIndex = (cardIndex) => {
        let conn = navigator.b2g.mobileConnections && navigator.b2g.mobileConnections[cardIndex];
        let self = this;
        let callPromise;
        let originNumber = number;
        number = this.getNumberAsDtmfToneGroups(originNumber)[0];
        this._conn = conn;

        // No voice connection, the call won't make it
        if (!conn || !conn.voice) {
          reject();
          this.errorHandler({ errorName: 'NoNetwork' });
          return;
        }

        let telephony = navigator.b2g.telephony;
        if (!telephony) {
          reject();
          return;
        }

        !speedDial && Service.request('Dialer:toggleStayEffect', true);
        let imsCapability = conn.imsHandler && conn.imsHandler.capability;
        let emergencyOnly = !imsCapability && conn.voice.emergencyCallsOnly;

        const callType = isVideo ? CALL_TYPE.VT : CALL_TYPE.VOICE_N_VIDEO;
        callPromise = telephony.dial(number, callType, isRtt, cardIndex);

        callPromise.then((callObj) => {
          resolve();
          if (callObj instanceof TelephonyCall) { // regular call
            telephony.addEventListener('callschanged', function callschangedOnce() {
              telephony.removeEventListener('callschanged', callschangedOnce);
              Service.request('Dialer:toggleStayEffect');
            });

            let dtmfToneGroups = this.getNumberAsDtmfToneGroups(originNumber);
            if (dtmfToneGroups.length > 1) {
              callObj.addEventListener('connected', function dtmfToneGroupPlayer() {
                callObj.removeEventListener('connected', dtmfToneGroupPlayer);
                self.playDtmfToneGroups(dtmfToneGroups, cardIndex);
              });
            }
          } else { // MMI call
            setTimeout(() => {
              Service.request('Dialer:toggleStayEffect');
            }, 0);
            this.mmiHandler(callObj.result, number);
          }
        }).catch((errorName) => {
          Service.request('Dialer:toggleStayEffect');
          reject();
          self.errorHandler({
            errorName: errorName,
            number: number,
            isEmergencyOnly: emergencyOnly
          });
        });
      };

      // Dial with specified SIM-card if provided.
      if (parseInt(serviceId, 10) >= 0) {
        this.checkLimitCallNumber(number)
          .then(() => dialWithCardIndex(serviceId))
          .catch((err) => reject(err));
      } else {
        navigator.b2g.telephony.getEccList()
          .then((eccList) => eccList.includes(number))
          .then((isEmergencyNumber) => {
            const isDualSIMReady = () =>
              !SIMSlotManager.isSIMCardAbsent(0) &&
              !SIMSlotManager.isSIMCardAbsent(1);
            // When both SIMs are ready,
            // dialing emergency calls with SIM-1 without asking.
            if (isEmergencyNumber &&
              isDualSIMReady() &&
              SimCardHelper.isAlwaysAsk()) {
              return 0;
            }
            return this.checkLimitCallNumber(number)
              .then(() => Service.request('chooseSim', 'call'));
          })
          .then((index) => dialWithCardIndex(index))
          .catch((err) => reject(err));
      }
    });
  }

  checkSpecialNumber(number) {
    let isSpecialNumber = true;

    switch (number) {
      case '*#06#': {
        this.listDeviceInfos('imei');
        break;
      }

      case '*#07#': {
        this.showSarValue();
        break;
      }

      case '*#2886#': {
        let activity = sendActivity({
          name: 'mmitest'
        });
        activity.catch(() => {
          console.warn('Could not launch mmitest');
        });
        break;
      }

      case '*#*#0574#*#*': {
        let activity = sendActivity({
          name: 'logmanager'
        });
        activity.catch(() => {
          console.warn('Could not launch logmanager');
        });
        break;
      }

      default: {
        if (this.subsidyUnlockPattern.test(number)) {
          let [password, lockType] = number.match(this.subsidyUnlockPattern).slice(1);
          this.unlockSubsidySIM(password, Number(lockType));
        } else if (this.debuggerRemoteMode) {
          switch (number) {
            case '*#*#2637643#*#*':
            case '*#8378269#': {
              let activity = sendActivity({
                name: 'engmode'
              });
              activity.catch(() => {
                console.warn('Could not launch eng mode');
              });
              break;
            }

            case '*#0606#': {
              this.listDeviceInfos('meid');
              break;
            }

            case '*#*#33284#*#*': {
              this.setDebuggerMode(true);
              break;
            }

            default: {
              isSpecialNumber = false;
              break;
            }
          }
        } else {
          isSpecialNumber = false;
        }
        break;
      }
    }

    return isSpecialNumber;
  }

  checkLimitCallNumber(number) {
    let isUssd = number.length < 2 || number.search(/#$/) !== -1;

    return new Promise((res, rej) => {
      // Check the restrictions:
      //   1.Cannot limit the outgoing calls of ussd and emergency numbers
      //   2.Cannot limit the number of contacts that exist in the contact,
      //     but not in the blacklist
      //   3.Limit all numbers except the 1.2 condition
      if (this.isLimitCallOut && !isUssd) {
        navigator.b2g.telephony.getEccList().then((eccList) => {
          if (eccList.includes(number)) {
            res();
            return;
          }

          this.checkContactNumber(number).then((isContact) => {
            if (!isContact || this.blockedNumber.has(number)) {
              rej('BlockNumber');
            } else {
              res();
            }
          });
        });
      } else {
        res();
      }
    });
  }

  checkContactNumber(number) {
    let findContact = null;
    return new Promise((res, rej) => {
      ContactsManager.find({
        filterBy: [ContactsManager.FilterByOption.TEL],
        filterOption: ContactsManager.FilterOption.FUZZY_MATCH,
        filterValue: number,
        onlyMainData: true
      }, 5)
      .then((cursor) => {
        const fetchData = () => {
          cursor.next()
            .then((contacts) => {
              findContact = contacts.find((contact) =>
                contact.tel.find((item) => item.value === number));
              fetchData();
            })
            .catch((error) => {
              cursor.release();
              if (findContact) {
                res(true);
              } else {
                res(false);
              }
              console.error('traverse error:', error);
            });
        };
        fetchData();
      })
      .catch((error) => {
        console.error('Find contacts error: ' + error);
        rej();
      });
    });
  }

  showLimitNumberDialog(callback) {
    Service.request('showDialog', {
      type: 'alert',
      content: 'LimitBlockNumber',
      noClose: false,
      onOk: callback
    });
  }

  unlockSubsidySIM(password, lockType) {
    if (!navigator.subsidyLockManager) {
      return;
    }
    navigator.subsidyLockManager[0].getSubsidyLockStatus().then((lockedTypes) => {
      // empty lockedTypes / non-matched types
      if (!lockedTypes || !lockedTypes.includes(lockType)) {
        alert(toL10n('deviceIsUnlocked'));
        return;
      }

      let req = navigator.subsidyLockManager[0].unlockSubsidyLock({ lockType, password });
      req.onsuccess = alert(toL10n('simUnlockCodeAccepted'));
      req.onerror = alert(toL10n('simUnlockCodeFailed'));
    });
  }

  playDtmfToneGroups(dtmfToneGroups, cardIndex) {
    let self = this;

    // Remove the dialed number from the beginning of the array.
    dtmfToneGroups = dtmfToneGroups.slice(1);
    let length = dtmfToneGroups.length;

    // Remove the latest entries
    // from dtmfToneGroups corresponding to ',' characters not to play those pauses.
    let lastCommaIndex = length - 1;
    while ('' === dtmfToneGroups[lastCommaIndex]) {
      lastCommaIndex--;
    }
    dtmfToneGroups = dtmfToneGroups.slice(0, ++lastCommaIndex);
    length = dtmfToneGroups.length;

    let promise = Promise.resolve();
    let counter = 0;
    let pauses;

    // Traverse the dtmfToneGroups array.
    while (counter < length) {
      // Reset the number of pauses before each group of tones.
      pauses = 1;
      while ('' === dtmfToneGroups[counter]) {
        // Add a new pause for each '' in the dtmfToneGroups array.
        pauses++;
        counter++;
      }

      // Send a new group of tones as well as the pauses to play before it.
      promise = promise.then(
        self.playDtmfToneGroup.bind(null, dtmfToneGroups[counter++], pauses, cardIndex)
      );
    }
    return promise;
  }

  playDtmfToneGroup(toneGroup, pauses, cardIndex, pausesDuration = 3000) {
    return navigator.b2g.telephony.sendTones(
      toneGroup,
      pausesDuration * pauses, // DTMF_SEPARATOR_PAUSE_DURATION = 3000ms
      null, //  tone duration
      cardIndex
    );
  }

  errorHandler({
    errorName,
    number,
    isEmergencyOnly
  } = {}) {
    console.warn(`Dialer error handler: ${errorName}`);

    if ('BadNumber' === errorName) {
      // TODO: in emergency app, the errorName should change to use 'EmergencyCallOnly'
      errorName = isEmergencyOnly ? 'NoNetwork' : 'RegularCall';
    }

    if ('ServiceNotAvailable' === errorName) {
      errorName = 'NoNetwork';
    }

    let _case = this.errorCases[errorName];

    if (!_case) {
      console.warn(`Unexpected dialer error: ${errorName}`);
      // default error message
      _case = {
        content: 'CallFailed'
      };
    }

    let dialogOption = Object.assign({
      type: 'alert',
      translated: false,
      noClose: false
    }, _case);

    if (dialogOption.containNumber) {
      dialogOption.header = toL10n(dialogOption.header, { number: number });
      dialogOption.content = toL10n(dialogOption.content, { number: number });
      dialogOption.translated = true;
    }

    Service.request('showDialog', dialogOption);
  }

  isValid(number) {
    return this.validExp.test(number);
  }

  getNumberAsDtmfToneGroups(number) {
    return number.split(',');
  }
}

const dialHelper = new DialHelper();

export default dialHelper;
