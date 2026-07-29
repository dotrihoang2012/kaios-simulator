
define('panels/screen_lock_passcode/panel',['require','modules/settings_panel'],function (require) { //eslint-disable-line

  const SettingsPanel = require('modules/settings_panel');

  return function createScreenLockPasscodePanel() {
    const VALIDING_TIMEOUT = 1000;
    const ERROR_STATE_TIMEOUT = 1500;
    const COLD_DOWN_INTERVAL = 1000;
    const CODE_DOWN_MAP = [0, 0, 0, 0, 0, 0, 60, 180, 300, 600, 900];
    const PASS_LOCK_CODE = 'lockscreen.passcode-lock.code';
    const WRONG_CODE_INFO = 'lockscreen.wrong.code.info';
    let elements = null;
    let optionsInfo = null;

    let maxInputLength = 8;
    let currentMode = 'create';
    let isAcceptable = true; // If false, can't input pass code.
    let invalidCode = false; // If true, can't delete.
    let errorTimeoutHandler = null;

    const codeInfo = {
      passCode: '0000',
      buffer: '',
      errorTimes: 0,
      retryTimestamp: 0
    };

    function handleDigitsClasses(isAdded, name, min, max) {
      const minValue = min ? min : 0;
      const maxValue = max ? max : elements.passcodeDigits.length;

      if (isAdded) {
        for (let i = minValue; i < maxValue; i++) {
          elements.passcodeDigits[i].classList.add(name);
        }
      } else {
        for (let i = minValue; i < maxValue; i++) {
          elements.passcodeDigits[i].classList.remove(name);
        }
      }
    }

    function handleDigitsDot(isAdded, min, max) {
      const minValue = min ? min : 0;
      const maxValue = max ? max : elements.passcodeDigits.length;
      if (isAdded) {
        for (let i = minValue; i < maxValue; i++) {
          elements.passcodeDigits[i].dataset.dot = true;
        }
      } else {
        for (let i = minValue; i < maxValue; i++) {
          delete elements.passcodeDigits[i].dataset.dot;
        }
      }
    }

    function getInvalidCodeString(coldDown) {
      const { errorTimes } = codeInfo;
      const { retryTimestamp } = codeInfo;
      let leftColdDownTime = 0;

      if (coldDown) {
        const curTime = Date.now();
        if (curTime >= retryTimestamp) {
          leftColdDownTime = Math.max(
            0,
            getColdDownTime(errorTimes) -
              Math.floor((curTime - retryTimestamp) / 1000)
          );
        }
        const timeString = new Date(
          2019,
          9,
          9,
          9,
          Math.floor(leftColdDownTime / 60),
          leftColdDownTime % 60
        ).toLocaleString(navigator.language, {
          second: 'numeric',
          minute: 'numeric'
        });

        l10n.setAttributes(elements.passcodeError, 'lockscreenColdDown', {
          n: timeString
        });
      } else {
        switch (errorTimes) {
          case 3:
          case 4:
          case 5:
            l10n.setAttributes(
              elements.passcodeError,
              'lockscreenCheckLockCode',
              {
                n: 6 - errorTimes
              }
            );
            break;
          default:
            l10n.setAttributes(elements.passcodeError, 'lockscreenInvalidCode');
            break;
        }
      }
      elements.passcodeError.classList.remove('hidden');
      return !!leftColdDownTime;
    }

    function showErrorMsg(errorTimes) {
      handleDigitsClasses(true, 'error');
      isAcceptable = false;
      invalidCode = true;
      if (errorTimes > 5) {
        handleDigitsClasses(true, 'error');
        handleDigitsClasses(false, 'highlight');
        getInvalidCodeString(true);
        const coldDownHandle = setInterval(() => {
          const delayStr = getInvalidCodeString(true);
          if (!delayStr) {
            window.clearInterval(coldDownHandle);
            codeInfo.buffer = '';
            elements.passcodeDigits[0].classList.add('highlight');
            handleDigitsDot(false, 0, 4);
            handleDigitsClasses(false, 'error');
            handleDigitsClasses(false, 'correct');
            elements.passcodeError.classList.add('hidden');
            isAcceptable = true;
            invalidCode = false;
          } else {
            handleDigitsClasses(true, 'error');
          }
        }, COLD_DOWN_INTERVAL);
      } else {
        isAcceptable = true;
        getInvalidCodeString(false);
        errorTimeoutHandler = setTimeout(() => {
          errorTimeoutHandler = null;
          codeInfo.buffer = '';
          invalidCode = false;
          handleDigitsClasses(false, 'error');
          handleDigitsClasses(false, 'correct');
          elements.passcodeDigits[3].classList.remove('highlight');
          handleDigitsDot(false, 0, 4);
          elements.passcodeDigits[0].classList.add('highlight');
          elements.passcodeError.classList.add('hidden');
        }, ERROR_STATE_TIMEOUT);
      }
    }

    function getColdDownTime(times) {
      const errorTimes = Math.min(CODE_DOWN_MAP.length - 1, times);
      return CODE_DOWN_MAP[errorTimes];
    }

    function checkTimeStamp(value, visibilityState) {
      if (value.errorTimes > 5) {
        codeInfo.errorTimes = value.errorTimes;
        codeInfo.retryTimestamp = value.retryTimestamp;
        codeInfo.buffer = '';
        const currentTime = Date.now();
        const leftColdDownTime = Math.max(
          0,
          getColdDownTime(value.errorTimes) -
            Math.floor((currentTime - value.retryTimestamp) / 1000)
        );
        if (leftColdDownTime > 0) {
          handleDigitsDot(true, 0, 4);
          showErrorMsg(value.errorTimes);
        } else {
          elements.passcodeDigits[0].classList.add('highlight');
        }
      } else {
        codeInfo.errorTimes = value.errorTimes;
        if (!visibilityState) {
          codeInfo.buffer = '';
          elements.passcodeDigits[0].classList.add('highlight');
        }
      }
    }

    function updateState(value, visibilityState) {
      if (value) {
        checkTimeStamp(value, visibilityState);
      } else if (!visibilityState) {
        codeInfo.errorTimes = 0;
        codeInfo.retryTimestamp = 0;
        codeInfo.buffer = '';
        elements.passcodeDigits[0].classList.add('highlight');
        handleDigitsClasses(false, 'error');
        handleDigitsClasses(false, 'correct');
        elements.passcodeError.classList.add('hidden');
      }
    }

    function setPasscode() {
      const passcode = codeInfo.buffer.substring(0, 4);

      const cSet = {};
      cSet['lockscreen.passcode-lock.code'] = passcode;
      cSet['lockscreen.passcode-lock.enabled'] = true;
      cSet['lockscreen.enabled'] = true;
      codeInfo.errorTimes = 0;
      cSet[WRONG_CODE_INFO] = {
        errorTimes: 0
      };
      SettingsDBCache.saveSettings(cSet);
      backToOrigin();
    }

    function updateSoftKey(inputComplete) {
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
              backToOrigin();
            }
          }
        ]
      };
      if (inputComplete) {
        switch (currentMode) {
          case 'create':
            {
              const item = {
                name: 'Create',
                l10nId: 'create',
                priority: 3,
                method() {
                  setPasscode();
                  ToastHelper.showToast('passcode-created');
                }
              };
              params.items.push(item);
            }
            break;
          case 'new':
            {
              const item = {
                name: 'Change',
                l10nId: 'change',
                priority: 3,
                method() {
                  setPasscode();
                  ToastHelper.showToast('passcode-changed');
                }
              };
              params.items.push(item);
            }
            break;
          default:
            break;
        }
      }
      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    function backToOrigin() {
      clearStatus();
      Settings.isBackHref = true;
      if (optionsInfo.origin === '#about') {
        Settings.setCurrentPanel('#about', {
          origin: '#screen_lock_passcode'
        });
      } else {
        Settings.setCurrentPanel('#screen_lock');
      }
    }

    function validatePasscode() {
      if (codeInfo.buffer === codeInfo.passCode) {
        handleDigitsClasses(true, 'correct');
        codeInfo.errorTimes = 0;
        SettingsDBCache.saveSettings({
          WRONG_CODE_INFO: {
            errorTimes: 0
          }
        });

        if (currentMode === 'confirm') {
          SettingsDBCache.saveSettings({
            'lockscreen.enabled': false,
            'lockscreen.passcode-lock.enabled': false
          });
        }

        if (optionsInfo.origin === '#about') {
          setTimeout(() => {
            Settings.setCurrentPanel('#reset_phone_progress');
          }, VALIDING_TIMEOUT);
        } else if (currentMode === 'confirm') {
          backToOrigin();
          ToastHelper.showToast('screen-lock-off');
        } else {
          currentMode = 'new';
          maxInputLength = 8;
          codeInfo.buffer = '';
          handleDigitsDot(false, 0, 4);
          elements.passcodeDigits[0].classList.add('highlight');
          elements.passcodeDigits[3].classList.remove('highlight');
          elements.titleElement.setAttribute(
            'data-l10n-id',
            'create-lock-code'
          );
          elements.posscodeConfirmInput.classList.remove('hidden');
          handleDigitsClasses(false, 'error');
          handleDigitsClasses(false, 'correct');
        }
      } else {
        let { errorTimes } = codeInfo;
        const retryTimestamp = Date.now();
        errorTimes++;
        codeInfo.errorTimes = errorTimes;
        codeInfo.retryTimestamp = retryTimestamp;

        const cSet = {};
        cSet[WRONG_CODE_INFO] = {
          errorTimes: codeInfo.errorTimes,
          retryTimestamp: codeInfo.retryTimestamp
        };
        SettingsDBCache.saveSettings(cSet);
        showErrorMsg(codeInfo.errorTimes);
      }
    }

    function checkPasscode() {
      if (currentMode === 'create' || currentMode === 'new') {
        const inputCode = codeInfo.buffer.substring(0, 4);
        const confirmCode = codeInfo.buffer.substring(4, 8);
        if (inputCode !== confirmCode) {
          elements.passcodeError.setAttribute(
            'data-l10n-id',
            'passcode-doesnt-match'
          );
          invalidCode = true;
          elements.passcodeError.classList.remove('hidden');
          handleDigitsClasses(true, 'error', 4);
          elements.passcodeDigits[7].classList.add('highlight');
        } else {
          handleDigitsClasses(true, 'correct');
          updateSoftKey(true);
        }
      } else {
        validatePasscode();
      }
    }

    function handleEvent(evt) {
      if (evt.key === 'BrowserBack' || evt.key === 'Backspace') {
        evt.preventDefault();
        evt.stopPropagation();
        if (codeInfo.buffer.length === 0 || !isAcceptable) {
          backToOrigin();
        } else {
          if (invalidCode) {
            return;
          }
          codeInfo.buffer = codeInfo.buffer.substring(
            0,
            codeInfo.buffer.length - 1
          );
          const index = codeInfo.buffer.length;
          delete elements.passcodeDigits[index].dataset.dot;
          if (elements.passcodeDigits[index + 1]) {
            elements.passcodeDigits[index + 1].classList.remove('highlight');
          }
          elements.passcodeDigits[index].classList.add('highlight');
          elements.passcodeError.classList.add('hidden');
          handleDigitsClasses(false, 'error');
          handleDigitsClasses(false, 'correct');
          updateSoftKey(false);
        }
      } else {
        if (!isAcceptable) {
          return;
        }
        const { key } = evt;
        const keyCode = Constants.QWERTY_KEY_MAP[key] || key;
        if (!(keyCode >= '0' && keyCode <= '9')) {
          return;
        }
        if (invalidCode) {
          if (errorTimeoutHandler) {
            clearTimeout(errorTimeoutHandler);
          }
          invalidCode = false;
          codeInfo.buffer = '';
          elements.passcodeError.classList.add('hidden');
          handleDigitsClasses(false, 'highlight');
          handleDigitsClasses(false, 'error');
          handleDigitsDot(false);
        }
        if (codeInfo.buffer.length < maxInputLength) {
          codeInfo.buffer += keyCode;
          const index = codeInfo.buffer.length - 1;
          elements.passcodeDigits[index].dataset.dot = true;
          if (codeInfo.buffer.length === maxInputLength) {
            checkPasscode();
          } else {
            elements.passcodeDigits[index].classList.remove('highlight');
            if (elements.passcodeDigits[index + 1]) {
              elements.passcodeDigits[index + 1].classList.add('highlight');
            }
          }
        }
      }
    }

    function updateTitle() {
      elements.titleElement.setAttribute('aria-live', 'assertive');
      if (optionsInfo.origin === '#about') {
        elements.titleElement.setAttribute(
          'data-l10n-id',
          'enter-screen-lock-passcode'
        );
      } else if (currentMode === 'new' || currentMode === 'create') {
        elements.titleElement.setAttribute('data-l10n-id', 'create-lock-code');
      } else {
        elements.titleElement.setAttribute('data-l10n-id', 'enter-lock-code');
      }
    }

    function clearStatus() {
      codeInfo.buffer = '';
      elements.passcodeContainer.blur();
      handleDigitsClasses(false, 'highlight');
      elements.passcodeError.classList.add('hidden');
      handleDigitsDot(false);
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          panel,
          passcodeContainer: panel.querySelector('.passcode-container'),
          passcodeDigits: panel.querySelectorAll('.passcode-digit'),
          passcodeError: panel.querySelector('#passcode-error'),
          posscodeInput: panel.querySelector('#passcode-pseudo-input'),
          titleElement: panel.querySelector('#passcode-pseudo-input div'),
          posscodeConfirmInput: panel.querySelector('#confirm-passcode')
        };

        SettingsDBCache.observe(PASS_LOCK_CODE, '0000', value => {
          codeInfo.passCode = value;
        });
      },
      onBeforeShow(panel, options) {
        if (!options.visibilityChange) {
          optionsInfo = options ? options : optionsInfo;
          currentMode = optionsInfo.mode;
          maxInputLength = currentMode === 'create' ? 8 : 4;
          if (currentMode === 'edit' || currentMode === 'confirm') {
            elements.posscodeConfirmInput.classList.add('hidden');
          } else {
            elements.posscodeConfirmInput.classList.remove('hidden');
          }
          updateTitle();
          updateSoftKey();
        }
        SettingsDBCache.getSetting(WRONG_CODE_INFO).then(value => {
          updateState(value, options.visibilityChange);
        });
      },
      onShow() {
        document.addEventListener('keydown', handleEvent);
        elements.passcodeContainer.focus();
      },
      onHide() {
        document.removeEventListener('keydown', handleEvent);
      }
    });
  };
});

