/* global SimCardHelper */

define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createCallingPanel() {
    let currentPanel = null;
    let listElements = null;
    let elements = null;
    let mobileConnection = null;
    let serviceId = 0;
    const defaultVoicePrivacySettings = Array.prototype.map.call(
      ApiManager.connections,
      () => {
        return [true, true];
      }
    );
    const HREF_MAPPING = {
      'call-waiting-item': '#call_waiting',
      'caller-id-item': '#call_callerid',
      'call-fdn-item': '#call_fdn_settings'
    };

    let currentType = null;
    let isCdma = false;

    function updateVoicePrivacyMode() {
      mobileConnection.getVoicePrivacyMode().then(result => {
        DebugHelper.debug(`PrivacyMode:${result}`);
        elements.voicePrivacySelect.value = result;
      });
    }

    function showDTMFToast() {
      if (isCdma) {
        ToastHelper.showToast('changessaved');
      }
    }

    function updateNetworkTypeLimitedItemsVisibility(newType) {
      if (!newType) {
        elements.voicePrivacyItem.classList.add('hidden');
        elements.callWaitingItem.classList.add('hidden');
        elements.callerIdItem.classList.add('hidden');
        elements.callForwardingItem.classList.add('hidden');
        elements.callBarringItem.classList.add('hidden');
        elements.callFdnItem.classList.remove('hidden');
        elements.callDtmfItem.classList.add('hidden');
        window.dispatchEvent(new CustomEvent('refresh'));
        return;
      }

      const enabled =
        newType !== 'gsm' &&
        newType !== 'voice-over-wifi' &&
        newType !== 'video-over-wifi';
      elements.callWaitingItem.classList.toggle('hidden', enabled);
      elements.callerIdItem.classList.toggle('hidden', enabled);
      elements.callBarringItem.classList.toggle('hidden', enabled);
      elements.voicePrivacyItem.classList.toggle('hidden', !enabled);

      SettingsDBCache.getSetting('dtmf.option.hidden').then(isDtmfHide => {
        if (!isDtmfHide) {
          elements.callDtmfItem.classList.toggle('hidden', enabled);
          window.dispatchEvent(new CustomEvent('refresh'));
        }
      });
      if (newType === 'cdma') {
        elements.callDtmfItem.classList.remove('none-select');
        elements.callDtmfItem.removeAttribute('aria-disabled');
        isCdma = true;
      } else {
        elements.callDtmfItem.classList.add('none-select');
        elements.callDtmfItem.setAttribute('aria-disabled', 'true');
        SettingsDBCache.saveSettings({ 'phone.dtmf.type': 'long' });
        isCdma = false;
      }

      const p1 = SettingsDBCache.getSetting('callforward.settings.ui');
      const p2 = SimCardHelper.getIccInfo(serviceId).getServiceState('fdn');
      Promise.all([p1, p2]).then(values => {
        const [isCFShow, hasFdn] = values;
        if (hasFdn) {
          elements.callFdnItem.classList.toggle('hidden', false);
          SimCardHelper.getIccInfo(serviceId)
            .getCardLock('fdn')
            .then(result => {
              const fdnEnabled = result.enabled;
              SettingsDBCache.saveSettings({ 'ril.fdn.enabled': fdnEnabled });
              if (fdnEnabled) {
                elements.callWaitingItem.classList.add('none-select');
                elements.callWaitingItem.setAttribute('aria-disabled', 'true');
                elements.callerIdItem.classList.add('none-select');
                elements.callerIdItem.setAttribute('aria-disabled', 'true');
                if (isCFShow === Constants.SIM_CUSTOMIZATION.HIDE) {
                  elements.callForwardingItem.classList.add('hidden');
                } else {
                  elements.callForwardingItem.classList.remove('hidden');
                  elements.callForwardingItem.classList.add('none-select');
                  elements.callForwardingItem.setAttribute(
                    'aria-disabled',
                    'true'
                  );
                }
                elements.callBarringItem.classList.add('none-select');
                elements.callBarringItem.setAttribute('aria-disabled', 'true');
              } else {
                elements.callWaitingItem.classList.remove('none-select');
                elements.callWaitingItem.removeAttribute('aria-disabled');

                elements.callerIdItem.classList.remove('none-select');
                elements.callerIdItem.removeAttribute('aria-disabled');

                if (isCFShow === Constants.SIM_CUSTOMIZATION.HIDE) {
                  elements.callForwardingItem.classList.add('hidden');
                } else if (isCFShow === Constants.SIM_CUSTOMIZATION.GRAY) {
                  elements.callForwardingItem.classList.remove('hidden');
                  elements.callForwardingItem.classList.add('none-select');
                  elements.callForwardingItem.setAttribute(
                    'aria-disabled',
                    'true'
                  );
                } else {
                  elements.callForwardingItem.classList.remove('hidden');
                  elements.callForwardingItem.classList.remove('none-select');
                  elements.callForwardingItem.removeAttribute('aria-disabled');
                }

                elements.callBarringItem.classList.remove('none-select');
                elements.callBarringItem.removeAttribute('aria-disabled');
              }
              window.dispatchEvent(new CustomEvent('refresh'));
            });
        } else {
          if (isCFShow === Constants.SIM_CUSTOMIZATION.HIDE) {
            elements.callForwardingItem.classList.add('hidden');
          } else if (isCFShow === Constants.SIM_CUSTOMIZATION.GRAY) {
            elements.callForwardingItem.classList.remove('hidden');
            elements.callForwardingItem.classList.add('none-select');
            elements.callForwardingItem.setAttribute('aria-disabled', 'true');
          } else {
            elements.callForwardingItem.classList.remove('hidden');
            elements.callForwardingItem.classList.remove('none-select');
            elements.callForwardingItem.removeAttribute('aria-disabled');
          }
          elements.callFdnItem.classList.toggle('hidden', true);
          window.dispatchEvent(new CustomEvent('refresh'));
        }
      });
    }

    function updateNetworkUI() {
      const imsCapability = mobileConnection.imsHandler.capability;
      if (
        imsCapability === 'voice-over-wifi' ||
        imsCapability === 'video-over-wifi'
      ) {
        updateNetworkTypeLimitedItemsVisibility(imsCapability);
        return;
      }
      const { voice } = mobileConnection;
      if (voice && voice.state === 'registered' && voice.connected === true) {
        currentType = Constants.NETWORK_TYPE_MAP[voice.type];
        updateNetworkTypeLimitedItemsVisibility(currentType);
        return;
      }
      const { data } = mobileConnection;
      if (data && data.state === 'registered' && data.connected === true) {
        currentType = Constants.NETWORK_TYPE_MAP[data.type];
        updateNetworkTypeLimitedItemsVisibility(currentType);
        return;
      }
      DebugHelper.debug('can not registered');
      updateNetworkTypeLimitedItemsVisibility(null);
    }

    function voicePrivacyChange(evt) {
      evt.stopPropagation();
      const checked = evt.target.value === 'true' || false;
      const originalValue = !checked;
      mobileConnection.setVoicePrivacyMode().then(() => {
        SettingsDBCache.getSetting('ril.voicePrivacy.enabled').then(result => {
          const values = JSON.parse(
            JSON.stringify(result ? result : defaultVoicePrivacySettings)
          );
          values[serviceId] = !originalValue;
          SettingsDBCache.saveSettings(values);
        });
      });
    }

    function cardStatusChange(evt) {
      const { type } = evt;
      const cardIndex = evt.detail.index;
      if (cardIndex !== serviceId) {
        return;
      }
      let newType = null;
      switch (type) {
        case 'SIM-datachange':
          newType = Constants.NETWORK_TYPE_MAP[mobileConnection.data.type];
          if (newType === currentType) {
            return;
          }
          currentType = newType;
          updateNetworkTypeLimitedItemsVisibility(newType);
          break;
        case 'SIM-voicechange':
          newType = Constants.NETWORK_TYPE_MAP[mobileConnection.voice.type];
          if (newType === currentType) {
            return;
          }
          currentType = newType;
          updateNetworkTypeLimitedItemsVisibility(newType);
          break;
        case 'SIM-capabilitychange':
          {
            const imsCapability = mobileConnection.imsHandler.capability;
            if (
              imsCapability === 'voice-over-wifi' ||
              imsCapability === 'video-over-wifi'
            ) {
              if (imsCapability === currentType) {
                return;
              }
              currentType = imsCapability;
              updateNetworkTypeLimitedItemsVisibility(imsCapability);
            }
          }

          break;
        default:
          break;
      }
    }

    function handleClick(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      const focusLi = currentPanel.querySelector('.focus');
      if (!focusLi.hasAttribute('aria-disabled')) {
        if (focusLi.id === 'call-barring-item') {
          if (DeviceFeature.getValue('vilte') === 'true') {
            Settings.setCurrentPanel('#call_cb_settings_list', {
              serviceId
            });
          } else {
            Settings.setCurrentPanel('#call_barring', {
              serviceId
            });
          }
        } else if (focusLi.id === 'call-forwarding-item') {
          if (DeviceFeature.getValue('vilte') === 'true') {
            Settings.setCurrentPanel('#call-cfsettings-list', {
              serviceId
            });
          } else {
            Settings.setCurrentPanel('#call_cf_settings', {
              serviceId
            });
          }
        } else {
          Settings.setCurrentPanel(HREF_MAPPING[focusLi.id], {
            serviceId
          });
        }
      }
    }

    return SettingsPanel({
      onInit(panel, options) {
        serviceId = options.serviceId || serviceId;
        mobileConnection = ApiManager.connections[serviceId];
        listElements = panel.querySelectorAll('li');
        elements = {
          voicePrivacyItem: panel.querySelector('#voice-privacy-mode'),
          voicePrivacySelect: panel.querySelector('#voice-privacy-mode select'),
          callWaitingItem: panel.querySelector('#call-waiting-item'),
          callerIdItem: panel.querySelector('#caller-id-item'),
          callForwardingItem: panel.querySelector('#call-forwarding-item'),
          callBarringItem: panel.querySelector('#call-barring-item'),
          callFdnItem: panel.querySelector('#call-fdn-item'),
          callDtmfItem: panel.querySelector('#call-dtmf-item')
        };
        updateVoicePrivacyMode();
      },

      onBeforeShow(panel, options) {
        serviceId = options.serviceId || serviceId;
        currentPanel = panel;
        elements.voicePrivacySelect.addEventListener(
          'change',
          voicePrivacyChange
        );
        updateNetworkUI();
        SettingsSoftkey.init(SoftParams.defaultSelect);
        ListFocusHelper.updateSoftkey(panel);
        ListFocusHelper.addEventListener(listElements);
        window.addEventListener('SIM-datachange', cardStatusChange);
        window.addEventListener('SIM-voicechange', cardStatusChange);
        window.addEventListener('SIM-capabilitychange', cardStatusChange);
        panel.addEventListener('click', handleClick);
        SettingsDBCache.observe('phone.dtmf.type', 'long', showDTMFToast, true);
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        elements.voicePrivacySelect.removeEventListener(
          'change',
          voicePrivacyChange
        );
        window.removeEventListener('SIM-datachange', cardStatusChange);
        window.removeEventListener('SIM-voicechange', cardStatusChange);
        window.removeEventListener('SIM-capabilitychange', cardStatusChange);
        currentPanel.removeEventListener('click', handleClick);
        SettingsDBCache.unobserve('phone.dtmf.type', showDTMFToast);
      }
    });
  };
});
