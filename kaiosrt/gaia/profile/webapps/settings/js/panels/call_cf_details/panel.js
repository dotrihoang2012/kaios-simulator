
/* eslint "camelcase": 'off' */
define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createCallForwardingDetailPanel() {
    let header = null;
    let callForwardingKey = null;
    let callForwardingNumber = null;
    let selectEnable = false;
    let saveEnable = false;
    let callForwardingEnabled = false;
    let idNum = null;
    let serviceId = 0;

    let inputItem = null;
    let selectItem = null;

    let savedValue = false;
    let fwdType = 'voice';
    const settingsKey = {
      call_cf_unconditional_settings: 'ril.cf.unconditional.enabled',
      call_cf_mobile_busy_settings: 'ril.cf.mobilebusy.enabled',
      call_cf_no_reply_settings: 'ril.cf.noreply.enabled',
      call_cf_not_reachable_settings: 'ril.cf.notreachable.enabled'
    };

    const numbersKey = {
      call_cf_unconditional_settings: 'ril.cf.unconditional.number',
      call_cf_mobile_busy_settings: 'ril.cf.mobilebusy.number',
      call_cf_no_reply_settings: 'ril.cf.noreply.number',
      call_cf_not_reachable_settings: 'ril.cf.notreachable.number'
    };
    const settingsVtKey = {
      call_cf_unconditional_settings: 'ril.cf.vt.unconditional.enabled',
      call_cf_mobile_busy_settings: 'ril.cf.vt.mobilebusy.enabled',
      call_cf_no_reply_settings: 'ril.cf.vt.noreply.enabled',
      call_cf_not_reachable_settings: 'ril.cf.vt.notreachable.enabled'
    };

    const numbersVtKey = {
      call_cf_unconditional_settings: 'ril.cf.vt.unconditional.number',
      call_cf_mobile_busy_settings: 'ril.cf.vt.mobilebusy.number',
      call_cf_no_reply_settings: 'ril.cf.vt.noreply.number',
      call_cf_not_reachable_settings: 'ril.cf.vt.notreachable.number'
    };

    function initSoftkey() {
      const params = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: []
      };

      if (selectEnable) {
        params.items.push({
          name: 'Select',
          l10nId: 'select',
          priority: 2
        });
      } else {
        params.items.push({
          name: '',
          l10nId: '',
          priority: 2
        });
      }

      if (saveEnable) {
        params.items.push({
          name: 'Save',
          l10nId: 'save',
          priority: 3,
          method() {
            setCallForwardingOption();
            Settings.setCurrentPanel('#call_cf_settings', {
              key: settingsKey[idNum],
              number: inputItem.value,
              type: fwdType,
              serviceId
            });
          }
        });
      }
      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    function updateUI() {
      SettingsDBCache.getSetting(callForwardingKey).then(value => {
        savedValue = value;
        callForwardingEnabled = value;
        selectItem.value = callForwardingEnabled ? 'true' : 'false';
        updateInputStatus();
      });
    }

    function updateInputStatus() {
      const enabled = selectItem.value === 'true' || false;
      SettingsDBCache.getSetting(callForwardingNumber).then(value => {
        inputItem.value = value || '';
        if (enabled) {
          saveEnable = !!value;
          inputItem.parentNode.removeAttribute('aria-disabled');
          inputItem.parentNode.classList.remove('non-focus');
        } else {
          saveEnable = savedValue !== enabled;
          inputItem.parentNode.setAttribute('aria-disabled', 'true');
          inputItem.parentNode.classList.add('non-focus');
        }
        selectEnable = true;
        initSoftkey();
        window.dispatchEvent(new CustomEvent('refresh'));
      });
    }

    function setCallForwardingOption() {
      const enabled = selectItem.value === 'true' || false;
      const option = {};
      option[callForwardingKey] = enabled;
      SettingsDBCache.saveSettings(option);
    }

    function addFocus() {
      inputItem.focus();
      updateSaveSoftkey();
    }

    function updateSelectSoftkey() {
      selectEnable = true;
      if (selectItem.value === 'true') {
        saveEnable = !!inputItem.value.length;
      } else {
        saveEnable = savedValue;
      }
      initSoftkey();
    }

    function updateSaveSoftkey() {
      selectEnable = false;
      if (selectItem.value === 'true' && inputItem.value.length) {
        saveEnable = true;
      } else {
        saveEnable = false;
      }
      initSoftkey();
    }

    function updateCursorPos() {
      const cursorPosForInput = inputItem.value.length;
      inputItem.setSelectionRange(cursorPosForInput, cursorPosForInput);
    }

    function onKeyDwnHandler(evt) {
      if (evt.key === 'Backspace') {
        evt.preventDefault();
        evt.stopPropagation();
        Settings.isBackHref = true;
        Settings.setCurrentPanel('#call_cf_settings', {
          type: fwdType,
          serviceId
        });
      }
    }

    return SettingsPanel({
      onInit(panel) {
        selectItem = panel.querySelector('div select');
        inputItem = panel.querySelector('li input');
      },

      onBeforeShow(panel, options) {
        header = panel.querySelector('.call-cf-subSettings-header');
        idNum = panel.id;
        serviceId = options.serviceId || serviceId;
        DeviceFeature.ready(() => {
          if (DeviceFeature.getValue('vilte') === 'true') {
            if (options && options.type) {
              fwdType = options.type;
              switch (fwdType) {
                case 'voice':
                  header.setAttribute('data-l10n-id', 'voice-call-header');
                  callForwardingKey = settingsKey[panel.id];
                  callForwardingNumber = numbersKey[panel.id];
                  break;
                case 'video':
                  header.setAttribute('data-l10n-id', 'video-call-header');
                  callForwardingKey = settingsVtKey[panel.id];
                  callForwardingNumber = numbersVtKey[panel.id];
                  break;
                default:
                  header.setAttribute('data-l10n-id', 'voice-call-header');
                  callForwardingKey = settingsKey[panel.id];
                  callForwardingNumber = numbersKey[panel.id];
                  break;
              }
            } else {
              header.setAttribute('data-l10n-id', 'voice-call-header');
              callForwardingKey = settingsKey[panel.id];
              callForwardingNumber = numbersKey[panel.id];
            }
          } else {
            header.setAttribute('data-l10n-id', 'callForwarding');
            callForwardingKey = settingsKey[panel.id];
            callForwardingNumber = numbersKey[panel.id];
          }
        });
        if (!callForwardingKey) {
          return;
        }

        if (!options.visibilityChange) {
          initSoftkey();
          updateUI();
        }
        selectItem.parentNode.parentNode.addEventListener(
          'focus',
          updateSelectSoftkey
        );
        selectItem.addEventListener('change', updateInputStatus);
        inputItem.parentNode.addEventListener('focus', addFocus);
        inputItem.addEventListener('input', updateSaveSoftkey);
        inputItem.addEventListener('focus', updateCursorPos);
        window.addEventListener('keydown', onKeyDwnHandler, true);
      },

      onBeforeHide() {
        selectItem.parentNode.parentNode.removeEventListener(
          'focus',
          updateSelectSoftkey
        );
        selectItem.removeEventListener('change', updateInputStatus);
        inputItem.parentNode.removeEventListener('focus', addFocus);
        inputItem.removeEventListener('input', updateSaveSoftkey);
        inputItem.removeEventListener('focus', updateCursorPos);
        window.removeEventListener('keydown', onKeyDwnHandler, true);
      }
    });
  };
});
