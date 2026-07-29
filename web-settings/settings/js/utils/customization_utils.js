/* global SimCardHelper SettingsCache */

// eslint-disable-next-line
window.Customization = (function Customization() {
  const SIM_SHOW = Constants.SIM_CUSTOMIZATION.SHOW;
  const SIM_HIDE = Constants.SIM_CUSTOMIZATION.HIDE;
  const SIM_GRAY = Constants.SIM_CUSTOMIZATION.GRAY;

  const DM_SHOW = Constants.MDM.SHOW;
  const DM_HIDE = Constants.MDM.HIDE;
  const DM_GRAY = Constants.MDM.GRAY;

  const SIM_KEY_LI = [
    'wifi.settings.ui',
    'bluetooth.settings.ui',
    'geolocation.settings.ui',
    'data.settings.ui',
    'data.roaming.settings.ui',
    'screen.timeout.settings.ui',
    'pocketmode.autolock.settings.ui',
    'debug.performance_data.settings.ui',
    'callforward.settings.ui'
  ];

  const DM_KEY_LI = [
    'dm.data.settings.ui',
    'dm.screen.timeout.settings.ui',
    'dm.pocketmode.autolock.settings.ui'
  ];

  const KEY_LI_MAP = {
    'wifi.settings.ui': 'connectivity-wifi',
    'bluetooth.settings.ui': 'connectivity-bluetooth',
    'geolocation.settings.ui': 'geolocation-settings',
    'data.settings.ui': 'liItem-dataConnection',
    'dm.data.settings.ui': 'liItem-dataConnection',
    'data.roaming.settings.ui': 'liItem-dataRoaming',
    'screen.timeout.settings.ui': 'screen-timeout',
    'dm.screen.timeout.settings.ui': 'screen-timeout',
    'pocketmode.autolock.settings.ui': 'auto-lock',
    'dm.pocketmode.autolock.settings.ui': 'auto-lock',
    'debug.performance_data.settings.ui': 'liItem-dataShared',
    'callforward.settings.ui': 'menuItem-callForwarding'
  };
  function updateSettingsUI(key, value) {
    let show = null;
    let hide = null;
    let gray = null;
    if (SIM_KEY_LI.findIndex(item => item === key) >= 0) {
      show = SIM_SHOW;
      hide = SIM_HIDE;
      gray = SIM_GRAY;
    } else if (DM_KEY_LI.findIndex(item => item === key) >= 0) {
      show = DM_SHOW;
      hide = DM_HIDE;
      gray = DM_GRAY;
    } else {
      return;
    }
    const element = document.getElementById(KEY_LI_MAP[key]);
    if (!element) {
      return;
    }
    if (value === hide) {
      element.classList.add('hidden');
      element.classList.remove('focus');
    } else if (value === gray) {
      element.classList.remove('hidden');
      element.classList.add('none-select');
      element.setAttribute('aria-disabled', true);
      if (element.querySelector('input')) {
        element.querySelector('input').disabled = true;
      }
    } else if (value === show) {
      element.classList.remove('hidden');
      element.classList.remove('none-select');
      element.removeAttribute('aria-disabled');
      if (element.querySelector('input')) {
        element.querySelector('input').disabled = false;
      }
    }
  }

  function updateForSettings(value, key) {
    switch (key) {
      case 'wifi.settings.ui':
      case 'dm.wifi.settings.ui':
        updateUIForItem(['wifi']);
        break;
      case 'bluetooth.settings.ui':
      case 'dm.bluetooth.settings.ui':
        updateUIForItem(['bluetooth']);
        break;
      case 'geolocation.settings.ui':
      case 'dm.geolocation.settings.ui':
        updateUIForItem(['geolocation']);
        break;
      case 'wifi-hotspot.settings.ui':
      case 'dm.tethering.wifi.settings.ui':
      case 'tethering.usb.settings.ui':
      case 'dm.tethering.usb.settings.ui':
        updateUIForItem(['hotspot']);
        break;
      case 'airplaneMode.status':
        updateUIForItem(['dataConnection']);
        updateUIForItem(['dataRoaming']);
        break;
      case 'data.settings.ui':
      case 'dm.data.settings.ui':
        updateUIForItem(['dataConnection']);
        break;
      case 'data.roaming.hidden':
      case 'data.roaming.settings.ui':
      case 'ril.data.roaming_enabled':
        updateUIForItem(['dataRoaming']);
        break;
      case 'screen.timeout.settings.ui':
      case 'dm.screen.timeout.settings.ui':
        updateUIForItem(['screen-timeout']);
        break;
      case 'pocketmode.autolock.settings.ui':
      case 'dm.pocketmode.autolock.settings.ui':
        updateUIForItem(['auto-lock']);
        break;
      default:
        updateSettingsUI(key, value);
        break;
    }
  }

  function checkDataSections(values) {
    const element = document.getElementById('data-section');
    if (
      (values['data.settings.ui'] === SIM_HIDE ||
        values['dm.data.settings.ui'] === DM_HIDE) &&
      (values['data.roaming.settings.ui'] === SIM_HIDE ||
        values['data.roaming.hidden'] === true)
    ) {
      element.classList.add('hidden');
      return false;
    }
    element.classList.remove('hidden');
    return true;
  }

  function updateUIForItem(list) {
    for (let i = 0; i < list.length; i++) {
      switch (list[i]) {
        case 'airplane': {
          SettingsDBCache.getSetting('airplaneMode.enabled').then(
            airplaneEnabled => {
              const airplaneSelect = document.getElementById(
                'airplane-mode-select'
              );
              airplaneSelect.classList.remove('hidden');
              for (let j = 0; j < airplaneSelect.options.length; j++) {
                if (
                  airplaneSelect.options[j].value === airplaneEnabled.toString()
                ) {
                  airplaneSelect.options[j].selected = true;
                  const value = airplaneEnabled ? 'on' : 'off';
                  airplaneSelect.options[j].setAttribute('data-l10n-id', value);
                  break;
                }
              }
            }
          );
          break;
        }
        case 'wifi':
          SettingsDBCache.getSettings(
            ['wifi.enabled', 'wifi.settings.ui', 'dm.wifi.settings.ui'],
            results => {
              updateWifiDisplay(results);
            }
          );
          break;
        case 'bluetooth':
          SettingsDBCache.getSettings(
            [
              'bluetooth.enabled',
              'bluetooth.settings.ui',
              'dm.bluetooth.settings.ui'
            ],
            results => {
              updateBluetoothDisplay(results);
            }
          );
          break;
        case 'geolocation':
          SettingsDBCache.getSettings(
            [
              'geolocation.enabled',
              'geolocation.settings.ui',
              'dm.geolocation.settings.ui'
            ],
            results => {
              updateGeolocationDisplay(results);
            }
          );
          break;
        case 'volte':
          SettingsDBCache.getSettings(
            [
              'volte.option.hidden',
              'volte_vowifi_settings.show',
              'ril.data.defaultServiceId',
              'volte.option.hidden'
            ],
            results => {
              updateVoLteVoWifiDisplay(results);
            }
          );
          break;
        case 'hotspot':
          SettingsDBCache.getSettings(
            [
              'tethering.support',
              'ril.data.enabled',
              'wifi-hotspot.settings.ui',
              'dm.tethering.wifi.settings.ui',
              'tethering.usb.settings.ui',
              'dm.tethering.usb.settings.ui'
            ],
            results => {
              updateHotspotDisplay(results);
            }
          );
          break;
        case 'cmas': {
          const cmasItem = document.getElementById('wireless-emergency-alert');
          SettingsDBCache.getSetting('cmas.hidden').then(value => {
            cmasItem.hidden = !!value;
          });
          break;
        }
        case 'dataConnection':
          SettingsDBCache.getSettings(
            [
              'airplaneMode.status',
              'data.settings.ui',
              'dm.data.settings.ui',
              'data.roaming.settings.ui',
              'data.roaming.hidden'
            ],
            results => {
              if (checkDataSections(results)) {
                updateDataConnectionDisplay(results);
              }
            }
          );
          break;
        case 'dataRoaming':
          SettingsDBCache.getSettings(
            [
              'airplaneMode.status',
              'data.settings.ui',
              'dm.data.settings.ui',
              'data.roaming.settings.ui',
              'data.roaming.hidden',
              'ril.data.roaming_enabled'
            ],
            results => {
              if (checkDataSections(results)) {
                updateDataRoamingDisplay(results);
              }
            }
          );
          break;
        case 'screen-timeout':
          SettingsDBCache.getSettings(
            ['screen.timeout.settings.ui', 'dm.screen.timeout.settings.ui'],
            results => {
              updateScreenTimeoutDisplay(results);
            }
          );
          break;
        case 'auto-lock':
          SettingsDBCache.getSettings(
            [
              'pocketmode.autolock.settings.ui',
              'dm.pocketmode.autolock.settings.ui'
            ],
            results => {
              updateAutoLockDisplay(results);
            }
          );
          break;
        default:
          break;
      }
    }
  }

  function initUIForItem(list) {
    if (SettingsDBCache.getInitComplete()) {
      updateUIForItem(list);
    } else {
      window.addEventListener('settings-db-ready', function onDBReady() {
        window.removeEventListener('settings-db-ready', onDBReady);
        updateUIForItem(list);
      });
    }
  }

  function initUIBySettings(list) {
    if (SettingsDBCache.getInitComplete()) {
      SettingsDBCache.getSettings(list, results => {
        for (let i = 0; i < list.length; i++) {
          updateSettingsUI(list[i], results[list[i]]);
        }
        window.dispatchEvent(new CustomEvent('refresh'));
      });
    } else {
      window.addEventListener('settings-db-ready', function onDBReady() {
        window.removeEventListener('settings-db-ready', onDBReady);
        DeviceFeature.ready(() => {
          SettingsDBCache.getSettings(list, results => {
            for (let i = 0; i < list.length; i++) {
              updateSettingsUI(list[i], results[list[i]]);
            }
            window.dispatchEvent(new CustomEvent('refresh'));
          });
        });
      });
    }
  }

  function addListenerForCustomization(list) {
    list.forEach(key => {
      SettingsDBCache.observe(key, '', updateForSettings, true);
    });
  }

  function removeListenerForCustomization(list) {
    list.forEach(key => {
      SettingsDBCache.unobserve(key, updateForSettings);
    });
  }

  function getWifiCertifiedStrId(wifiStrId, wlanStrId) {
    let str = null;
    DeviceFeature.ready(() => {
      str =
        DeviceFeature.getValue('wifiCertified') === 'true'
          ? wifiStrId
          : wlanStrId;
    });
    return str;
  }

  function updateTextContent(element, value) {
    const commonStrings = SettingsCache.getCommonInfo();
    if (commonStrings && commonStrings[value]) {
      element.textContent = commonStrings[value];
    }
  }

  function updateWifiDisplay(values) {
    const element = document.querySelector('#connectivity-wifi');
    if (DeviceFeature.getValue('wifi') !== 'true') {
      element.classList.add('hidden');
      window.dispatchEvent(new CustomEvent('refresh'));
      return;
    }

    const wifiSpan = element.querySelector('span');
    wifiSpan.setAttribute(
      'data-l10n-id',
      getWifiCertifiedStrId('wifi', 'wlan')
    );

    const wifiDesc = document.getElementById('wifi-desc');
    const value = values['wifi.enabled'] ? 'on' : 'off';
    wifiDesc.setAttribute('data-l10n-id', value);

    if (!l10n) {
      updateTextContent(wifiDesc, value);
    }

    if (
      values['wifi.settings.ui'] === SIM_HIDE ||
      values['dm.wifi.settings.ui'] === DM_HIDE
    ) {
      element.classList.add('hidden');
      element.classList.remove('focus');
    } else if (
      values['wifi.settings.ui'] === SIM_GRAY ||
      values['dm.wifi.settings.ui'] === DM_GRAY
    ) {
      element.classList.remove('hidden');
      element.classList.add('none-select');
      element.setAttribute('aria-disabled', true);
    } else {
      element.classList.remove('hidden');
      element.classList.remove('none-select');
      element.removeAttribute('aria-disabled');
    }
    window.dispatchEvent(new CustomEvent('refresh'));
  }

  function updateBluetoothDisplay(values) {
    const element = document.querySelector('#connectivity-bluetooth');
    if (DeviceFeature.getValue('bt') !== 'true' || !ApiManager.bluetooth) {
      element.classList.add('hidden');
      window.dispatchEvent(new CustomEvent('refresh'));
      return;
    }

    const bluetoothDesc = document.getElementById('bluetooth-desc');
    const value = values['bluetooth.enabled'] ? 'on' : 'off';
    bluetoothDesc.setAttribute('data-l10n-id', value);
    if (!l10n) {
      updateTextContent(bluetoothDesc, value);
    }

    if (
      values['bluetooth.settings.ui'] === SIM_HIDE ||
      values['dm.bluetooth.settings.ui'] === DM_HIDE
    ) {
      element.classList.add('hidden');
      element.classList.remove('focus');
    } else if (
      values['bluetooth.settings.ui'] === SIM_GRAY ||
      values['dm.bluetooth.settings.ui'] === DM_GRAY
    ) {
      element.classList.remove('hidden');
      element.classList.add('none-select');
      element.setAttribute('aria-disabled', true);
    } else {
      element.classList.remove('hidden');
      element.classList.remove('none-select');
      element.removeAttribute('aria-disabled');
    }
    window.dispatchEvent(new CustomEvent('refresh'));
  }

  function updateGeolocationDisplay(values) {
    const element = document.querySelector('#geolocation-settings');
    if (DeviceFeature.getValue('gps') !== 'true') {
      element.classList.add('hidden');
      window.dispatchEvent(new CustomEvent('refresh'));
      return;
    }
    // Initial Geolocation settings observer
    const geoDesc = document.getElementById('geolocation-desc');
    const value = values['geolocation.enabled'] ? 'on' : 'off';
    geoDesc.setAttribute('data-l10n-id', value);
    if (!l10n) {
      updateTextContent(geoDesc, value);
    }

    if (
      values['geolocation.settings.ui'] === SIM_HIDE ||
      values['dm.geolocation.settings.ui'] === DM_HIDE
    ) {
      element.classList.add('hidden');
      element.classList.remove('focus');
    } else if (
      values['geolocation.settings.ui'] === SIM_GRAY ||
      values['dm.geolocation.settings.ui'] === DM_GRAY
    ) {
      element.classList.remove('hidden');
      element.classList.add('none-select');
      element.setAttribute('aria-disabled', true);
    } else {
      element.classList.remove('hidden');
      element.classList.remove('none-select');
      element.removeAttribute('aria-disabled');
    }
    window.dispatchEvent(new CustomEvent('refresh'));
  }

  function updateVoLteVoWifiDisplay(values) {
    const element = document.querySelector('#volte-settings');
    const isSupportWifi = DeviceFeature.getValue('wifi');
    const isSupportVowifi = DeviceFeature.getValue('voWifi');
    const isSupportVolte = DeviceFeature.getValue('voLte');
    const isSupportDualLte = DeviceFeature.getValue('dualLte');

    if (
      (isSupportWifi !== 'true' || isSupportVowifi !== 'true') &&
      (isSupportVolte !== 'true' || !values['volte.option.hidden']) &&
      !values['volte_vowifi_settings.show']
    ) {
      element.classList.add('hidden');
      window.dispatchEvent(new CustomEvent('refresh'));
      return;
    }
    const volteDisplay = document.getElementById('volte-settings');
    const volteHeader = document.getElementById('volte-vowifi-header');

    const serviceId = values['ril.data.defaultServiceId'];
    if (
      isSupportDualLte !== 'true' &&
      serviceId !== 0 &&
      DeviceFeature.getValue('primarySim') !== 'true'
    ) {
      volteDisplay.classList.add('hidden');
      window.dispatchEvent(new CustomEvent('refresh'));
      return;
    }
    const mobileConnection = ApiManager.connections[serviceId];
    const supportedBearers =
      mobileConnection.imsHandler &&
      mobileConnection.imsHandler.deviceConfig.supportedBearers;
    if (!supportedBearers) {
      volteDisplay.classList.add('hidden');
      window.dispatchEvent(new CustomEvent('refresh'));
      return;
    }
    const supportWifi =
      isSupportWifi === 'true' &&
      isSupportVowifi === 'true' &&
      supportedBearers.indexOf('wifi') >= 0;
    const supportLte =
      isSupportVolte === 'true' &&
      !values['volte.option.hidden'] &&
      supportedBearers.indexOf('cellular') >= 0;
    if (!supportWifi && !supportLte) {
      volteDisplay.classList.add('hidden');
      window.dispatchEvent(new CustomEvent('refresh'));
      return;
    }
    volteDisplay.classList.remove('hidden');
    if (supportWifi && supportLte) {
      volteHeader.setAttribute(
        'data-l10n-id',
        getWifiCertifiedStrId('volte-header', 'volte-wlanCalling-header')
      );
    } else if (supportLte) {
      volteHeader.setAttribute('data-l10n-id', 'volte');
    } else if (supportWifi) {
      volteHeader.setAttribute(
        'data-l10n-id',
        getWifiCertifiedStrId('vowifi', 'wlanCalling')
      );
    }
    window.dispatchEvent(new CustomEvent('refresh'));
  }

  function getHotspotDisplay(values) {
    const wifiState = getHotspotWifiDisplay(values);
    const usbState = getHotspotUsbDisplay(values);
    if (wifiState === DM_HIDE && usbState === DM_HIDE) {
      return DM_HIDE;
    }
    if (
      (wifiState === DM_GRAY && usbState === DM_GRAY) ||
      (wifiState === DM_HIDE && usbState === DM_GRAY) ||
      (wifiState === DM_GRAY && usbState === DM_HIDE)
    ) {
      return DM_GRAY;
    }
    return DM_SHOW;
  }

  function getHotspotWifiDisplay(values) {
    const hotspotSupport = values['tethering.support'];
    const wifiUi = values['wifi-hotspot.settings.ui'];
    const dmWifiUi = values['dm.tethering.wifi.settings.ui'];
    const dataEnabled = values['ril.data.enabled'];

    const isSupportWifi =
      DeviceFeature.getValue('wifi') === 'true' &&
      wifiUi !== SIM_HIDE &&
      dmWifiUi !== DM_HIDE;
    if (!hotspotSupport || !isSupportWifi) {
      return DM_HIDE;
    }
    if (
      !dataEnabled ||
      !SimCardHelper.hasValidCard() ||
      wifiUi === SIM_GRAY ||
      dmWifiUi === DM_GRAY
    ) {
      return DM_GRAY;
    }
    return DM_SHOW;
  }

  function getHotspotUsbDisplay(values) {
    const hotspotSupport = values['tethering.support'];
    const usbUi = values['tethering.usb.settings.ui'];
    const dmUsbUi = values['dm.tethering.usb.settings.ui'];
    const dataEnabled = values['ril.data.enabled'];

    const isSupportUsb = usbUi !== SIM_HIDE && dmUsbUi !== DM_HIDE;
    if (!hotspotSupport || !isSupportUsb) {
      return DM_HIDE;
    }
    if (
      !dataEnabled ||
      !SimCardHelper.hasValidCard() ||
      usbUi === SIM_GRAY ||
      dmUsbUi === DM_GRAY
    ) {
      return DM_GRAY;
    }
    return DM_SHOW;
  }

  function updateHotspotDisplay(values) {
    const internetSharing = document.querySelector('#internet-sharing');
    const hotspotStatus = getHotspotDisplay(values);
    if (hotspotStatus === DM_HIDE) {
      internetSharing.classList.add('hidden');
    } else if (hotspotStatus === DM_GRAY) {
      internetSharing.classList.remove('hidden');
      internetSharing.setAttribute('aria-disabled', true);
    } else {
      internetSharing.classList.remove('hidden');
      internetSharing.removeAttribute('aria-disabled');
    }
    window.dispatchEvent(new CustomEvent('refresh'));
  }

  function updateDataConnectionDisplay(values) {
    const element = document.getElementById('liItem-dataConnection');
    const status = values['airplaneMode.status'];

    if (
      values['data.settings.ui'] === SIM_HIDE ||
      values['dm.data.settings.ui'] === DM_HIDE
    ) {
      element.classList.add('hidden');
      element.classList.remove('focus');
    } else if (
      values['data.settings.ui'] === SIM_GRAY ||
      values['dm.data.settings.ui'] === DM_GRAY ||
      status !== 'disabled'
    ) {
      element.classList.remove('hidden');
      element.classList.add('none-select');
      element.setAttribute('aria-disabled', true);
    } else {
      element.classList.remove('hidden');
      element.classList.remove('none-select');
      element.removeAttribute('aria-disabled');
    }
    window.dispatchEvent(new CustomEvent('refresh'));
  }

  function updateDataRoamingDisplay(values) {
    const element = document.getElementById('liItem-dataRoaming');
    const dataRoamingDesc = document.getElementById('data-roaming-desc');
    const roamingPreference = document.getElementById(
      'operator-roaming-preference'
    );

    const status = values['airplaneMode.status'];
    if (
      values['data.roaming.settings.ui'] === SIM_HIDE ||
      values['data.roaming.hidden'] === true
    ) {
      element.classList.add('hidden');
      element.classList.remove('focus');
      roamingPreference.classList.add('hidden');
      return;
    }
    element.classList.remove('hidden');
    element.classList.add('none-select');

    const mobileConnection =
      ApiManager.connections[SimCardHelper.defaultServiceId];
    const voiceType = mobileConnection.voice && mobileConnection.voice.type;
    if (
      Constants.NETWORK_TYPE_MAP[voiceType] === 'cdma' &&
      values['ril.data.roaming_enabled']
    ) {
      roamingPreference.classList.remove('hidden');
    } else {
      roamingPreference.classList.add('hidden');
    }
    if (values['ril.data.roaming_enabled']) {
      dataRoamingDesc.setAttribute('data-l10n-id', 'on');
    } else {
      dataRoamingDesc.setAttribute('data-l10n-id', 'off');
    }
    if (
      values['data.roaming.settings.ui'] === SIM_GRAY ||
      status !== 'disabled'
    ) {
      element.setAttribute('aria-disabled', true);
      roamingPreference.setAttribute('aria-disabled', true);
    } else {
      element.removeAttribute('aria-disabled');
      roamingPreference.removeAttribute('aria-disabled');
    }
    window.dispatchEvent(new CustomEvent('refresh'));
  }

  function updateScreenTimeoutDisplay(values) {
    const element = document.getElementById('screen-timeout');
    const timeoutUi = values['screen.timeout.settings.ui'];
    const dmTimeoutUi = values['dm.screen.timeout.settings.ui'];
    if (timeoutUi === SIM_HIDE || dmTimeoutUi === DM_HIDE) {
      element.classList.add('hidden');
      element.classList.remove('focus');
    } else if (timeoutUi === SIM_GRAY || dmTimeoutUi === DM_GRAY) {
      element.classList.remove('hidden');
      element.classList.add('none-select');
      element.setAttribute('aria-disabled', true);
    } else {
      element.classList.remove('hidden');
      element.classList.remove('none-select');
      element.removeAttribute('aria-disabled');
    }
    window.dispatchEvent(new CustomEvent('refresh'));
  }

  function updateAutoLockDisplay(values) {
    const element = document.getElementById('auto-lock');
    const autoLockUi = values['pocketmode.autolock.settings.ui'];
    const dmAutoLockUi = values['dm.pocketmode.autolock.settings.ui'];
    if (DeviceFeature.getValue('flipDevice') === 'true') {
      element.classList.add('hidden');
      return;
    }

    if (autoLockUi === SIM_HIDE || dmAutoLockUi === DM_HIDE) {
      element.classList.add('hidden');
      element.classList.remove('focus');
    } else if (autoLockUi === SIM_GRAY || dmAutoLockUi === DM_GRAY) {
      element.classList.remove('hidden');
      element.classList.add('none-select');
      element.setAttribute('aria-disabled', true);
    } else {
      element.classList.remove('hidden');
      element.classList.remove('none-select');
      element.removeAttribute('aria-disabled');
    }
    window.dispatchEvent(new CustomEvent('refresh'));
  }
  return {
    initUIForItem,
    initUIBySettings,
    updateUI: updateUIForItem,
    addListener: addListenerForCustomization,
    removeListener: removeListenerForCustomization,
    getWifiCertifiedStrId
  };
})();
