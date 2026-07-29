/* global */


define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createCallBarringPasscodePanel() {
    const PIN_SIZE = 4;
    let serviceId = 0;
    let cbOptions = {};
    let mobileConnection = null;
    let container = null;
    let passcodeBuffer = '';
    let passcodeDigits = null;
    let callType = 'voice';

    const cbAction = {
      CALL_BARRING_BAOC: 0, // BAOC: Barring All Outgoing Calls
      CALL_BARRING_BOIC: 1, // BOIC: Barring Outgoing International Calls
      CALL_BARRING_BOICEXHC: 2, // BOICEXHC: Barring Outgoing
      // InternationalCalls Except  to Home Country
      CALL_BARRING_BAIC: 3, // BAIC: Barring All Incoming Calls
      CALL_BARRING_BAICR: 4 // BAICR: Barring All Incoming Calls in Roaming
    };

    const cbServiceMapper = {
      baoc: cbAction.CALL_BARRING_BAOC,
      boic: cbAction.CALL_BARRING_BOIC,
      boicExhc: cbAction.CALL_BARRING_BOICEXHC,
      baic: cbAction.CALL_BARRING_BAIC,
      baicR: cbAction.CALL_BARRING_BAICR
    };

    function getInputKey(evt) {
      const { key } = evt;
      const keyCode = Constants.QWERTY_KEY_MAP[key] || key;
      if (keyCode === 'ArrowDown' || keyCode === 'ArrowUp') {
        evt.preventDefault();
        evt.stopPropagation();
      }
      if (!(keyCode >= '0' && keyCode <= '9') && keyCode !== 'Backspace') {
        return;
      }

      if (evt.key === 'Backspace') {
        evt.preventDefault();
        evt.stopPropagation();
        if (passcodeBuffer.length > 0) {
          passcodeBuffer = passcodeBuffer.substring(
            0,
            passcodeBuffer.length - 1
          );
        } else {
          Settings.setCurrentPanel('#call_barring', {
            type: callType,
            serviceId
          });
        }
      } else if (passcodeBuffer.length < PIN_SIZE) {
        passcodeBuffer += keyCode;
      }

      updateUI();
    }

    // Make the digits page show correct dot status
    function updateUI() {
      for (let i = 0; i < PIN_SIZE; i++) {
        if (i < passcodeBuffer.length) {
          passcodeDigits[i].dataset.dot = true;
        } else {
          delete passcodeDigits[i].dataset.dot;
        }
      }

      if (passcodeBuffer.length === PIN_SIZE) {
        setCallBarring(passcodeBuffer);
      }
    }

    function initSoftkey() {
      const params = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: [
          {
            name: 'Cancel',
            l10nId: 'cancel',
            priority: 1,
            method() {
              Settings.setCurrentPanel('#call_barring', {
                type: callType,
                serviceId
              });
            }
          }
        ]
      };

      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    function setCallBarring(passcode) {
      const options = {
        program: cbServiceMapper[cbOptions.settingValue],
        enabled: cbOptions.enabled === 'true' || cbOptions.enabled === true,
        password: passcode,
        serviceClass:
          callType === 'voice'
            ? mobileConnection.ICC_SERVICE_CLASS_VOICE
            : mobileConnection.ICC_SERVICE_CLASS_PACKET |
              mobileConnection.ICC_SERVICE_CLASS_DATA_SYNC
      };
      // Send the request
      const request = mobileConnection.setCallBarringOption(options);
      request.onsuccess = () => {
        ToastHelper.showToast('changessaved');
        Settings.setCurrentPanel('#call_barring', {
          type: callType,
          serviceId
        });
      };

      request.onerror = () => {
        const reason = request.error.message;
        const { enabled } = cbOptions;
        if (reason === 'IncorrectPassword') {
          if (enabled) {
            ToastHelper.showToast(
              'callBarring-enable-options-incorrect-password'
            );
          } else {
            ToastHelper.showToast(
              'callBarring-disable-options-incorrect-password'
            );
          }
        } else if (enabled) {
          ToastHelper.showToast('callBarring-enable-item-error');
        } else {
          ToastHelper.showToast('callBarring-disable-item-error');
        }
        Settings.setCurrentPanel('#call_barring', {
          type: callType,
          serviceId
        });
      };
    }

    function resetPasscode() {
      passcodeBuffer = '';
      updateUI();
    }

    return SettingsPanel({
      onInit(panel) {
        container = panel.querySelector('.passcode-container');
        passcodeDigits = panel.querySelectorAll('.passcode-digit');
        passcodeBuffer = '';

        // Add support to RTL
        if (window.document.dir === 'rtl') {
          const temppasscodeDigits = passcodeDigits;
          passcodeDigits = new Array(4);

          let backward = 4;
          for (let i = 0; i < PIN_SIZE; i++) {
            backward--;
            passcodeDigits[i] = temppasscodeDigits[backward];
          }
        }
      },

      onShow() {
        initSoftkey();
      },

      onBeforeShow(panel, options) {
        // Save the args form the previous page
        serviceId = options.serviceId || serviceId;
        mobileConnection = ApiManager.connections[serviceId];
        cbOptions = options;
        callType = options.type;
        window.addEventListener('keydown', getInputKey, true);
        if (typeof options.visibilityChange === 'undefined') {
          resetPasscode();
          container.classList.add('focus');
        }
      },

      onBeforeHide() {
        window.removeEventListener('keydown', getInputKey, true);
      }
    });
  };
});
