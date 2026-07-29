/* global SimCardHelper SupportedNetworkTypeHelper */

define(['require','modules/settings_panel','utils/supported_network_type_helper'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  require('utils/supported_network_type_helper');
  return function createCarrierOperatorSettings() {
    let elements = null;
    let serviceIndex = 0;
    let mobileConnection = null;
    const networkTypeMapping = {};
    let currentNetworkType = null;
    let listElements = null;

    function disableAutomaticSelectionState(disabled) {
      if (disabled) {
        elements.networkType.setAttribute('aria-disabled', 'true');
        elements.opAutoSelect.setAttribute('aria-disabled', 'true');
        elements.networkType.classList.add('none-select');
        elements.opAutoSelect.classList.add('none-select');
        SettingsSoftkey.hide();
      } else {
        elements.networkType.removeAttribute('aria-disabled');
        elements.opAutoSelect.removeAttribute('aria-disabled');
        elements.networkType.classList.remove('none-select');
        elements.opAutoSelect.classList.remove('none-select');
        SettingsSoftkey.show();
      }
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    function updateAutomaticOperatorSelection(connection) {
      const mode = connection.networkSelectionMode;
      if (mode === 'automatic') {
        elements.opAutoDesc.setAttribute('data-l10n-id', 'on');
      } else {
        elements.opAutoDesc.setAttribute('data-l10n-id', 'off');
      }
    }

    // It only used in this file. It have been move here.
    function isSubSidyLock(index) {
      const SUBSIDY_LOCK_SIM_NETWORK = 1;
      if (navigator.subsidyLockManager) {
        return new Promise(resolve => {
          navigator.subsidyLockManager[index]
            .getSubsidyLockStatus()
            .then(value => {
              if (value && value.includes(SUBSIDY_LOCK_SIM_NETWORK)) {
                resolve(true);
              } else {
                resolve(false);
              }
            });
        });
      }
      return Promise.resolve(false);
    }

    function getDefaultPreferredNetworkType(index) {
      return new Promise(resolve => {
        Promise.all([
          mobileConnection.getSupportedNetworkTypes(),
          isSubSidyLock(index)
        ]).then(values => {
          let allTypes = ['lte', 'wcdma', 'tdscdma', 'gsm', 'cdma', 'evdo'];
          if (values[1]) {
            if (values[0].indexOf('lte') > -1) {
              allTypes = ['wcdma', 'tdscdma', 'gsm', 'cdma', 'evdo'];
            } else {
              allTypes = ['gsm', 'cdma', 'evdo'];
            }
          }
          const types = allTypes.filter(type => {
            return values[0] && values[0].indexOf(type) !== -1;
          });
          resolve(types);
        });
      });
    }

    function updateNetworkTypeSelector(supportedNetworks) {
      if (
        !mobileConnection.getPreferredNetworkType ||
        !supportedNetworks.networkTypes
      ) {
        return;
      }

      while (elements.networkTypeSelect.hasChildNodes()) {
        elements.networkTypeSelect.removeChild(
          elements.networkTypeSelect.lastChild
        );
      }

      mobileConnection.getPreferredNetworkType().then(
        result => {
          currentNetworkType = result;
          addNetworkTypes(result);
        },
        () => {
          DebugHelper.log('getPreferredNetworkType error');
          addNetworkTypes('lte');
        }
      );

      function addNetworkTypes(networkType) {
        const supportedNetworkTypes = supportedNetworks.networkTypes;
        if (networkType) {
          supportedNetworkTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.selected = networkType === type;
            // Show user friendly network mode names
            if (type in networkTypeMapping) {
              option.text = networkTypeMapping[type];
            } else {
              const l10nId = supportedNetworks.l10nIdForType(type);
              option.setAttribute('data-l10n-id', l10nId);
              // Fallback to the network type
              if (!l10nId) {
                option.textContent = type;
              }
            }
            elements.networkTypeSelect.appendChild(option);
          });
        } else {
          DebugHelper.debug('carrier: could not retrieve network type');
        }
      }
    }

    function eventHandler(evt) {
      const selector = evt.target;
      const type = selector.value;
      if (currentNetworkType !== type) {
        disableAutomaticSelectionState(true);
        const request = mobileConnection.setPreferredNetworkType(type);
        request.onsuccess = () => {
          const key = 'ril.radio.preferredNetworkType';
          SettingsDBCache.getSetting(key).then(function gotPNT(value) {
            const cset = {};
            value[serviceIndex] = type;
            cset[key] = value;
            SettingsDBCache.saveSettings(cset);
            currentNetworkType = type;
            ToastHelper.showToast('changessaved');
          });
          disableAutomaticSelectionState(false);
        };
        request.onerror = () => {
          DebugHelper.debug(`setPreferredNetworkType ${request.error.message}`);
          if (request.error.message === 'NotAllowedWhenNCK') {
            const checkKey = 'force.nckDialog.show';
            SettingsDBCache.getSetting(checkKey).then(value => {
              const checkValue = value;
              if (checkValue) {
                Settings.setCurrentPanel('#simnck', {
                  serviceId: serviceIndex
                });
              } else {
                ToastHelper.showToast('devicelocked');
              }
              selector.value = currentNetworkType;
            });
          }
          disableAutomaticSelectionState(false);
        };
      }
    }

    function updateNetworkTypeLimitedItemsDisplay(conn) {
      // The following features are limited to GSM types.
      const voiceType = conn.voice && conn.voice.type;

      function doUpdate(mode) {
        if (mode !== 'gsm') {
          elements.opAutoSelect.classList.add('hidden');
        } else {
          elements.opAutoSelect.classList.remove('hidden');
        }
      }

      if (!voiceType) {
        getDefaultPreferredNetworkType(serviceIndex).then(
          supportedNetworkTypes => {
            const result = SupportedNetworkTypeHelper(supportedNetworkTypes);

            if (result.gsm || result.wcdma || result.lte) {
              doUpdate('gsm');
            } else {
              doUpdate('cdma');
            }
          }
        );
      } else {
        doUpdate(Constants.NETWORK_TYPE_MAP[voiceType]);
      }
    }

    function cardStatusChange(evt) {
      const cardIndex = evt.detail.index;
      if (cardIndex !== serviceIndex) {
        return;
      }
      updateNetworkTypeLimitedItemsDisplay(mobileConnection);
    }

    function handleEvent(evt) {
      evt.preventDefault();
      evt.stopPropagation();
      Settings.setCurrentPanel('carrier_operator_settings', {
        serviceId: serviceIndex
      });
    }

    return SettingsPanel({
      onInit(panel, options) {
        serviceIndex = options.serviceId;
        mobileConnection = ApiManager.connections[serviceIndex];
        if (!mobileConnection.setPreferredNetworkType) {
          NavigationMap.navigateBack();
        }
        elements = {
          header: panel.querySelector('gaia-header h1'),
          networkType: panel.querySelector('#network-type'),
          networkTypeSelect: panel.querySelector('#preferredNetworkType'),
          opAutoSelect: panel.querySelector('#operator-autoSelect'),
          opAutoDesc: panel.querySelector('#auto-select-desc')
        };
        listElements = panel.querySelectorAll('li');
      },

      onBeforeShow(panel, options) {
        serviceIndex = options.serviceId;
        mobileConnection = ApiManager.connections[serviceIndex];

        if (SimCardHelper.isDoubleSimSlot()) {
          l10n.setAttributes(elements.header, 'simSettingsWithIndex', {
            index: serviceIndex + 1
          });
        }

        getDefaultPreferredNetworkType(serviceIndex).then(
          supportedNetworkTypes => {
            const supportedNetworkTypeHelper = SupportedNetworkTypeHelper(
              supportedNetworkTypes
            );
            updateNetworkTypeSelector(supportedNetworkTypeHelper);
          }
        );
        disableAutomaticSelectionState(false);
        updateAutomaticOperatorSelection(mobileConnection);
        updateNetworkTypeLimitedItemsDisplay(mobileConnection);

        SettingsSoftkey.init(SoftParams.defaultSelect);
        ListFocusHelper.updateSoftkey(panel);
        ListFocusHelper.addEventListener(listElements);
        window.addEventListener('SIM-voicechange', cardStatusChange);
        elements.networkTypeSelect.addEventListener('blur', eventHandler);
        elements.opAutoSelect.addEventListener('click', handleEvent, true);
      },

      onBeforeHide() {
        ListFocusHelper.removeEventListener(listElements);
        window.removeEventListener('SIM-voicechange', cardStatusChange);
        elements.networkTypeSelect.removeEventListener('blur', eventHandler);
        elements.opAutoSelect.removeEventListener('click', handleEvent, true);
      }
    });
  };
});
