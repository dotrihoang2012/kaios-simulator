

define('modules/mvvm/observable',[],function() {
  function unobserve(_eventHandlers, prop, handler) {
    // arguments in reverse order to support .bind(handler) for the
    // unbind from all case
    function removeHandler(handler, prop) {
      var handlers = _eventHandlers[prop];
      if (!handlers) {
        return;
      }
      var index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }

    if (typeof prop === 'function') {
      // (handler) -- remove from every key in _eventHandlers
      Object.keys(_eventHandlers).forEach(removeHandler.bind(null, prop));
    } else if (handler) {
      // (prop, handler) -- remove handler from the specific prop
      removeHandler(handler, prop);
    } else if (prop in _eventHandlers) {
      // (prop) -- otherwise remove all handlers for property
      _eventHandlers[prop] = [];
    }
  }

  /*
   * An Observable is able to notify its property change. It is initialized by
   * an ordinary object.
   */
  function Observable(obj) {
    var _eventHandlers = {};
    var _observable = {
      observe: function o_observe(p, handler) {
        /*
         * We should check if _observable[_p] exists. Since _observable[_p] is
         * created along with _eventHandlers[p], here we simply check
         * _eventHandlers[p].
         */
        var handlers = _eventHandlers[p];
        if (handlers) {
          handlers.push(handler);
        }
      },
      /**
       * unobserve([prop], handler) - remove handler from observeable callbacks
       */
      unobserve: unobserve.bind(null, _eventHandlers)
    };

    var _getFunctionTemplate = function(p) {
      return function() {
        return _observable['_' + p];
      };
    };

    var _setFunctionTemplate = function(p) {
      return function(value) {
        var oldValue = _observable['_' + p];
        if (oldValue !== value) {
          _observable['_' + p] = value;
          var handlers = _eventHandlers[p];
          handlers.forEach(function(handler) {
            handler(value, oldValue);
          });
        }
      };
    };

    /*
     * Iterate all properties in the object and create corresponding getter and
     * setter for them.
     */
    for (var p in obj) {
      // If p is a function, simply add it to the observable.
      if (typeof obj[p] === 'function') {
        _observable[p] = obj[p];
        continue;
      }

      _eventHandlers[p] = [];

      Object.defineProperty(_observable, '_' + p, {
        value: obj[p],
        writable: true
      });

      Object.defineProperty(_observable, p, {
        enumerable: true,
        get: _getFunctionTemplate(p),
        set: _setFunctionTemplate(p)
      });
    }

    return _observable;
  }

  return Observable;
});


define('modules/battery/battery',['require','modules/mvvm/observable'],function(require) { //eslint-disable-line

  const Observable = require('modules/mvvm/observable');

  const getLevel = function getLevel() {
    return Math.min(100, Math.round(ApiManager.battery.level * 100));
  };

  const getState = function getState() {
    if (ApiManager.battery.charging) {
      return getLevel() === 100 ? 'charged' : 'charging';
    }
    return 'unplugged';
  };

  const Battery = Observable({
    level: getLevel(),
    state: getState()
  });

  const handleEvent = function handleEvent(evt) {
    switch (evt.type) {
      case 'levelchange':
        Battery.level = getLevel();
        if (Battery.level === 100) {
          Battery.state = getState();
        }
        break;
      case 'chargingchange':
        Battery.state = getState();
        break;
      default:
        break;
    }
  };

  ApiManager.battery.addEventListener('levelchange', handleEvent);
  ApiManager.battery.addEventListener('chargingchange', handleEvent);

  return Battery;
});

/* global RootManager SimCardHelper DeviceStorageHelper AccountHelper ConnectionHelper */


define('panels/root/panel',['require','modules/settings_panel','modules/battery/battery'],function (require) {//eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  const Battery = require('modules/battery/battery');

  return function rootPanel() {
    const AIRPLANE_STATUS = 'airplaneMode.status';
    const WIFI_KEY = 'wifi.enabled';
    const BLUETOOTH_KEY = 'bluetooth.enabled';
    const DEVELOPER_KEY = 'developer.menu.enabled';
    const ANTI_THEFT_KEY = 'antitheft.enabled';
    const ROOT_SETTINGS_UI_LIST = [
      'wifi.settings.ui',
      'dm.wifi.settings.ui',
      'bluetooth.settings.ui',
      'dm.bluetooth.settings.ui',
      'geolocation.settings.ui',
      'dm.geolocation.settings.ui',
      'wifi-hotspot.settings.ui',
      'dm.tethering.wifi.settings.ui',
      'tethering.usb.settings.ui',
      'dm.tethering.usb.settings.ui'
    ];

    const airplaneHelper = {
      status: null
    };

    let elements = null;

    let antiTheftValue = true;
    let otherAccountInfo = [];

    const sizeList = {
      total: null,
      sdcard: null,
      apps: null
    };

    const updateBatteryInfo = function updateBatteryInfo() {
      l10n.setAttributes(
        elements.batteryDesc,
        `batteryLevel-percent-${Battery.state}`,
        { level: Battery.level }
      );
    };

    const updateSystemSize = function updateSystemSize() {
      if (sizeList.total && sizeList.sdcard && sizeList.apps) {
        const systemSize = sizeList.total - sizeList.sdcard - sizeList.apps;
        DeviceStorageHelper.showFormatedSize(
          elements.systemStorageDesc,
          'storageSize',
          parseInt(systemSize, 10)
        );
      }
    };

    const updateStorageSize = function updateStorageSize(
      deviceStorage,
      element,
      type
    ) {
      const results = {};
      const MIN_SIZE =
        type === 'apps' ? Constants.MIN_APP_SIZE : Constants.MIN_MEDIA_SIZE;
      deviceStorage.usedSpace().then(usedSize => {
        results.used = usedSize;
        deviceStorage.freeSpace().then(freeSize => {
          results.free = freeSize;
          results.total = usedSize + freeSize;
          DeviceStorageHelper.showFormatedSizeOfUsedAndTotal(
            element,
            'usedOfTotal',
            results
          );

          if (freeSize <= MIN_SIZE) {
            element.parentNode.setAttribute('data-state', 'no-space');
          } else {
            element.parentNode.removeAttribute('data-state');
          }
          if (type === 'sdcard1') {
            DeviceStorageHelper.showFormatedSize(
              elements.headerSdcardSize,
              'storage-name-external-0-size',
              results.total
            );
          } else {
            sizeList[type] = results.total;
            updateSystemSize();
          }
        });
      });
    };

    const updateStorageInfo = function updateStorageInfo() {
      SettingsDBCache.getSetting('ums.enabled').then(value => {
        l10n.setAttributes(
          elements.usbStorageDesc,
          value ? 'enabled' : 'disabled'
        );
      });
      updateStorageSize(
        ApiManager.getDeviceStorages('sdcard')[0],
        elements.mediaInternalDesc,
        'sdcard'
      );
      updateStorageSize(
        ApiManager.getDeviceStorage('apps'),
        elements.appStorageDesc,
        'apps'
      );

      if (ApiManager.getDeviceStorages('sdcard').length > 1) {
        ApiManager.getDeviceStorages('sdcard')[1]
          .available()
          .then(value => {
            if (value === 'available') {
              elements.mediaSdcardHeader.classList.remove('hidden');
              elements.mediaSdcard.classList.remove('hidden');
              elements.locationItem.classList.remove('none-select');
              elements.locationItem.removeAttribute('aria-disabled');
              updateStorageSize(
                ApiManager.getDeviceStorages('sdcard')[1],
                elements.mediaSdcardDesc,
                'sdcard1'
              );
              window.dispatchEvent(new CustomEvent('refresh'));
            } else {
              elements.locationItem.classList.add('none-select');
              elements.locationItem.setAttribute('aria-disabled', true);
            }
          });
      }
    };

    function newListItem(account) {
      const name = document.createElement('span');
      name.textContent = account.accountId;
      name.classList.add('full-string');

      const a = document.createElement('a');
      a.appendChild(name);
      a.classList.add('menu-item');

      // Create list item
      const li = document.createElement('li');
      li.appendChild(a);

      // Bind connection callback
      li.onclick = () => {
        Settings.setCurrentPanel('add_account_settings', {
          account
        });
      };
      return li;
    }

    function checkObjectArray(arr1, arr2) {
      if (arr1.length !== arr2.length) {
        return false;
      }
      // eslint-disable-next-line
      for (let i = 0; i < arr1.length; i++) {
        if (typeof arr1[i] !== typeof arr2[i]) {
          return false;
        } else if (JSON.stringify(arr1[i]) !== JSON.stringify(arr2[i])) {
          return false;
        }
      }
      return true;
    }

    const updateAccountInfo = function updateAccountInfo() {
      // This function will update kai account relate UI
      AccountHelper.getAccountInfo(['kaiaccount']).then(result => {
        if (result.length > 0) {
          const kaiInfo = result[0].userData;
          elements.kaiAccountDesc.textContent = kaiInfo.phone
            ? kaiInfo.phone
            : kaiInfo.email;
          elements.antiTheftItem.removeAttribute('aria-disabled');
          elements.antiTheftItem.classList.remove('none-select');
          elements.antiTheftNote1.classList.remove('hidden');
          elements.antiTheftNote2.classList.remove('hidden');
        } else {
          elements.kaiAccountDesc.textContent = l10n.get(
            'kaios-account-not-sign-in'
          );
          elements.antiTheftItem.setAttribute('aria-disabled', true);
          elements.antiTheftItem.classList.add('none-select');
          elements.antiTheftNote1.classList.add('hidden');
          elements.antiTheftNote2.classList.add('hidden');
        }
      });
      AccountHelper.getAccountInfo(['activesync', 'google']).then(result => {
        if (checkObjectArray(otherAccountInfo, result)) {
          return;
        }
        otherAccountInfo = result;
        const list = elements.otherAccounts.querySelectorAll('li');
        const len = list.length;
        // eslint-disable-next-line
        for (let i = len - 2; i >= 0; i--) {
          elements.otherAccounts.removeChild(list[i]);
        }
        for (const account of result) {
          DebugHelper.debug(`getAccounts: ${JSON.stringify(account)}`);
          const listItem = newListItem(account);
          elements.otherAccounts.insertBefore(
            listItem,
            elements.addAccountButton
          );
        }
        window.dispatchEvent(new CustomEvent('refresh'));
      });
    };

    const updateDesc = function updateDesc(value, key) {
      let l10nValue = null;
      switch (key) {
        case AIRPLANE_STATUS:
          airplaneHelper.status = value;
          if (value === 'disabled' || value === 'enabled') {
            elements.airplaneMenuItem.classList.remove('none-select');
            elements.airplaneMenuItem.removeAttribute('aria-disabled');
          } else {
            elements.airplaneMenuItem.classList.add('none-select');
            elements.airplaneMenuItem.setAttribute('aria-disabled', true);
          }
          updateTelephonyItems();
          Customization.updateUI(['hotspot']);

          break;
        case WIFI_KEY:
          l10nValue = value ? 'on' : 'off';
          elements.wifiDesc.setAttribute('data-l10n-id', l10nValue);
          break;
        case BLUETOOTH_KEY:
          l10nValue = value ? 'on' : 'off';
          elements.bluetoothDesc.setAttribute('data-l10n-id', l10nValue);
          break;
        case DEVELOPER_KEY:
          elements.developerItem.classList.toggle('hidden', !value);
          break;
        default:
          break;
      }
    };

    const updateAirplaneInfo = function updateAirplaneInfo(value, key) {
      updateDesc(value, key);
      if (value === 'disabled' || value === 'enabled') {
        ToastHelper.changeSaved();
      }
    };

    function disableItems(disabled, itemIds) {
      for (let id = 0; id < itemIds.length; id++) {
        const item = document.getElementById(itemIds[id]);
        if (!item) {
          continue;
        }
        if (disabled) {
          item.setAttribute('aria-disabled', true);
          item.classList.add('none-select');
        } else {
          item.removeAttribute('aria-disabled');
          item.classList.remove('none-select');
        }
      }
    }

    function removeItemHref(itemIds) {
      itemIds.forEach(id => {
        const item = document.getElementById(id);
        item.removeAttribute('aria-disabled');
        item.classList.remove('none-select');
      });
    }

    function showICCCardDetails(details) {
      const itemIds = [
        'call-desc',
        'internetSharing-desc',
        'cell-broadcast-desc'
      ];

      for (let id = 0; id < itemIds.length; id++) {
        const desc = document.getElementById(itemIds[id]);
        if (!desc) {
          continue;
        }
        desc.style.fontStyle = 'italic';

        if (details !== '') {
          desc.setAttribute('data-l10n-id', details);
        } else {
          desc.removeAttribute('data-l10n-id');
          desc.textContent = '';
        }
      }
    }

    function updateTelephonyItems() {
      if (typeof SimCardHelper === Constants.UNDEFINED) {
        window.addEventListener(
          'sim-card-ready',
          () => {
            if (!SimCardHelper.hasValidCard()) {
              return;
            }
            updateTelephonyItems();
          },
          { once: true }
        );
        return;
      }
      if (!SimCardHelper.hasValidCard()) {
        return;
      }
      let itemIds = null;
      let dualCardItemIds = null;
      const airplaneEnabled = airplaneHelper.status !== 'disabled' || false;
      const isSupportDualLte = DeviceFeature.getValue('dualLte') === 'true';
      const currentCapability = SimCardHelper.getImsCapability();
      const capabilityEnabled =
        currentCapability === 'voice-over-wifi' ||
        currentCapability === 'video-over-wifi';

      if (SimCardHelper.hasValidCard()) {
        if (airplaneHelper.status === null) {
          return;
        }

        if (airplaneEnabled) {
          itemIds = ['data-connectivity', 'sim-manager-settings'];
          disableItems(true, itemIds);
          itemIds = [
            'call-settings',
            'wireless-emergency-alert',
            'cell-broadcast-entry'
          ];
          disableItems(!capabilityEnabled, itemIds);

          itemIds = ['volte-settings'];
          if (isSupportDualLte) {
            removeItemHref(itemIds);
          } else {
            disableItems(false, itemIds);
          }
        } else {
          itemIds = ['wireless-emergency-alert'];
          disableItems(false, itemIds);

          if (SimCardHelper.isDoubleSimSlot()) {
            const iccCard1 = SimCardHelper.getIccInfo(0);
            const iccCard2 = SimCardHelper.getIccInfo(1);
            const cardReady =
              (iccCard1 && iccCard1.cardState === 'ready') ||
              (iccCard2 && iccCard2.cardState === 'ready');
            if (!cardReady) {
              itemIds = [
                'sim-manager-settings',
                'data-connectivity',
                'call-settings',
                'cell-broadcast-entry',
                'volte-settings'
              ];
              disableItems(true, itemIds);
              return;
            }

            if (isSupportDualLte) {
              itemIds = [
                'call-settings',
                'cell-broadcast-entry',
                'volte-settings'
              ];
              dualCardItemIds = ['sim-manager-settings', 'data-connectivity'];
            } else {
              itemIds = ['call-settings', 'cell-broadcast-entry'];
              dualCardItemIds = [
                'sim-manager-settings',
                'data-connectivity',
                'volte-settings'
              ];
            }
            showICCCardDetails('');
            removeItemHref(itemIds);
            disableItems(false, dualCardItemIds);
          } else {
            // Single ICC card device.
            itemIds = [
              'call-settings',
              'data-connectivity',
              'volte-settings',
              'cell-broadcast-entry',
              'sim-manager-settings'
            ];

            const { cardState } = SimCardHelper.getIccInfo(0);
            const cardReady = cardState === 'ready';
            disableItems(!cardReady, itemIds);
            if (cardReady) {
              showICCCardDetails('');
            } else {
              showICCCardDetails(SimCardHelper.getCardDes(cardState));
            }
          }
        }
      } else {
        itemIds = ['wireless-emergency-alert'];
        disableItems(airplaneEnabled, itemIds);
        showICCCardDetails(SimCardHelper.getCardDes('absent'));
      }
    }

    function updateAntiTheft() {
      const enabled = elements.antiTheftSelect.value === 'true' || false;
      if (!enabled) {
        ActivityHelper.start({
          name: 'account-manager',
          data: {
            authenticatorId: 'kaiaccount',
            action: 'showOtherPage',
            publicKey: AccountHelper.publicKey,
            flow: 'checkPassword',
            args: [AccountHelper.kaiAccountInfo.userData, 'disableAntitheft']
          }
        }).then(
          response => {
            AccountHelper.decryptKey(response).then(result => {
              if (result && result.result === 'success') {
                SettingsDBCache.saveSettings({ [ANTI_THEFT_KEY]: enabled });
                ToastHelper.showToast('changessaved');
              } else {
                elements.antiTheftSelect.value = true;
              }
            });
          },
          err => {
            DebugHelper.log(`disableAntitheft error${JSON.stringify(err)}`);
            elements.antiTheftSelect.value = !enabled;
          }
        );
      } else {
        ToastHelper.showToast('changessaved');
        SettingsDBCache.saveSettings({ [ANTI_THEFT_KEY]: true });
      }
    }

    return SettingsPanel({
      onInit: function onInit(panel) {
        RootManager.init();
        elements = {
          rootTabs: panel.querySelector('#root-tab'),
          airplaneMenuItem: panel.querySelector('#airplane_mode_switch'),
          airplaneSelect: panel.querySelector('#airplane-mode-select'),
          wifiDesc: panel.querySelector('#wifi-desc'),
          bluetoothDesc: panel.querySelector('#bluetooth-desc'),
          nfcItem: panel.querySelector('#nfc-settings'),
          batteryDesc: panel.querySelector('#main-battery-desc'),
          cleanUpButton: panel.querySelector('.clean-up'),
          usbStorageDesc: panel.querySelector('#menu-usb-storage small'),
          locationItem: panel.querySelector('#location-item'),
          headerInternalSize: panel.querySelector('#header-internal-size'),
          mediaInternal: panel.querySelector('#storage-media-internal'),
          mediaInternalDesc: panel.querySelector('#media-internal-desc'),
          applicationItem: panel.querySelector('#storage-application'),
          appStorageDesc: panel.querySelector('#application-storage-desc'),
          systemStorageDesc: panel.querySelector('#system-storage-desc'),
          mediaSdcardHeader: panel.querySelector('#media-sdcard-header'),
          headerSdcardSize: panel.querySelector('#header-sdcard-size'),
          mediaSdcard: panel.querySelector('#storage-media-sdcard'),
          mediaSdcardDesc: panel.querySelector('#media-sdcard-desc'),
          developerItem: panel.querySelector('#developer-settings'),
          answerModeItem: panel.querySelector('#answer-mode-settings'),
          kaiAccountItem: panel.querySelector('#kai-account-item'),
          kaiAccountDesc: panel.querySelector('#kai-account-item small'),
          antiTheftItem: panel.querySelector('#anti-theft-item'),
          antiTheftSelect: panel.querySelector('#anti-theft-select'),
          antiTheftNote1: panel.querySelector('#anti-theft-note1'),
          antiTheftNote2: panel.querySelector('#anti-theft-note2'),
          otherAccounts: panel.querySelector('#other-accounts'),
          addAccountButton: panel.querySelector('#add-account-button')
        };

        elements.cleanUpButton.onclick = () => {
          Settings.setCurrentPanel('application_storage', {
            originHref: '#root'
          });
        };
        elements.applicationItem.onclick = () => {
          Settings.setCurrentPanel('application_storage', {
            originHref: '#root'
          });
        };
        elements.locationItem.onclick = evt => {
          const { target } = evt;
          if (
            target.id === 'location-item' &&
            !elements.locationItem.hasAttribute('aria-disabled')
          ) {
            const locationConfig = {
              title: {
                id: 'confirmation',
                args: {}
              },
              body: {
                id: 'change-default-media-location-confirmation',
                args: {}
              },
              cancel: {
                name: 'Cancel',
                l10nId: 'cancel',
                priority: 1
              },
              confirm: {
                name: 'Change',
                l10nId: 'change',
                priority: 3,
                callback() {
                  const select = elements.locationItem.querySelector('select');
                  select.focus();
                }
              }
            };
            DialogHelper.show(locationConfig);
          }
        };
        elements.mediaInternal.onclick = () => {
          Settings.setCurrentPanel('media_storage', {
            originHref: '#root',
            type: 'sdcard'
          });
        };
        elements.mediaSdcard.onclick = () => {
          Settings.setCurrentPanel('media_storage', {
            originHref: '#root',
            type: 'sdcard1'
          });
        };

        DeviceFeature.ready(() => {
          const size = DeviceFeature.getValue('totalSize');
          const totalSize = parseInt(size, 10);
          DeviceStorageHelper.showFormatedSize(
            elements.headerInternalSize,
            'storage-name-internal-size',
            totalSize
          );
          sizeList.total = totalSize;
          updateSystemSize();
        });

        Customization.addListener(ROOT_SETTINGS_UI_LIST);

        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsDBCache.getSetting(AIRPLANE_STATUS).then(value => {
          updateDesc(value, AIRPLANE_STATUS);
        });
        SettingsDBCache.observe(WIFI_KEY, true, updateDesc);
        SettingsDBCache.observe(BLUETOOTH_KEY, true, updateDesc);
        SettingsDBCache.observe(DEVELOPER_KEY, true, updateDesc);
        if (ApiManager.nfc) {
          elements.nfcItem.classList.remove('hidden');
        }
        DeviceFeature.ready(() => {
          if (DeviceFeature.getValue('flipDevice') === 'true') {
            elements.answerModeItem.classList.remove('hidden');
          } else {
            elements.answerModeItem.classList.add('hidden');
          }
        });
        Battery.observe('level', updateBatteryInfo);
        Battery.observe('state', updateBatteryInfo);
        SettingsDBCache.observe(AIRPLANE_STATUS, '', updateAirplaneInfo, true);
        elements.kaiAccountItem.onclick = () => {
          if (ConnectionHelper.isOffline()) {
            ActivityHelper.start({ name: 'offline-dialog' });
          }
          if (AccountHelper.kaiAccountLogin) {
            Settings.setCurrentPanel('kaios_account_login');
          } else {
            Settings.setCurrentPanel('kaios_account');
          }
        };
        AccountHelper.addObserve();
        SettingsDBCache.observe(ANTI_THEFT_KEY, false, value => {
          antiTheftValue = value || true;
          elements.antiTheftSelect.value = value;
        });
        elements.antiTheftItem.onclick = evt => {
          const { target } = evt;
          if (target.id === 'anti-theft-item') {
            if (!target.hasAttribute('aria-disabled')) {
              if (ConnectionHelper.isOffline()) {
                ActivityHelper.start({ name: 'offline-dialog' });
              } else {
                elements.antiTheftSelect.focus();
              }
            }
          }
        };
        elements.antiTheftSelect.addEventListener('change', () => {
          // eslint-disable-next-line
          if (antiTheftValue == elements.antiTheftSelect.value) {
            return;
          }
          updateAntiTheft();
        });
        elements.addAccountButton.onclick = () => {
          Settings.setCurrentPanel('add_account_list');
        };
        const listElements = panel.querySelectorAll('.root li');
        ListFocusHelper.addEventListener(listElements);
        if (document.activeElement.tagName === 'BODY') {
          panel.querySelector('.focus').focus();
        }
      },

      onBeforeShow: function onBeforeShow() {
        // Root panel will not call onBeforeHide and onHide
        elements.rootTabs.select(elements.rootTabs.selected);
        DeviceFeature.ready(() => {
          Customization.initUIForItem([
            'airplane',
            'wifi',
            'bluetooth',
            'geolocation',
            'volte',
            'hotspot'
          ]);
        });
        updateTelephonyItems();
        updateBatteryInfo();
        updateStorageInfo();
        updateAccountInfo();
      },

      onShow: function onShow(panel) {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        ListFocusHelper.updateSoftkey(panel);
      }
    });
  };
});

