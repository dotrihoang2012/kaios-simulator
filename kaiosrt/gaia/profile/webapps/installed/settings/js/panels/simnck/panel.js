/* global SimCardHelper */


define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createSimnckPanel() {
    let unlockProcessing = false;
    let elements = null;
    let serviceId = 0;
    let iccManager = null;

    const oneSoftKeyParams = {
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

    const softkeyParams = {
      items: [
        {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1,
          method() {
            NavigationMap.navigateBack();
          }
        },
        {
          name: 'Done',
          l10nId: 'done',
          priority: 3,
          method() {
            unlockNCK();
          }
        }
      ]
    };

    function updateNckStatus() {
      iccManager.getCardLock('nck').then(
        result => {
          const isNckLock = result.enabled;
          if (isNckLock) {
            elements.tryLeftMsg.classList.add('hidden');
          } else {
            elements.tryLeftMsg.classList.remove('hidden');
          }
        },
        err => {
          DebugHelper.debug(`getCardLock:nck:${err}`);
        }
      );
    }

    function unlockNCK() {
      if (unlockProcessing) {
        return;
      }
      unlockProcessing = true;
      iccManager
        .unlockCardLock({
          lockType: 'nck',
          pin: elements.nckInput.value
        })
        .then(
          result => {
            DebugHelper.debug(`unlockCardLock:nck:success:${result}`);
            NavigationMap.navigateBack();
            unlockProcessing = false;
          },
          err => {
            DebugHelper.debug(`unlockCardLock:nck:error:${err}`);
            unlockProcessing = false;
            l10n.setAttributes(elements.tryLeftMsg, 'inputCodeRetriesLeft', {
              n: err.retryCount
            });
            elements.errorMsg.classList.remove('hidden');
          }
        );
    }

    function updateSoftKey(params) {
      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    function handleInput(evt) {
      evt.stopPropagation();
      const { value } = elements.nckInput;
      elements.errorMsg.classList.add('hidden');
      if (value.length > 7) {
        updateSoftKey(softkeyParams);
      } else {
        updateSoftKey(oneSoftKeyParams);
      }
    }

    return SettingsPanel({
      onInit(panel, options) {
        serviceId = options.serviceId || serviceId;
        elements = {
          tryLeftMsg: panel.querySelector('#sim-tries-left'),
          errorMsg: panel.querySelector('#sim-code-error'),
          nckInput: panel.querySelector('input')
        };
      },

      onBeforeShow(panel, options) {
        serviceId = options.serviceId || serviceId;
        iccManager = SimCardHelper.getIccInfo(serviceId);
        updateSoftKey(oneSoftKeyParams);
        updateNckStatus();
        elements.nckInput.addEventListener('input', handleInput);
      },

      onShow() {
        elements.nckInput.value = '';
        elements.errorMsg.classList.add('hidden');
        elements.nckInput.focus();
      },

      onBeforeHide() {
        elements.nckInput.removeEventListener('input', handleInput);
      }
    });
  };
});
