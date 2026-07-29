/* global SimCardHelper */

define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createSimDialogPanel() {
    let elements = null;
    let currentConfig = {};
    let iccManager = null;
    let iccCallProcessing = false;

    function updateSoftKeys(enableDone, actionType) {
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
              NavigationMap.navigateBack();
            }
          }
        ]
      };

      if (enableDone) {
        params.items.push({
          name: 'Done',
          l10nId: 'done',
          priority: 3,
          method() {
            verifySimLock(actionType);
          }
        });
      }
      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    function cleanInputElement() {
      elements.input1Input.value = '';
      elements.input1Error.classList.add('hidden');
      elements.input2Input.value = '';
      elements.input3Input.value = '';
      elements.input3Error.classList.add('hidden');
    }

    function verifySimLock(actionType) {
      // Apply PIN|PUK
      switch (actionType) {
        case 'enable_lock':
          setCardLock({
            lockType: 'pin',
            pin: elements.input1Input.value,
            enabled: true
          });
          break;
        case 'disable_lock':
          setCardLock({
            lockType: 'pin',
            pin: elements.input1Input.value,
            enabled: false
          });
          break;
        case 'change_pin':
          setCardLock({
            lockType: 'pin',
            pin: elements.input1Input.value,
            newPin: elements.input2Input.value
          });
          break;
        case 'unlock_puk2':
          unlockCardLock({
            lockType: 'puk2',
            puk: elements.input1Input.value,
            newPin: elements.input2Input.value
          });
          break;
        case 'get_pin2':
          updateFdnContact(
            'fdn',
            currentConfig.fdnContact,
            elements.input1Input.value
          );
          break;
        case 'enable_fdn':
          setCardLock({
            lockType: 'fdn',
            pin2: elements.input1Input.value,
            enabled: true
          });
          break;
        case 'disable_fdn':
          setCardLock({
            lockType: 'fdn',
            pin2: elements.input1Input.value,
            enabled: false
          });
          break;
        case 'change_pin2':
          setCardLock({
            lockType: 'pin2',
            pin: elements.input1Input.value,
            newPin: elements.input2Input.value
          });
          break;
        default:
          break;
      }
    }

    function setCardLock(options) {
      if (iccCallProcessing) {
        return;
      }
      iccCallProcessing = true;
      iccManager.setCardLock(options).then(result => {
        iccCallProcessing = false;
        if (!result) {
          if (options.lockType === 'fdn') {
            getFdnStatus();
          } else {
            if (typeof options.newPin !== 'undefined') {
              ToastHelper.showToast('simpin-changed');
            } else if (options.enabled) {
              ToastHelper.showToast('simpin-on');
            } else {
              ToastHelper.showToast('simpin-off');
            }
            NavigationMap.navigateBack();
          }
        } else {
          handleCardLockError(result, options.lockType);
          DebugHelper.debug(`setCardLock error: ${JSON.stringify(result)}`);
        }
      });
    }

    function unlockCardLock(options) {
      if (iccCallProcessing) {
        return;
      }
      iccCallProcessing = true;
      iccManager.unlockCardLock(options).then(result => {
        iccCallProcessing = false;
        if (!result) {
          NavigationMap.navigateBack();
        } else {
          handleCardLockError(result, options.lockType);
          DebugHelper.debug(`unlockCardLock error: ${JSON.stringify(result)}`);
        }
      });
    }

    function getFdnStatus() {
      iccManager.getCardLock('fdn').then(result => {
        const { enabled } = result;
        SettingsDBCache.saveSettings({ 'ril.fdn.enabled': enabled });
        NavigationMap.navigateBack();
      });
    }

    function updateFdnContact(lockType, fdnContact, pin2Value) {
      if (iccCallProcessing) {
        return;
      }
      iccCallProcessing = true;
      iccManager.updateContact(lockType, fdnContact, pin2Value).then(
        () => {
          Settings.setCurrentPanel('#call_fdn_list', {
            name: fdnContact.name,
            number: fdnContact.value
          });
          iccCallProcessing = false;
        },
        err => {
          handleCardLockError(err, lockType);
          DebugHelper.debug(`setCardLock error: ${JSON.stringify(err)}`);
          iccCallProcessing = false;
        }
      );
    }

    function resetFocus() {
      elements.input1Input.value = '';
      elements.input2Input.value = '';
      elements.input3Input.value = '';
      const focusedElement = elements.panel.querySelector('.focus');
      if (focusedElement) {
        focusedElement.classList.remove('focus');
        elements.input1Container.classList.add('focus');
        elements.input1Input.focus();
        window.dispatchEvent(new CustomEvent('refresh'));
      }
    }

    function handleCardLockError(result, lockType) {
      const error = result.error || result.message;
      const { retryCount } = result;
      const state = iccManager.pin2CardState;
      DebugHelper.debug(`cardLock error:${error}`);
      updateSoftKeys(false);
      resetFocus();
      switch (error) {
        case 'SimPuk2':
          elements.input1Error.classList.add('hidden');
          currentConfig.action = 'unlock_puk2';
          updateUI({
            cardIndex: currentConfig.cardIndex,
            action: 'unlock_puk2'
          });
          break;
        case 'IncorrectPassword':
          if (retryCount > 0) {
            if (
              lockType === 'pin' ||
              lockType === 'pin2' ||
              lockType === 'fdn' ||
              lockType === 'puk2'
            ) {
              l10n.setAttributes(
                elements.input1Error,
                'incorrect-pin-with-reties',
                { times: retryCount }
              );
              elements.input1Error.classList.remove('hidden');
              if (lockType !== 'pin' && state === 'pukRequired') {
                currentConfig.action = 'unlock_puk2';
                updateUI({
                  cardIndex: currentConfig.cardIndex,
                  action: 'unlock_puk2'
                });
              }
            }
          } else if (lockType === 'pin') {
            elements.input1Error.classList.add('hidden');
            NavigationMap.navigateBack();
          } else if (lockType === 'fdn') {
            if (state === 'permanentBlocked') {
              DebugHelper.debug(`pin2 permanent blocked`);
              Settings.setCurrentPanel('#call_fdn_list', {
                serviceId: currentConfig.cardIndex
              });
            } else {
              l10n.setAttributes(elements.input1Error, 'pinAttemptMsg');
              elements.input1Error.classList.remove('hidden');
            }
          }
          break;
        default:
          break;
      }
    }

    function updateUI(options) {
      switch (options.action) {
        case 'enable_lock':
        case 'disable_lock':
          if (SimCardHelper.isDoubleSimSlot()) {
            l10n.setAttributes(elements.headerH1, 'pinTitleWithIndex', {
              index: options.cardIndex + 1
            });
            l10n.setAttributes(elements.input1Title, 'simPinWithIndex', {
              index: options.cardIndex + 1
            });
          } else {
            l10n.setAttributes(elements.headerH1, 'pinTitle');
            l10n.setAttributes(elements.input1Title, 'simPin');
          }
          elements.input2Container.classList.add('hidden');
          elements.input3Container.classList.add('hidden');
          break;
        case 'change_pin':
          if (SimCardHelper.isDoubleSimSlot()) {
            l10n.setAttributes(elements.headerH1, 'newpinTitleWithIndex', {
              index: options.cardIndex + 1
            });
            l10n.setAttributes(elements.input1Title, 'simPinWithIndex', {
              index: options.cardIndex + 1
            });
            l10n.setAttributes(elements.input2Title, 'newSimPinMsg');
            l10n.setAttributes(elements.input3Title, 'confirmNewSimPinMsg');
          } else {
            l10n.setAttributes(elements.headerH1, 'newpinTitle');
            l10n.setAttributes(elements.input1Title, 'simPin');
            l10n.setAttributes(elements.input2Title, 'newSimPinMsg');
            l10n.setAttributes(elements.input3Title, 'confirmNewSimPinMsg');
          }
          elements.input2Container.classList.remove('hidden');
          elements.input3Container.classList.remove('hidden');
          break;
        case 'unlock_puk2':
          if (SimCardHelper.isDoubleSimSlot()) {
            l10n.setAttributes(elements.headerH1, 'puk2TitleWithIndex', {
              index: options.cardIndex + 1
            });
            l10n.setAttributes(elements.input1Title, 'puk2CodeWithIndex', {
              index: options.cardIndex + 1
            });
            l10n.setAttributes(elements.input2Title, 'newSimPinMsg');
            l10n.setAttributes(elements.input3Title, 'confirmNewSimPinMsg');
          } else {
            l10n.setAttributes(elements.headerH1, 'puk2Title');
            l10n.setAttributes(elements.input1Title, 'puk2Code');
            l10n.setAttributes(elements.input2Title, 'newSimPin2Msg');
            l10n.setAttributes(elements.input3Title, 'confirmNewSimPin2Msg');
          }
          elements.input2Container.classList.remove('hidden');
          elements.input3Container.classList.remove('hidden');
          break;
        case 'get_pin2':
          if (SimCardHelper.isDoubleSimSlot()) {
            l10n.setAttributes(elements.headerH1, 'pin2TitleWithIndex', {
              index: options.cardIndex + 1
            });
            l10n.setAttributes(elements.input1Title, 'simPin2WithIndex', {
              index: options.cardIndex + 1
            });
          } else {
            l10n.setAttributes(elements.headerH1, 'pin2Title');
            l10n.setAttributes(elements.input1Title, 'simPin2');
          }
          elements.input2Container.classList.add('hidden');
          elements.input3Container.classList.add('hidden');
          break;
        case 'enable_fdn':
        case 'disable_fdn':
          if (SimCardHelper.isDoubleSimSlot()) {
            l10n.setAttributes(elements.headerH1, 'pin2TitleWithIndex', {
              index: options.cardIndex + 1
            });
            l10n.setAttributes(elements.input1Title, 'simPin2WithIndex', {
              index: options.cardIndex + 1
            });
          } else {
            l10n.setAttributes(elements.headerH1, 'pin2Title');
            l10n.setAttributes(elements.input1Title, 'simPin2');
          }
          elements.input2Container.classList.add('hidden');
          elements.input3Container.classList.add('hidden');
          break;
        case 'change_pin2':
          if (SimCardHelper.isDoubleSimSlot()) {
            l10n.setAttributes(elements.headerH1, 'newpin2TitleWithIndex', {
              index: options.cardIndex + 1
            });
            l10n.setAttributes(elements.input1Title, 'simPin2WithIndex', {
              index: options.cardIndex + 1
            });
            l10n.setAttributes(elements.input2Title, 'newSimPin2Msg');
            l10n.setAttributes(elements.input3Title, 'confirmNewSimPin2Msg');
          } else {
            l10n.setAttributes(elements.headerH1, 'newpin2Title');
            l10n.setAttributes(elements.input1Title, 'simPin2');
            l10n.setAttributes(elements.input2Title, 'newSimPin2Msg');
            l10n.setAttributes(elements.input3Title, 'confirmNewSimPin2Msg');
          }
          elements.input2Container.classList.remove('hidden');
          elements.input3Container.classList.remove('hidden');
          break;
        default:
          break;
      }
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    function showCodeMismatchMsg(mismatchMsgId) {
      if (!mismatchMsgId) {
        elements.input3Error.classList.add('hidden');
        return;
      }
      elements.input3Error.setAttribute('data-l10n-id', mismatchMsgId);
      elements.input3Error.classList.remove('hidden');
    }

    function updateUIByInput(input1Value, input2Value, input3Value) {
      if (
        input2Value.length >= 4 &&
        input1Value.length >= 4 &&
        input3Value.length
      ) {
        if (input2Value === input3Value) {
          showCodeMismatchMsg();
          updateSoftKeys(true, currentConfig.action);
        } else {
          showCodeMismatchMsg('newPinErrorMsg');
          updateSoftKeys(false, currentConfig.action);
        }
      } else {
        showCodeMismatchMsg();
        updateSoftKeys(false, currentConfig.action);
      }
    }

    function keydownHandler() {
      const focusedElement = elements.panel.querySelector('.focus');
      if (focusedElement) {
        const input = focusedElement.querySelector('input');
        if (input) {
          input.focus();
        }
        NavigationMap.scrollToElement(focusedElement);
      }
    }

    function handleEvent(evt) {
      evt.stopPropagation();
      const { target } = evt;
      const input1Value = elements.input1Input.value;
      const input2Value = elements.input2Input.value;
      const input3Value = elements.input3Input.value;
      switch (target.id) {
        case 'input1-input':
          if (elements.input2Container.classList.contains('hidden')) {
            if (input1Value.length >= 4) {
              updateSoftKeys(true, currentConfig.action);
            } else {
              updateSoftKeys(false, currentConfig.action);
            }
          } else {
            updateUIByInput(input1Value, input2Value, input3Value);
          }
          break;
        case 'input2-input':
          updateUIByInput(input1Value, input2Value, input3Value);
          break;
        case 'input3-input':
          updateUIByInput(input1Value, input2Value, input3Value);
          break;
        default:
          break;
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          panel,
          header: panel.querySelector('gaia-header'),
          headerH1: panel.querySelector('gaia-header h1'),
          input1Container: panel.querySelector('#input1-container'),
          input1Title: panel.querySelector('#input1-title'),
          input1Error: panel.querySelector('#input1-error'),
          input1Input: panel.querySelector('#input1-input'),
          input2Container: panel.querySelector('#input2-container'),
          input2Title: panel.querySelector('#input2-title'),
          input2Input: panel.querySelector('#input2-input'),
          input3Container: panel.querySelector('#input3-container'),
          input3Title: panel.querySelector('#input3-title'),
          input3Error: panel.querySelector('#input3-error'),
          input3Input: panel.querySelector('#input3-input')
        };
      },

      onBeforeShow(panel, options) {
        currentConfig = options || currentConfig;
        iccManager = SimCardHelper.getIccInfo(currentConfig.cardIndex);
        updateSoftKeys(false);
        elements.header.setAttribute('data-href', currentConfig.backPanel);
        updateUI(currentConfig);
        if (!options.visibilityChange) {
          cleanInputElement();
        }
        elements.panel.addEventListener('input', handleEvent);
        window.addEventListener('keydown', keydownHandler);
      },

      onBeforeHide() {
        elements.panel.removeEventListener('input', handleEvent);
        window.removeEventListener('keydown', keydownHandler);
      }
    });
  };
});
