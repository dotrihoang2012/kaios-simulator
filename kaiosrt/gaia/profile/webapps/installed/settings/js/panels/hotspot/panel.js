/* global SIMSlotManager */

define('panels/hotspot/panel',['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createPanel() {
    const HOTSPOT_WIFI_ENABLED = 'tethering.wifi.enabled';
    const DM_WIFI_UI = 'dm.tethering.wifi.settings.ui';
    const HOTSPOT_USB_ENABLED = 'tethering.usb.enabled';
    const DM_USB_UI = 'dm.tethering.usb.settings.ui';
    const WIFI_SSID_KEY = 'tethering.wifi.ssid';
    const WIFI_SECURITY_KEY = 'tethering.wifi.security.type';
    const WIFI_PASSWORD_KEY = 'tethering.wifi.security.password';
    const DATA_KEY = 'ril.data.enabled';
    const WIFI_KEY = 'wifi.enabled';
    const USB_STORAGE_KEY = 'ums.enabled';

    let currentConfig = {};
    let elements = null;
    const hotspotSettings = {};
    const hotspotUI = {
      isWifiShow: true,
      isUsbShow: true
    };
    let timeoutId = null;

    const checkPage = function checkPage() {
      if (!(hotspotUI.isWifiShow || hotspotUI.isUsbShow)) {
        Settings.setCurrentPanel('root');
      }
    };

    const handleSettingsChange = function handleSettingsChange(value, name) {
      switch (name) {
        case DM_WIFI_UI:
          if (value === Constants.MDM.HIDE) {
            hotspotUI.isWifiShow = false;
            elements.wifiTetheringSection.classList.add('hidden');
            checkPage();
          } else {
            hotspotUI.isWifiShow = true;
            elements.wifiTetheringSection.classList.remove('hidden');
          }
          break;
        case DM_USB_UI:
          if (value === Constants.MDM.HIDE) {
            hotspotUI.isUsbShow = false;
            elements.usbTetheringSection.classList.add('hidden');
            checkPage();
          } else {
            hotspotUI.isUsbShow = true;
            elements.usbTetheringSection.classList.remove('hidden');
          }
          break;
        case HOTSPOT_WIFI_ENABLED:
          currentConfig.wifiHotspotEnabled = value;
          elements.wifiHotspotSelect.value = value;
          if (value) {
            elements.hotspotSettingsItem.setAttribute('aria-disabled', true);
          } else {
            elements.hotspotSettingsItem.removeAttribute('aria-disabled');
          }
          break;
        case HOTSPOT_USB_ENABLED:
          currentConfig.usbTetheringEnabled = value;
          elements.usbTetheringSelect.value = value;
          break;
        case WIFI_SSID_KEY:
          hotspotSettings.ssid = value;
          elements.wifiSsidDes.textContent = value;
          break;
        case WIFI_SECURITY_KEY:
          hotspotSettings.security = value;
          elements.wifiSecurityTypeDes.textContent = l10n.get(
            `hotspot-${value}`
          );
          if (value === 'open') {
            elements.wifiPasswordItem.classList.add('hidden');
          } else {
            elements.wifiPasswordItem.classList.remove('hidden');
          }
          break;
        case WIFI_PASSWORD_KEY:
          if (!value) {
            value = generateHotspotPassword();
            const cSet = {};
            cSet[WIFI_PASSWORD_KEY] = value;
            SettingsDBCache.saveSettings(cSet);
          }
          hotspotSettings.password = value;
          elements.wifiPasswordDes.textContent = value;
          break;
        case DATA_KEY:
          currentConfig.isDataEnabled = value;
          break;
        case WIFI_KEY:
          currentConfig.isWifiEnabled = value;
          break;
        case USB_STORAGE_KEY:
          currentConfig.isUsbStorageEnabled = value;
          break;
        default:
          break;
      }
    };

    const updateUsbTetheringStatus = function updateUsbTetheringStatus(
      statusValue
    ) {
      if (statusValue) {
        elements.usbTetheringItem.removeAttribute('aria-disabled');
        elements.usbTetheringSelect.disabled = false;
      } else {
        elements.usbTetheringSelect.disabled = true;
        elements.usbTetheringItem.setAttribute('aria-disabled', true);
      }
    };

    function showConfirmDialog(element, message, desc) {
      const dialogConfig = {
        title: { id: 'internetSharing', args: {} },
        body: { id: message, args: {} },
        desc: { id: desc, args: {} },
        accept: {
          name: 'OK',
          l10nId: 'ok',
          priority: 2,
          callback() {
            elements.value = false;
          }
        }
      };
      DialogHelper.show(dialogConfig);
    }

    function showSIMCardDialog(element) {
      showConfirmDialog(
        element,
        'no-sim-card-message-1',
        Customization.getWifiCertifiedStrId(
          'no-sim-card-message-2',
          'no-sim-card-message-2-wlan'
        )
      );
    }

    function showNetworkDialog() {
      showConfirmDialog(
        Customization.getWifiCertifiedStrId(
          'turn-on-network-message',
          'turn-on-network-message-wlan'
        ),
        ''
      );
    }

    function setWifiTetheringEnabled() {
      SettingsDBCache.getSettings(
        [WIFI_SSID_KEY, WIFI_SECURITY_KEY, WIFI_PASSWORD_KEY],
        result => {
          ApiManager.tetheringManager.setTetheringEnabled(true, 'wifi', {
            ssid: result[WIFI_SSID_KEY],
            security: result[WIFI_SECURITY_KEY],
            key: result[WIFI_PASSWORD_KEY]
          });
        }
      );
    }

    function saveUsbTethering(value) {
      const cSet = {};
      cSet[HOTSPOT_USB_ENABLED] = value;
      updateUsbTetheringStatus(false);
      SettingsDBCache.saveSettings(cSet);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      timeoutId = setTimeout(() => {
        updateUsbTetheringStatus(currentConfig.isUSBInserted);
        timeoutId = null;
      }, 5000);
    }

    function showWifiDialogByWifiHotspot() {
      const header = Customization.getWifiCertifiedStrId(
        'is-warning-wifi-header',
        'is-warning-wlan-header'
      );
      const bodyId = Customization.getWifiCertifiedStrId(
        'is-warning-hotspot-wifi-message',
        'is-warning-hotspot-wlan-message'
      );
      const cSet = {};
      const config = {
        title: { id: header, args: {} },
        body: { id: bodyId, args: {} },
        cancel: {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1,
          callback() {
            elements.wifiHotspotSelect.value = false;
            DebugHelper.debug('Reset cancel');
          }
        },
        confirm: {
          name: 'Turn On',
          l10nId: 'turnOn',
          priority: 3,
          callback() {
            if (currentConfig.isFTUHotspot) {
              cSet[WIFI_KEY] = false;
              SettingsDBCache.saveSettings(cSet);
              showFtuDialogForHotspot(true);
            } else {
              cSet[WIFI_KEY] = false;
              cSet[HOTSPOT_WIFI_ENABLED] = true;
              SettingsDBCache.saveSettings(cSet);
              setWifiTetheringEnabled();
            }
          }
        }
      };
      DialogHelper.show(config);
    }

    function showWifiDialogByUSBTethering() {
      const cSet = {};
      const bodyId = Customization.getWifiCertifiedStrId(
        'is-warning-hotspot-tethering-message',
        'is-warning-hotspot-tethering-message-wlan'
      );
      const config = {
        title: { id: 'usb-tethering-header', args: {} },
        body: { id: bodyId, args: {} },
        cancel: {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1,
          callback() {
            elements.usbTetheringSelect.value = false;
            DebugHelper.debug('Reset cancel');
          }
        },
        confirm: {
          name: 'Turn On',
          l10nId: 'turnOn',
          priority: 3,
          callback() {
            if (currentConfig.isUsbStorageEnabled) {
              cSet[WIFI_KEY] = false;
              SettingsDBCache.saveSettings(cSet);
              showUsbStorageDialogByUSBTethering();
            } else if (currentConfig.isFTUTethering) {
              cSet[WIFI_KEY] = false;
              SettingsDBCache.saveSettings(cSet);
              showFtuDialogForUsbTethering(cSet);
            } else {
              cSet[WIFI_KEY] = false;
              SettingsDBCache.saveSettings(cSet);
              saveUsbTethering(true);
            }
          }
        }
      };
      DialogHelper.show(config);
    }

    function showHotspotDialogByUSBTethering() {
      const cSet = {};
      const bodyId = Customization.getWifiCertifiedStrId(
        'is-warning-tethering-wifi-message',
        'is-warning-tethering-wlan-message'
      );
      const config = {
        title: { id: 'usb-tethering-header', args: {} },
        body: { id: bodyId, args: {} },
        cancel: {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1,
          callback() {
            elements.usbTetheringSelect.value = false;
            DebugHelper.debug('usb-tethering-off-dialog-hotspot cancel');
          }
        },
        confirm: {
          name: 'Turn On',
          l10nId: 'turnOn',
          priority: 3,
          callback() {
            if (currentConfig.isUsbStorageEnabled) {
              cSet[HOTSPOT_WIFI_ENABLED] = false;
              SettingsDBCache.saveSettings(cSet);
              showUsbStorageDialogByUSBTethering();
            } else if (currentConfig.isFTUTethering) {
              cSet[HOTSPOT_WIFI_ENABLED] = false;
              SettingsDBCache.saveSettings(cSet);
              showFtuDialogForUsbTethering(true);
            } else {
              cSet[HOTSPOT_WIFI_ENABLED] = false;
              SettingsDBCache.saveSettings(cSet);
              saveUsbTethering(true);
            }
          }
        }
      };
      DialogHelper.show(config);
    }

    function showUsbStorageDialogByUSBTethering() {
      const cSet = {};
      const config = {
        title: { id: 'usb-tethering-header', args: {} },
        body: { id: 'usb-storage-off-dialog', args: {} },
        cancel: {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1,
          callback() {
            elements.usbTetheringSelect.value = false;
            DebugHelper.debug('Reset cancel');
          }
        },
        confirm: {
          name: 'Turn On',
          l10nId: 'turnOn',
          priority: 3,
          callback() {
            if (currentConfig.isFTUTethering) {
              cSet[USB_STORAGE_KEY] = false;
              SettingsDBCache.saveSettings(cSet);
              showFtuDialogForUsbTethering(true);
            } else {
              cSet[USB_STORAGE_KEY] = false;
              SettingsDBCache.saveSettings(cSet);
              saveUsbTethering(true);
            }
          }
        }
      };
      DialogHelper.show(config);
    }

    function showFtuDialogForUsbTethering(oneBtn) {
      const config = {
        title: { id: 'usb-tethering-header', args: {} },
        body: { id: 'ftu-usb-tethering', args: {} }
      };
      if (oneBtn) {
        config.accept = {
          name: 'ok',
          l10nId: 'ok',
          priority: 2,
          callback() {
            DeviceFeature.setLocalStorageItem('firstTethering', 'false');
            currentConfig.isFTUTethering = false;
            saveUsbTethering(true);
          }
        };
      } else {
        config.cancel = {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1,
          callback() {
            elements.usbTetheringSelect.value = false;
            DebugHelper.debug('Reset cancel');
          }
        };
        config.confirm = {
          name: 'Turn On',
          l10nId: 'turnOn',
          priority: 3,
          callback() {
            DeviceFeature.setLocalStorageItem('firstTethering', 'false');
            currentConfig.isFTUTethering = false;
            saveUsbTethering(true);
          }
        };
      }
      DialogHelper.show(config);
    }

    function showUsbTetheringDialogByHotspot() {
      const cSet = {};
      const header = Customization.getWifiCertifiedStrId(
        'is-warning-wifi-header',
        'is-warning-wlan-header'
      );
      const bodyId = Customization.getWifiCertifiedStrId(
        'is-warning-wifi-tethering-message',
        'is-warning-wlan-tethering-message'
      );
      const config = {
        title: { id: header, args: {} },
        body: { id: bodyId, args: {} },
        cancel: {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1,
          callback() {
            elements.wifiHotspotSelect.value = false;
            DebugHelper.debug('usb-tethering-off-dialog-hotspot cancel');
          }
        },
        confirm: {
          name: 'Turn On',
          l10nId: 'turnOn',
          priority: 3,
          callback() {
            if (currentConfig.isFTUHotspot) {
              showFtuDialogForHotspot(true);
              cSet[HOTSPOT_USB_ENABLED] = false;
              SettingsDBCache.saveSettings(cSet);
            } else {
              cSet[HOTSPOT_USB_ENABLED] = false;
              cSet[HOTSPOT_WIFI_ENABLED] = true;
              SettingsDBCache.saveSettings(cSet);
              setWifiTetheringEnabled();
            }
          }
        }
      };
      DialogHelper.show(config);
    }

    function showFtuDialogForHotspot(oneBtn) {
      const header = Customization.getWifiCertifiedStrId(
        'is-warning-wifi-header',
        'is-warning-wlan-header'
      );
      const config = {
        title: { id: header, args: {} }
      };
      config.body = {
        id: 'ftu-wifi-hotspot',
        args: {}
      };
      if (oneBtn) {
        config.accept = {
          name: 'OK',
          l10nId: 'ok',
          priority: 2,
          callback() {
            DeviceFeature.setLocalStorageItem('firstHotspot', 'false');
            currentConfig.isFTUHotspot = false;
            const cSet = {};
            cSet[HOTSPOT_WIFI_ENABLED] = true;
            SettingsDBCache.saveSettings(cSet);
            setWifiTetheringEnabled();
          }
        };
      } else {
        config.cancel = {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1,
          callback() {
            elements.wifiHotspotSelect.value = false;
            DebugHelper.debug('Wifi hotspot FTU cancel');
          }
        };
        config.confirm = {
          name: 'Turn On',
          l10nId: 'turnOn',
          priority: 3,
          callback() {
            DeviceFeature.setLocalStorageItem('firstHotspot', 'false');
            currentConfig.isFTUHotspot = false;
            const cSet = {};
            cSet[HOTSPOT_WIFI_ENABLED] = true;
            SettingsDBCache.saveSettings(cSet);
            setWifiTetheringEnabled();
          }
        };
      }
      DialogHelper.show(config);
    }

    const handleChange = function handleChange(evt) {
      evt.stopPropagation();
      document.querySelector('.focus').focus();
      const { target } = evt;
      const value = target.value === 'true' || false;
      const cSet = {};
      switch (target.id) {
        case 'wifi-hotspot-select':
          if (value) {
            if (!currentConfig.hasSIMCard) {
              showSIMCardDialog(target);
              elements.wifiHotspotSelect.value = false;
              return;
            }
            if (!currentConfig.isDataEnabled) {
              showNetworkDialog(target);
              elements.wifiHotspotSelect.value = false;
              return;
            }

            if (currentConfig.isWifiEnabled) {
              showWifiDialogByWifiHotspot();
            } else if (currentConfig.usbTetheringEnabled) {
              showUsbTetheringDialogByHotspot();
            } else if (currentConfig.isFTUHotspot) {
              showFtuDialogForHotspot(false);
            } else {
              cSet[HOTSPOT_WIFI_ENABLED] = true;
              SettingsDBCache.saveSettings(cSet);
              setWifiTetheringEnabled();
            }
          } else {
            cSet[HOTSPOT_WIFI_ENABLED] = false;
            SettingsDBCache.saveSettings(cSet);
          }
          break;
        case 'usb-tethering-select':
          if (value) {
            if (!currentConfig.hasSIMCard) {
              showSIMCardDialog(target);
              return;
            }
            if (!currentConfig.isDataEnabled) {
              showNetworkDialog(target);
              return;
            }

            if (currentConfig.isWifiEnabled) {
              showWifiDialogByUSBTethering();
            } else if (currentConfig.wifiHotspotEnabled) {
              showHotspotDialogByUSBTethering();
            } else if (currentConfig.isUsbStorageEnabled) {
              showUsbStorageDialogByUSBTethering();
            } else if (currentConfig.isFTUTethering) {
              showFtuDialogForUsbTethering(false);
            } else {
              saveUsbTethering(true);
            }
          } else {
            saveUsbTethering(value);
          }
          break;
        default:
          break;
      }
    };

    const handleEvent = function handleEvent(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      if (
        elements.hotspotSettingsItem.getAttribute('aria-disabled') === 'true'
      ) {
        return;
      }
      Settings.setCurrentPanel('hotspot_wifi_settings', {
        settings: hotspotSettings
      });
    };

    function generateHotspotPassword() {
      const words = [
        'amsterdam',
        'ankara',
        'auckland',
        'belfast',
        'berlin',
        'boston',
        'calgary',
        'caracas',
        'chicago',
        'dakar',
        'delhi',
        'dubai',
        'dublin',
        'houston',
        'jakarta',
        'lagos',
        'lima',
        'madrid',
        'newyork',
        'osaka',
        'oslo',
        'porto',
        'santiago',
        'saopaulo',
        'seattle',
        'stockholm',
        'sydney',
        'taipei',
        'tokyo',
        'toronto'
      ];
      let password = words[Math.floor(Math.random() * words.length)];
      for (let i = 0; i < 4; i++) {
        password += Math.floor(Math.random() * 10);
      }
      return password;
    }

    const getStorageBoolean = function getStorageBoolean(key) {
      const boolValue = DeviceFeature.getValue(key) || 'true';
      const enabled = boolValue === 'true' || false;
      return enabled;
    };

    const usbInsertChange = function usbInsertChange(evt) {
      currentConfig.isUSBInserted = evt.deviceAttached;
      DebugHelper.log(`onusbstatuschange:${currentConfig.isUSBInserted}`);
      updateUsbTetheringStatus(currentConfig.isUSBInserted);
    };

    const tetheringStatesChange = function tetheringStatesChange(evt) {
      if (evt.isTrusted) {
        updateUsbTetheringStatus(currentConfig.isUSBInserted);
      }
    };

    function initActiveSIMSlot() {
      SIMSlotManager.getSlots().forEach(SIMSlot => {
        if (!SIMSlot.isAbsent()) {
          currentConfig.activeSIMCard = SIMSlot;
        }
      });

      if (currentConfig.activeSIMCard === null) {
        currentConfig.hasSIMCard = false;
      } else {
        currentConfig.activeSIMCard.conn.addEventListener(
          'cardstatechange',
          updateActiveSIMSlot
        );
        updateActiveSIMSlot();
      }
    }

    function updateActiveSIMSlot() {
      const { cardState } = currentConfig.activeSIMCard.simCard;
      switch (cardState) {
        case null:
        case 'unknown':
          currentConfig.hasSIMCard = false;
          break;
        default:
          currentConfig.hasSIMCard = true;
          break;
      }
    }

    function updateDisplayUI() {
      elements.wifiHotspotH2.setAttribute(
        'data-l10n-id',
        Customization.getWifiCertifiedStrId(
          'internetSharing-wifi',
          'internetSharing-wlan'
        )
      );
      elements.wifiHotspotSpan.setAttribute(
        'data-l10n-id',
        Customization.getWifiCertifiedStrId('wifi-hotspot', 'wlan-hotspot')
      );
      elements.internetSharingWifiDesc.setAttribute(
        'data-l10n-id',
        Customization.getWifiCertifiedStrId(
          'internetSharing-wifi-desc',
          'internetSharing-wlan-desc'
        )
      );
      elements.autoTurnOffDesc.setAttribute(
        'data-l10n-id',
        Customization.getWifiCertifiedStrId(
          'auto-turnOff-desc',
          'auto-turnOff-desc-wlan'
        )
      );
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          panel,
          wifiTetheringSection: panel.querySelector('#wifi-tethering-section'),
          usbTetheringSection: panel.querySelector('#usb-tethering-section'),
          hotspotSettingsItem: panel.querySelector('#hotspot-settings-item'),
          wifiHotspotSelect: panel.querySelector('#wifi-hotspot-select'),
          usbTetheringItem: panel.querySelector('#usb-tethering'),
          usbTetheringSelect: panel.querySelector('#usb-tethering-select'),
          wifiSsidDes: panel.querySelector('#network-name-desc'),
          wifiSecurityTypeDes: panel.querySelector('#wifi-security-desc'),
          wifiPasswordItem: panel.querySelector('#wifi-hotspot-item'),
          wifiPasswordDes: panel.querySelector('#wifi-password-desc'),
          wifiHotspotH2: panel.querySelector('#hotspot-wifi-header h2'),
          wifiHotspotSpan: panel.querySelector('#wifi-hotspot span'),
          internetSharingWifiDesc: panel.querySelector(
            '#internet-sharing-wifi-desc span'
          ),
          autoTurnOffDesc: panel.querySelector('#auto-turn-off-desc span')
        };

        currentConfig = {
          activeSIMCard: null,
          hasSIMCard: false,
          isDataEnabled: true,
          isWifiEnabled: false,
          isUsbStorageEnabled: false,
          wifiHotspotEnabled: false,
          usbTetheringEnabled: false,
          isUSBInserted: ApiManager.usbManager.deviceAttached,
          isFTUHotspot: getStorageBoolean('firstHotspot'),
          isFTUTethering: getStorageBoolean('firstTethering')
        };
        updateUsbTetheringStatus(currentConfig.isUSBInserted);
        ApiManager.usbManager.onusbstatuschange = usbInsertChange;
        ApiManager.tetheringManager.ontetheringstatuschange = tetheringStatesChange;
        initActiveSIMSlot();
      },

      onBeforeShow(panel) {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        ListFocusHelper.updateSoftkey(panel);
        updateDisplayUI();
        SettingsDBCache.observe(DM_WIFI_UI, '', handleSettingsChange);
        SettingsDBCache.observe(DM_USB_UI, '', handleSettingsChange);
        SettingsDBCache.observe(
          HOTSPOT_WIFI_ENABLED,
          false,
          handleSettingsChange
        );
        SettingsDBCache.observe(
          HOTSPOT_USB_ENABLED,
          false,
          handleSettingsChange
        );

        SettingsDBCache.observe(WIFI_SSID_KEY, '', handleSettingsChange);
        SettingsDBCache.observe(
          WIFI_SECURITY_KEY,
          'wpa-psk',
          handleSettingsChange
        );
        SettingsDBCache.observe(WIFI_PASSWORD_KEY, '', handleSettingsChange);
        SettingsDBCache.observe(DATA_KEY, true, handleSettingsChange);
        SettingsDBCache.observe(WIFI_KEY, false, handleSettingsChange);
        SettingsDBCache.observe(USB_STORAGE_KEY, false, handleSettingsChange);

        elements.wifiHotspotSelect.addEventListener('change', handleChange);
        elements.usbTetheringSelect.addEventListener('change', handleChange);
        elements.hotspotSettingsItem.addEventListener('click', handleEvent);
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        SettingsDBCache.unobserve(DM_WIFI_UI, handleSettingsChange);
        SettingsDBCache.unobserve(DM_USB_UI, handleSettingsChange);
        SettingsDBCache.unobserve(HOTSPOT_WIFI_ENABLED, handleSettingsChange);
        SettingsDBCache.unobserve(HOTSPOT_USB_ENABLED, handleSettingsChange);

        SettingsDBCache.unobserve(WIFI_SSID_KEY, handleSettingsChange);
        SettingsDBCache.unobserve(WIFI_SECURITY_KEY, handleSettingsChange);
        SettingsDBCache.unobserve(WIFI_PASSWORD_KEY, handleSettingsChange);
        SettingsDBCache.unobserve(DATA_KEY, handleSettingsChange);
        SettingsDBCache.unobserve(WIFI_KEY, handleSettingsChange);
        SettingsDBCache.unobserve(USB_STORAGE_KEY, handleSettingsChange);

        elements.wifiHotspotSelect.removeEventListener('change', handleChange);
        elements.usbTetheringSelect.removeEventListener('change', handleChange);
        elements.hotspotSettingsItem.removeEventListener('click', handleEvent);
      },
      onUninit() {
        ApiManager.usbManager.onusbstatuschange = null;
        ApiManager.tetheringManager.ontetheringstatuschange = null;
      }
    });
  };
});

