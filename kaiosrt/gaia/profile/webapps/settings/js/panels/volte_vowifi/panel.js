/* global SimCardHelper */

define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function volteVowifiSettingsPanel() {
    let elements = {};
    let serviceId = SimCardHelper.defaultServiceId;
    const { telephony } = ApiManager;
    const vowifiStatusItem = document.querySelector('#vowifi-status-desc');
    let listElements = null;

    function switchChange() {
      const isSupportDualLte = DeviceFeature.getValue('dualLte');
      const obj = {};
      SettingsDBCache.getSettings(
        [
          'ril.ims.enabled',
          'ril.ims.preferredProfile',
          'ril.dsds.ims.enabled',
          'ril.dsds.ims.preferredProfile'
        ],
        results => {
          if (isSupportDualLte === 'true') {
            const imsEnabledArray = results['ril.dsds.ims.enabled'];
            const imsProfileArray = results['ril.dsds.ims.preferredProfile'];
            if (
              elements.volteSwitch.value === 'true' &&
              elements.vowifiSwitch.value === 'true'
            ) {
              imsEnabledArray[serviceId] = true;
              imsProfileArray[serviceId] = 'wifi-preferred';
              obj['ril.dsds.ims.enabled'] = imsEnabledArray;
              obj['ril.dsds.ims.preferredProfile'] = imsProfileArray;
            } else if (
              elements.volteSwitch.value === 'true' &&
              elements.vowifiSwitch.value === 'false'
            ) {
              imsEnabledArray[serviceId] = true;
              imsProfileArray[serviceId] = 'cellular-only';
              obj['ril.dsds.ims.enabled'] = imsEnabledArray;
              obj['ril.dsds.ims.preferredProfile'] = imsProfileArray;
            } else if (
              elements.volteSwitch.value === 'false' &&
              elements.vowifiSwitch.value === 'true'
            ) {
              imsEnabledArray[serviceId] = true;
              imsProfileArray[serviceId] = 'wifi-only';
              obj['ril.dsds.ims.enabled'] = imsEnabledArray;
              obj['ril.dsds.ims.preferredProfile'] = imsProfileArray;
            } else if (
              elements.volteSwitch.value === 'false' &&
              elements.vowifiSwitch.value === 'false'
            ) {
              imsEnabledArray[serviceId] = false;
              obj['ril.dsds.ims.enabled'] = imsEnabledArray;
            }
          } else if (
            elements.volteSwitch.value === 'true' &&
            elements.vowifiSwitch.value === 'true'
          ) {
            obj['ril.ims.enabled'] = true;
            obj['ril.ims.preferredProfile'] = 'wifi-preferred';
          } else if (
            elements.volteSwitch.value === 'true' &&
            elements.vowifiSwitch.value === 'false'
          ) {
            obj['ril.ims.enabled'] = true;
            obj['ril.ims.preferredProfile'] = 'cellular-only';
          } else if (
            elements.volteSwitch.value === 'false' &&
            elements.vowifiSwitch.value === 'true'
          ) {
            obj['ril.ims.enabled'] = true;
            obj['ril.ims.preferredProfile'] = 'wifi-only';
          } else if (
            elements.volteSwitch.value === 'false' &&
            elements.vowifiSwitch.value === 'false'
          ) {
            obj['ril.ims.enabled'] = false;
          }
          SettingsDBCache.saveSettings(obj);
          ToastHelper.showToast('changessaved');
          updateDesc();
        }
      );
    }

    function updateDesc() {
      vowifiStatusItem.textContent = '';
      const isSupportDualLte = DeviceFeature.getValue('dualLte');
      let imsEnabled = null;
      let imsProfile = null;
      let status = null;

      SettingsDBCache.getSettings(
        [
          'airplaneMode.status',
          'ril.ims.enabled',
          'ril.ims.preferredProfile',
          'ril.dsds.ims.enabled',
          'ril.dsds.ims.preferredProfile'
        ],
        results => {
          status = results['airplaneMode.status'];
          if (isSupportDualLte === 'true') {
            const imsEnabledArray = results['ril.dsds.ims.enabled'];
            const imsProfileArray = results['ril.dsds.ims.preferredProfile'];
            imsEnabled = imsEnabledArray[serviceId];
            imsProfile = imsProfileArray[serviceId];
          } else {
            imsEnabled = results['ril.ims.enabled'];
            imsProfile = results['ril.ims.preferredProfile'];
          }

          const { imsHandler } = ApiManager.connections[serviceId];
          if (imsHandler) {
            if (status === 'enabled') {
              elements.volte.setAttribute('aria-disabled', true);
              elements.volte.classList.add('none-select');
              if (
                imsEnabled &&
                (imsProfile === 'wifi-preferred' || imsProfile === 'wifi-only')
              ) {
                updateVowifiDesc('airplaneMode');
                vowifiStatusItem.classList.remove('hidden');
              } else {
                vowifiStatusItem.classList.add('hidden');
              }
            } else {
              elements.volte.removeAttribute('aria-disabled');
              elements.volte.classList.remove('none-select');
              vowifiStatusItem.classList.add('hidden');
            }
            if (telephony) {
              telephony.ontelephonycoveragelosing = () => {
                const state = Customization.getWifiCertifiedStrId(
                  'poorSignal',
                  'poorSignal-wlan'
                );
                updateVowifiDesc(state);
              };
            }
          }
        }
      );
    }

    function updateVowifiDesc(status) {
      const l10nId = `volte-status-${status}`;
      vowifiStatusItem.textContent = ` - ${l10n.get(l10nId)}`;
    }

    function updateUI() {
      SettingsDBCache.getSettings(
        [
          'ril.ims.enabled',
          'ril.ims.preferredProfile',
          'ril.dsds.ims.enabled',
          'ril.dsds.ims.preferredProfile'
        ],
        result => {
          let imsEnabled = null;
          let imsProfile = null;
          DeviceFeature.ready(() => {
            const isSupportDualLte = DeviceFeature.getValue('dualLte');
            if (isSupportDualLte === 'true') {
              const imsEnabledArray = result['ril.dsds.ims.enabled'];
              const imsProfileArray = result['ril.dsds.ims.preferredProfile'];
              imsEnabled = imsEnabledArray[serviceId];
              imsProfile = imsProfileArray[serviceId];
            } else {
              imsEnabled = result['ril.ims.enabled'];
              imsProfile = result['ril.ims.preferredProfile'];
            }

            const isSupportWifi = DeviceFeature.getValue('wifi');
            const isSupportVowifi = DeviceFeature.getValue('voWifi');
            const isSupportVolte = DeviceFeature.getValue('voLte');
            const vowifiElement = elements.vowifiSwitch.parentNode.parentNode;
            const volteElement = elements.volteSwitch.parentNode.parentNode;
            const volteWifiH1 = document.getElementById('volte-vowifi-h1');
            const mobileConnection = ApiManager.connections[serviceId];
            const supportedBearers =
              mobileConnection.imsHandler &&
              mobileConnection.imsHandler.deviceConfig.supportedBearers;

            if (supportedBearers) {
              const supportWifi =
                isSupportWifi === 'true' &&
                isSupportVowifi === 'true' &&
                supportedBearers.indexOf('wifi') >= 0;
              const supportLte =
                isSupportVolte === 'true' &&
                !result['volte.option.hidden'] &&
                supportedBearers.indexOf('cellular') >= 0;
              if (supportWifi && supportLte) {
                volteElement.classList.remove('hidden');
                vowifiElement.classList.remove('hidden');

                volteWifiH1.setAttribute(
                  'data-l10n-id',
                  Customization.getWifiCertifiedStrId(
                    'volte-header',
                    'volte-wlanCalling-header'
                  )
                );
              } else {
                if (supportWifi) {
                  vowifiElement.classList.remove('hidden');
                } else {
                  vowifiElement.classList.add('hidden');
                  volteWifiH1.setAttribute('data-l10n-id', 'volte');
                }
                if (supportLte) {
                  volteElement.classList.remove('hidden');
                } else {
                  volteElement.classList.add('hidden');

                  volteWifiH1.setAttribute(
                    'data-l10n-id',
                    Customization.getWifiCertifiedStrId('vowifi', 'wlanCalling')
                  );
                }
              }
            }

            if (
              imsEnabled &&
              (imsProfile === 'cellular-preferred' ||
                imsProfile === 'wifi-preferred')
            ) {
              elements.volteSwitch.value = 'true';
              elements.vowifiSwitch.value = 'true';
            } else if (imsEnabled && imsProfile === 'cellular-only') {
              elements.volteSwitch.value = 'true';
              elements.vowifiSwitch.value = 'false';
            } else if (imsEnabled && imsProfile === 'wifi-only') {
              elements.volteSwitch.value = 'false';
              elements.vowifiSwitch.value = 'true';
            } else if (!imsEnabled) {
              elements.volteSwitch.value = 'false';
              elements.vowifiSwitch.value = 'false';
            }
            window.dispatchEvent(new CustomEvent('refresh'));
          });
        }
      );
    }

    function handleAirplaneMode(status) {
      const enabled = !!(status === 'enabled' || status === 'enabling');
      elements.volte.setAttribute('aria-disabled', enabled);
      elements.volte.classList.add('none-select');
      SettingsSoftkey.hide();

      if (status === 'disabled') {
        elements.volte.removeAttribute('aria-disabled');
        elements.volte.classList.remove('none-select');
        SettingsSoftkey.show();
      } else {
        elements.volte.setAttribute('aria-disabled', true);
        elements.volte.classList.add('none-select');
        SettingsSoftkey.hide();
      }
      if (Settings.getCurrentPanel()) {
        const panel = document.getElementById(
          Settings.getCurrentPanel().substring(1)
        );
        ListFocusHelper.updateSoftkey(panel);
      }
    }

    function keyDwnHdr(evt) {
      if (
        evt.key === 'Enter' &&
        (evt.target.id === 'volte' || evt.target.id === 'vowifi')
      ) {
        SettingsDBCache.getSetting('airplaneMode.status').then(value => {
          handleAirplaneMode(value);
          const selectorRule =
            'li:not([aria-disabled="true"]):' +
            'not(.hidden):not([hidden]).focus select';
          const select = document.querySelector(selectorRule);
          if (select && select.hasChildNodes()) {
            select.focus();
            NavigationMap.selectOptionShow = true;
          }
        });
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          volteSwitch: document.getElementById('volte-switch'),
          vowifiSwitch: document.getElementById('vowifi-switch'),
          volte: document.getElementById('volte'),
          vowifiSpan: document.querySelector('#vowifi span')
        };
        listElements = panel.querySelectorAll('li');

        elements.vowifiSpan.setAttribute(
          'data-l10n-id',
          Customization.getWifiCertifiedStrId('vowifi', 'wlanCalling')
        );
      },

      onBeforeShow(panel) {
        serviceId = SimCardHelper.defaultServiceId;
        updateDesc();
        updateUI();
        elements.volteSwitch.addEventListener('change', switchChange);
        elements.vowifiSwitch.addEventListener('change', switchChange);
        ListFocusHelper.addEventListener(listElements);
        SettingsSoftkey.init(SoftParams.defaultSelect);
        ListFocusHelper.updateSoftkey(panel);
        SettingsDBCache.observe(
          'airplaneMode.status',
          false,
          handleAirplaneMode
        );
        window.addEventListener('keydown', keyDwnHdr);
      },

      onBeforeHide() {
        elements.volteSwitch.removeEventListener('change', switchChange);
        elements.vowifiSwitch.removeEventListener('change', switchChange);
        ListFocusHelper.removeEventListener(listElements);
        SettingsDBCache.unobserve('airplaneMode.status', handleAirplaneMode);
        window.removeEventListener('keydown', keyDwnHdr);
      }
    });
  };
});
