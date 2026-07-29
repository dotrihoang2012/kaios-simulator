/* global */


define('panels/call_barring_passcode_change/panel',['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createCallBarringChangePasscodePanel() {
    let serviceId = 0;
    const settings = {
      pin: '',
      newPin: ''
    };
    let passcodeBuffer = '';
    let elements = {};
    let mobileConnection = null;
    const passCodeHeader = document.getElementById('change-passcode-header');
    const passCodeElement = document.getElementById('passcode-container');
    const progressElement = document.getElementById('updating-container');
    let changeFlag = true;
    let callType = 'voice';

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
        if (passcodeBuffer.length > 0 && changeFlag) {
          passcodeBuffer = passcodeBuffer.substring(
            0,
            passcodeBuffer.length - 1
          );
          initSoftkey();
          updatePasscodeUI();
        } else {
          Settings.setCurrentPanel('#call_barring', {
            type: callType,
            serviceId,
            origin: '#call_barring_passcode_change'
          });
        }
      } else if (passcodeBuffer.length < 12) {
        passcodeBuffer += keyCode;
        updatePasscodeUI();
        if (passcodeBuffer.length === 12) {
          initSoftkey();
        }
        evt.preventDefault();
        evt.stopPropagation();
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
                serviceId,
                origin: '#call_barring_passcode_change'
              });
            }
          }
        ]
      };

      if (passcodeBuffer.length === 12) {
        const currentPasscode = passcodeBuffer.substring(0, 4);
        const passcode = passcodeBuffer.substring(4, 8);
        const passcodeToConfirm = passcodeBuffer.substring(8, 12);
        if (passcode === passcodeToConfirm) {
          elements.errMsg.classList.add('hidden');
          const item = {
            name: 'Change',
            l10nId: 'change',
            priority: 3,
            method() {
              if (changeFlag) {
                changeFlag = false;
                passCodeHeader.classList.add('hidden');
                passCodeElement.classList.add('hidden');
                progressElement.classList.remove('hidden');
                SettingsSoftkey.hide();
                settings.pin = currentPasscode;
                settings.newPin = passcode;
                changePassword();
              }
            }
          };
          params.items.push(item);
        } else {
          progressElement.classList.add('hidden');
          elements.errMsg.classList.remove('hidden');
          passcodeBuffer = currentPasscode;
          for (let i = 0; i < 12; i++) {
            if (i < passcodeBuffer.length) {
              elements.passcodeDigits[i].dataset.dot = true;
            } else {
              delete elements.passcodeDigits[i].dataset.dot;
            }
          }
          elements.createPasscode.classList.add('focus');
          elements.currentPasscode.classList.remove('focus');
          elements.confirmPasscode.classList.remove('focus');
        }
      }

      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    function updatePasscodeUI() {
      for (let i = 0; i < 12; i++) {
        if (i < passcodeBuffer.length) {
          elements.passcodeDigits[i].dataset.dot = true;
        } else {
          delete elements.passcodeDigits[i].dataset.dot;
        }
      }
      const len = passcodeBuffer.length;
      if (len <= 4) {
        elements.currentPasscode.classList.add('focus');
        elements.createPasscode.classList.remove('focus');
        elements.confirmPasscode.classList.remove('focus');
        elements.errMsg.classList.add('hidden');
      } else if (len > 4 && len <= 8) {
        elements.createPasscode.classList.add('focus');
        elements.currentPasscode.classList.remove('focus');
        elements.confirmPasscode.classList.remove('focus');
      } else if (len > 8 && len <= 12) {
        elements.confirmPasscode.classList.add('focus');
        elements.createPasscode.classList.remove('focus');
      }
      const focusedElement = elements.panel.querySelector('.focus');
      if (focusedElement) {
        NavigationMap.scrollToElement(focusedElement);
      }
    }

    function resetScreen() {
      // Clear the stored passcode in the first
      passcodeBuffer = '';
      updatePasscodeUI();
    }

    function changePassword() {
      const request = mobileConnection.changeCallBarringPassword(settings);
      request.onsuccess = () => {
        changeFlag = true;
        passCodeHeader.classList.remove('hidden');
        passCodeElement.classList.remove('hidden');
        progressElement.classList.add('hidden');
        Settings.setCurrentPanel('#call_barring', {
          type: callType,
          serviceId,
          origin: '#call_barring_passcode_change'
        });
        ToastHelper.showToast('callBarring-change-passcode-success');
      };
      request.onerror = err => {
        // Show error { name: "", message: "" }
        changeFlag = true;
        passCodeHeader.classList.remove('hidden');
        passCodeElement.classList.remove('hidden');
        progressElement.classList.add('hidden');
        showErrorDialog('callBarring-change-error', err.message);
      };
    }

    function showErrorDialog(msgId, errorArgs) {
      const dialogConfig = {
        title: {
          id: 'callBarring-change-error-title',
          args: {}
        },
        body: {
          id: msgId,
          args: {
            error: errorArgs
          }
        },
        accept: {
          l10nId: 'ok',
          priority: 2,
          callback() {
            DialogHelper.destroy();
            Settings.setCurrentPanel('#call_barring', {
              type: callType,
              serviceId,
              origin: '#call_barring_passcode_change'
            });
          }
        }
      };

      DialogHelper.show(dialogConfig);
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          panel,
          passcodeDigits: panel.querySelectorAll('.passcode-digit'),
          passcodeContainer: panel.querySelector(
            '.call-barring-passcode-container'
          ),
          currentPasscode: panel.querySelector(
            '#call-barring-current-passcode'
          ),
          createPasscode: panel.querySelector('#call-barring-create-passcode'),
          confirmPasscode: panel.querySelector(
            '#call-barring-confirm-passcode'
          ),
          errMsg: panel.querySelector('#cb-passcode-error')
        };

        // Add support to RTL
        if (window.document.dir === 'rtl') {
          const tempPasscodeDigits = elements.passcodeDigits;
          elements.passcodeDigits = new Array(12);

          let backward = 4;
          for (let i = 0; i < 12; i++) {
            backward--;
            elements.passcodeDigits[i] = tempPasscodeDigits[backward];

            if (backward === 0 || backward === 4) {
              backward += 8;
            }
          }
        }
      },

      onShow() {
        if (changeFlag) {
          initSoftkey();
        }
      },

      onBeforeShow(panel, options) {
        callType = options.type;
        serviceId = options.serviceId || serviceId;
        mobileConnection = ApiManager.connections[serviceId];
        window.addEventListener('keydown', getInputKey, true);
        if (typeof options.visibilityChange === 'undefined') {
          changeFlag = true;
          passCodeHeader.classList.remove('hidden');
          passCodeElement.classList.remove('hidden');
          progressElement.classList.add('hidden');
          elements.errMsg.classList.add('hidden');
          resetScreen();
          elements.currentPasscode.classList.add('focus');
          NavigationMap.scrollToElement(elements.currentPasscode);
        }
      },

      onBeforeHide() {
        window.removeEventListener('keydown', getInputKey, true);
      }
    });
  };
});

