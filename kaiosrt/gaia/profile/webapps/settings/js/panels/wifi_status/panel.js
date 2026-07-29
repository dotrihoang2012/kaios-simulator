/**
 * WifiContext is a singleton that you can easily use it to fetch
 * some shared data across different panels
 *
 * @module WifiContext
 */
define('modules/wifi/wifi_context',['require'],function(require) {
  'use strict';

  var wifiManager = WifiHelper.getWifiManager();

  // observed objects
  var _currentNetwork =
    wifiManager && wifiManager.connection && wifiManager.connection.network;

  var WifiContext = {
    /**
     * These listeners would be called when wifi is enabled
     *
     * @memberOf WifiContext
     * @type {Array}
     */
    _wifiEnabledListeners: [],

    /**
     * These listeners would be called when wifi is disabled
     *
     * @memberOf WifiContext
     * @type {Array}
     */
    _wifiDisabledListeners: [],

    /**
     * These listeners would be called when wifi is changed
     *
     * @memberOf WifiContext
     * @type {Array}
     */
    _wifiStatusChangeListeners: [],

    _wifiHasInternetListeners: [],

    _wifiCaptiveListeners: [],

    /**
     * These listeners would be called when
     *   1. localized
     *   2. wifi is enabled
     *   3. wifi is changed
     *   4. wifi is disabled
     *
     * @memberOf WifiContext
     * @type {Array}
     */
    _wifiStatusTextChangeListeners: [],

    /**
     * These listeners would be called when the current wifi
     * information is updated
     *
     * @memberOf WifiContext
     * @type {Array}
     */
    _wifiConnectionInfoUpdateListeners: [],

    /**
     * These listeners would be called when
     *   wifi athentication failed
     *
     * @memberOf WifiContext
     * @type {Array}
     */
    _wifiWrongPasswordListeners: [],

    /**
     * These listeners would be called when
     *   wifi connection failed
     *
     * @memberOf WifiContext
     * @type {Array}
     */
    _wifiConnectingFailedListeners: [],

   /**
     * These listeners would be called when
     *   wifi connection obtaining IP failed
     *
     * @memberOf WifiContext
     * @type {Array}
     */
    _wifiObtainingIPFailedListeners: [],

    /**
     * Desc about customized wifi status
     *
     * @memberOf WifiContext
     * @type {String}
     */
    _wifiStatusText: { id: null },

    /**
     * Mac address
     *
     * @memberOf WifiContext
     * @type {String}
     */
    _macAddress: '',

    /**
     * Init is used to initialize some basic stuffs
     *
     * @memberOf WifiContext
     */
    _init: function() {
      if (!wifiManager) {
        return;
      }

      this._bindEvents();

      // we would call _updateWifi() when init
      this._updateWifi();
    },

    /**
     * We will bind some default listeners here
     *
     * @memberOf WifiContext
     */
    _bindEvents: function() {
      var self = this;
      var _updateWifi = this._updateWifi.bind(this);
      var _updateNetworkStatus = this._updateNetworkStatus.bind(this);

      // make sure we would update anything when wifi got changed
      this._wifiEnabledListeners.push(_updateWifi, _updateNetworkStatus);
      this._wifiDisabledListeners.push(_updateWifi);
      this._wifiStatusChangeListeners.push(_updateWifi);
      // Now register callbacks to track the state of the wifi hardware
      if (wifiManager) {
        wifiManager.onenabled = function(event) {
          self._wifiEnabled(event);
          self._wifiStatusTextChange();
        };

        wifiManager.ondisabled = function(event) {
          self._wifiDisabled(event);
          self._wifiStatusTextChange();
        };

        wifiManager.onstatuschange = function(event) {
          self._updateNetworkStatus(event);
          self._wifiStatusChange.call(self, event);
          self._wifiStatusTextChange();
        };

        wifiManager.onwifihasinternet = function(event) {
          self._wifiHasInternetChange(event);
        };

        wifiManager.oncaptiveportallogin = function(event) {
          self._wifiCaptiveChange(event);
        };

        wifiManager.onconnectioninfoupdate =
          self._wifiConnectionInfoUpdate.bind(self);
      }
    },

    /**
     * We will update mac address, wifiStatus when wifi is updated
     *
     * @memberOf WifiContext
     */
    _updateWifi: function(event) {
      var self = this;

      if (!wifiManager) {
        return;
      }

      // If the MAC address is in the Settings database, it's already
      // displayed in all `MAC address' fields; if not, it will be set as soon
      // as the Wi-Fi is enabled (see `storeMacAddress').
      if (!this._macAddress) {
        SettingsDBCache.getSetting('deviceinfo.mac').then(value=>{
          self._macAddress = value;
        });
      }

      if (wifiManager.enabled) {
        this._storeMacAddress();
      }

      // reflect latest value of wifiStatus
      this._updateWifiStatusText(event);
    },

    /**
     * We will update mac address, wifiStatus when wifi is updated
     *
     * @memberOf WifiContext
     */
    _updateWifiStatusText: function(event) {
      if (wifiManager.enabled) {
        var network = (event && event.network) ? event.network :
          wifiManager.connection.network;
        var status = event ? event.status : wifiManager.connection.status;

        var networkProp = network ? {ssid: network.ssid} : null;
        this._wifiStatusText =
          { id: 'fullStatus-' + status,
            args: networkProp };
      } else {
        this._wifiStatusText =
          { id: 'disabled' };
      }
    },

    /**
     * We need to handle network status when wifi is enabled / wifistatus
     * is changed.
     *
     * _currentNetwork: user activated current network
     * wifiManager.connection.network: system activated current network
     *
     * Main difference between |_currentNetwork| and |wifiManager.connection.
     * network| is that we can't tell if network is known while connecting by
     * |wifiManager.connectiohn.network.known| because it will always be true.
     *
     * Instead, we use |_currentNetwork| to indicate if current connecting
     * network is new or known network.
     *
     * When system connect to network by user's tap on UI, |_currentNetwork|
     * will point to same network as |wifiManager.connection.network|.
     *
     * On the other hand, if system connect to network automatically under
     * conditions like wifi enable, move into AP's range, or reconnect to
     * other network after delete current connected network, |_currentNetwork|
     * will be null, while |wifiManager.connection.network| contains
     * information about current network.
     *
     * @memberOf WifiContext
     */
    _updateNetworkStatus: function(event) {
      if (!_currentNetwork) {
        return;
      }

      if (event && event.network &&
        _currentNetwork.ssid != event.network.ssid) {
        return;
      }

      var networkStatus = event ? event.status : wifiManager.connection.status;
      switch (networkStatus) {
        case 'dhcpfailed':
          this._wifiObtainingIPFailed();
          break;
        case 'authenticationfailed':
          this._wifiWrongPassword();
          // Clear the network saved password
          _currentNetwork.password = null;
          break;
        case 'associationreject':
          this._wifiConnectingFailed();
          break;
        default:
          break;
      }
    },

    handleWifiSettingValue: function() {
      SettingsDBCache.saveSettings({
        'wifi.enabled':  navigator.b2g.wifiManager.enabled
      });
    },

    /**
     * When wifi is enabled, we will make sure the mozSettings is sync
     * with hardward status and call all registered listeners.
     *
     * @memberOf WifiContext
     */
    _wifiEnabled: function(event) {
      this._wifiEnabledListeners.forEach(function(listener) {
        listener(event);
      });
    },

    /**
     * When wifi is disabled, we will make sure the mozSettings is sync
     * with hardward status and call all registered listeners.
     *
     * @memberOf WifiContext
     */
    _wifiDisabled: function(event) {
      this._wifiDisabledListeners.forEach(function(listener) {
        listener(event);
      });
    },

    /**
     * When wifi's status is changed, we will call all registered listeners.
     *
     * @memberOf WifiContext
     */
    _wifiStatusChange: function(event) {
      this._wifiStatusChangeListeners.forEach(function(listener) {
        listener(event);
      });
    },

    _wifiHasInternetChange: function(event) {
      this._wifiHasInternetListeners.forEach(function(listener){
        listener(event);
      });
    },

    _wifiCaptiveChange: function(event) {
      this._wifiCaptiveListeners.forEach(function(listener) {
        listener(event);
      });
    },

    /**
     * When text of wifiStatus is changed, we will call all registered
     * listeners.
     *
     * @memberOf WifiContext
     */
    _wifiStatusTextChange: function() {
      this._wifiStatusTextChangeListeners.forEach(function(listener) {
        listener();
      });
    },

    /**
     * When wifi athentication fails, we will call all registered
     * listeners.
     *
     * @memberOf WifiContext
     */
    _wifiWrongPassword: function() {
      this._wifiWrongPasswordListeners.forEach(function(listener) {
        listener();
      });
    },

    /**
     * When wifi connection fails, we will call all registered
     * listeners.
     *
     * @memberOf WifiContext
     */
    _wifiConnectingFailed: function() {
      this._wifiConnectingFailedListeners.forEach(function(listener) {
        listener();
      });
    },

    /**
     * When wifi connection obtaining IP fails, we will call all registered
     * listeners.
     *
     * @memberOf WifiContext
     */
    _wifiObtainingIPFailed: function() {
      this._wifiObtainingIPFailedListeners.forEach(function(listener) {
        listener();
      });
    },

    /**
     * When wifi's connection is updated, we will call all registered listeners.
     *
     * @memberOf WifiContext
     */
    _wifiConnectionInfoUpdate: function(event) {
      this._wifiConnectionInfoUpdateListeners.forEach(function(listener) {
        listener(event);
      });
    },

    /**
     * Keep mac address in mozSettings
     *
     * @memberOf WifiContext
     */
    _storeMacAddress: function() {
      if (!wifiManager) {
        return;
      }
      // Store the MAC address in the Settings database.  Note: the wifiManager
      // sets macAddress to the string `undefined' when it is not available.
      if (wifiManager.macAddress &&
        wifiManager.macAddress !== this._macAddress &&
          wifiManager.macAddress !== 'undefined') {
            this._macAddress = wifiManager.macAddress;
            SettingsDBCache.saveSettings({ 'deviceinfo.mac': this._macAddress });
      }
    },
    /**
     * This is an internal function that can help us find out the matched
     * callback from catched listeners and remove it
     *
     * @memberOf WifiContext
     * @param {Array} listeners
     * @param {Function} callback
     */
    _removeEventListener: function(listeners, callback) {
      var index = listeners.indexOf(callback);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    },
    /**
     * This is a wrapper of WifiManger.associate to make sure we can handle
     * our internal status at the same time.
     *
     * @memberOf WifiContext
     * @param {Object} network
     * @param {Function} callback
     */
    associateNetwork: function(network, cb) {
      cb = cb || function() {};
      var request = wifiManager.associate(network);
      var done = function() {
        if (!request.error) {
          _currentNetwork = network;
        }
        cb(request.error);
      };
      request.onsuccess = done;
      request.onerror = done;
    },
    /**
     * This is a wrapper of WifiManger.forget to make sure we can handle
     * our internal status at the same time.
     *
     * @memberOf WifiContext
     * @param {Object} network
     * @param {Function} callback
     */
    forgetNetwork: function(network, cb) {
      cb = cb || function() {};
      network.keyManagement = WifiHelper.getKeyManagement(network)
      var request = wifiManager.forget(network);
      var done = function() {
        if (!request.error) {
          _currentNetwork = null;
        }
        cb(request.error);
      };
      request.onsuccess = done;
      request.onerror = done;
    }
  };

  WifiContext._init();

  return {
    addEventListener: function(eventName, callback) {
      if (eventName === 'wifiEnabled') {
        WifiContext._wifiEnabledListeners.push(callback);
      } else if (eventName === 'wifiDisabled') {
        WifiContext._wifiDisabledListeners.push(callback);
      } else if (eventName === 'wifiStatusChange') {
        WifiContext._wifiStatusChangeListeners.push(callback);
      } else if (eventName === 'wifiHasInternet') {
        WifiContext._wifiHasInternetListeners.push(callback);
      } else if (eventName === 'wifiCaptive') {
        WifiContext._wifiCaptiveListeners.push(callback);
      } else if (eventName === 'wifiStatusTextChange') {
        WifiContext._wifiStatusTextChangeListeners.push(callback);
      } else if (eventName === 'wifiWrongPassword') {
        WifiContext._wifiWrongPasswordListeners.push(callback);
      } else if (eventName === 'wifiConnectingFailed') {
        WifiContext._wifiConnectingFailedListeners.push(callback);
      } else if (eventName === 'wifiObtainingIPFailed') {
        WifiContext._wifiObtainingIPFailedListeners.push(callback);
      } else if (eventName === 'wifiConnectionInfoUpdate') {
        WifiContext._wifiConnectionInfoUpdateListeners.push(callback);
      }
    },
    removeEventListener: function(eventName, callback) {
      if (eventName === 'wifiEnabled') {
        WifiContext._removeEventListener(
          WifiContext._wifiEnabledListeners, callback);
      } else if (eventName === 'wifiDisabled') {
        WifiContext._removeEventListener(
          WifiContext._wifiDisabledListeners, callback);
      } else if (eventName === 'wifiStatusChange') {
        WifiContext._removeEventListener(
          WifiContext._wifiStatusChangeListeners, callback);
      } else if (eventName === 'wifiHasInternet') {
        WifiContext._removeEventListener(
          WifiContext._wifiHasInternetListeners, callback);
      } else if (eventName === 'wifiCaptive') {
        WifiContext._removeEventListener(
          WifiContext._wifiCaptiveListeners, callback);
      } else if (eventName === 'wifiStatusTextChange') {
        WifiContext._removeEventListener(
          WifiContext._wifiStatusTextChangeListeners, callback);
      } else if (eventName === 'wifiWrongPassword') {
        WifiContext._removeEventListener(
          WifiContext._wifiWrongPasswordListeners, callback);
      } else if (eventName === 'wifiConnectingFailed') {
        WifiContext._removeEventListener(
          WifiContext._wifiConnectingFailedListeners, callback);
      } else if (eventName === 'wifiObtainingIPFailed') {
        WifiContext._removeEventListener(
          WifiContext._wifiObtainingIPFailedListeners, callback);
      } else if (eventName === 'wifiConnectionInfoUpdate') {
        WifiContext._removeEventListener(
          WifiContext._wifiConnectionInfoUpdateListeners, callback);
      }
    },
    get wifiStatusText() {
      return WifiContext._wifiStatusText;
    },
    get currentNetwork() {
      return _currentNetwork;
    },
    forgetNetwork: WifiContext.forgetNetwork,
    associateNetwork: WifiContext.associateNetwork
  };
});

/* global WifiHelper */

// eslint-disable-next-line
define('panels/wifi_status/panel',['require','modules/wifi/wifi_context','modules/settings_panel'],function(require) {
  const WifiContext = require('modules/wifi/wifi_context');
  const wifiManager = WifiHelper.getWifiManager();
  const SettingsPanel = require('modules/settings_panel');

  return function ctorStatusWifi() {
    let elements = {};

    return SettingsPanel({
      onInit(panel) {
        elements = {};
        elements.panel = panel;
        elements.ip = panel.querySelector('[data-ip]');
        elements.speed = panel.querySelector('[data-speed]');
        elements.ssid = panel.querySelector('[data-ssid]');
        elements.signal = panel.querySelector('[data-signal]');
        elements.security = panel.querySelector('[data-security]');
        elements.forgetNetworkDialog = panel.querySelector('form');
        elements.softkeyFlag = false;
        this.keydownHandler = this.keydownHandler.bind(this);
        this.handleVisibiltychange = this.handleVisibiltychange.bind(this);
        this.onWifiStatusChange = this.onWifiStatusChange.bind(this);
        this.openWrongPasswordDialog = this.openWrongPasswordDialog.bind(this);
        this.openConnetingFailedDialog = this.openConnetingFailedDialog.bind(
          this
        );
        this.openObtainingIPFailedDialog = this.openObtainingIPFailedDialog.bind(
          this
        );
      },
      onBeforeShow(panel, options) {
        this.updateNetworkInfo();
        elements.ssid.textContent = options.network.ssid;
        elements.signal.setAttribute(
          'data-l10n-id',
          `signalLevel${options.sl}`
        );

        const wifiSecurity = elements.panel.querySelector('.wifi-security');
        wifiSecurity.classList.add('hidden');

        const wifiIpAddress = elements.panel.querySelector('.wifi-ip-address');
        const wifiLinkSpeed = elements.panel.querySelector('.wifi-link-speed');
        elements.network = options.network;
        elements.knownNetwork = options.knownNetwork;
        if (options.isConnected) {
          elements.softkeyFlag = false;
          wifiIpAddress.classList.remove('hidden');
          wifiLinkSpeed.classList.remove('hidden');
          this.initSoftKey();
        } else if (options.knownNetwork) {
          elements.softkeyFlag = true;
          wifiIpAddress.classList.add('hidden');
          wifiLinkSpeed.classList.add('hidden');
          wifiSecurity.classList.remove('hidden');
          elements.security.textContent = l10n.get('shortStatus-disconnected');
          this.initSoftKey(true);
        }

        this.wifiStatusPanelAriaDisable(false);
        elements.connectFlag = false;

        wifiManager.onconnectioninfoupdate = this.updateNetworkInfo;
        this.dispatchDialogShowEvent();
        document.addEventListener(
          'visibilitychange',
          this.handleVisibiltychange
        );
        window.addEventListener('keydown', this.keydownHandler, true);
        WifiContext.addEventListener(
          'wifiStatusChange',
          this.onWifiStatusChange
        );
        WifiContext.addEventListener(
          'wifiWrongPassword',
          this.openWrongPasswordDialog
        );
        WifiContext.addEventListener(
          'wifiConnectingFailed',
          this.openConnetingFailedDialog
        );
        WifiContext.addEventListener(
          'wifiObtainingIPFailed',
          this.openObtainingIPFailedDialog
        );
      },
      onBeforeHide() {
        elements.softkeyFlag = false;
        wifiManager.onconnectioninfoupdate = null;
        const evt = new CustomEvent('dialogpanelhide', {
          detail: {
            dialogpanel: `#${elements.panel.id}`
          }
        });
        window.dispatchEvent(evt);
        window.removeEventListener('keydown', this.keydownHandler, true);
        WifiContext.removeEventListener(
          'wifiStatusChange',
          this.onWifiStatusChange
        );
        WifiContext.removeEventListener(
          'wifiWrongPassword',
          this.openWrongPasswordDialog
        );
        WifiContext.removeEventListener(
          'wifiConnectingFailed',
          this.openConnetingFailedDialog
        );
        WifiContext.removeEventListener(
          'wifiObtainingIPFailed',
          this.openObtainingIPFailedDialog
        );
        document.removeEventListener(
          'visibilitychange',
          this.handleVisibiltychange
        );
      },

      onSubmit() {
        return Promise.resolve({
          connectFlag: elements.connectFlag
        });
      },

      keydownHandler(e) {
        switch (e.key) {
          case 'BrowserBack':
          case 'Backspace':
          case 'KanjiMode':
            if (NavigationMap.currentActivatedLength <= 0) {
              e.preventDefault();
              e.stopPropagation();
              if (!elements.connectFlag) {
                NavigationMap.navigateBack();
              }
            }
            break;
          case 'ArrowUp':
          case 'ArrowDown':
            if (elements.connectFlag) {
              this.initSoftKey(false);
            }
            break;
          default:
            break;
        }
      },

      initSoftKey(knownNetwork) {
        const connect = {
          name: 'Connect',
          l10nId: 'device-option-connect',
          priority: 3,
          method: () => {
            elements.connectFlag = true;
            this.initSoftKey(false);
            this.wifiStatusPanelAriaDisable(true);
            this.connectNetwork();
          }
        };

        const forget = {
          name: 'Forget',
          l10nId: 'forget',
          priority: 1,
          method: () => {
            this.showConfirmDialog();
          }
        };

        const softkeyParams = {
          menuClassName: 'menu-button',
          header: {
            l10nId: 'message'
          },
          items: []
        };

        softkeyParams.items.push(forget);
        if (knownNetwork) {
          softkeyParams.items.push(connect);
        }

        SettingsSoftkey.init(softkeyParams);
        SettingsSoftkey.show();
      },

      showNoNetworkDialog() {
        const clearData = () => {
          elements.security.textContent = l10n.get('shortStatus-disconnected');
          elements.connectFlag = false;
          this.initSoftKey(elements.knownNetwork);
          this.wifiStatusPanelAriaDisable(false);
        };

        const dialogConfig = {
          title: {
            id: 'failed-to-connect',
            args: {}
          },
          body: {
            id: 'network-not-found',
            args: {}
          },
          accept: {
            l10nId: 'ok',
            priority: 2,
            callback: () => {
              clearData();
            }
          },
          backcallback: () => {
            clearData();
          }
        };

        DialogHelper.show(dialogConfig);
      },

      connectCallback(error) {
        if (error && error.message === 'network not found') {
          WifiContext.forgetNetwork(elements.network);
          this.showNoNetworkDialog().bind(this);
        }
      },

      connectNetwork() {
        WifiHelper.setPassword({ network: elements.network });
        WifiContext.associateNetwork(
          elements.network,
          this.connectCallback.bind(this)
        );
      },

      showConfirmDialog() {
        const dialogConfig = {
          title: {
            id: 'forgetNetwork-confirmation',
            args: {}
          },
          body: {
            id: 'forgetNetwork-dialog',
            args: {}
          },
          cancel: {
            l10nId: 'cancel',
            priority: 1,
            callback: () => {
              DialogHelper.destroy();
            }
          },
          confirm: {
            l10nId: 'forget',
            priority: 3,
            callback: () => {
              DialogHelper.destroy();
              WifiContext.forgetNetwork(elements.network, () => {
                ToastHelper.showToast('networkforget');
              });
              NavigationMap.navigateBack();
            }
          }
        };
        DialogHelper.show(dialogConfig);
      },
      updateNetworkInfo() {
        const info = wifiManager.connectionInformation || {};
        elements.ip.textContent = info.ipAddress || '';
        l10n.setAttributes(elements.speed, 'linkSpeedMbs', {
          linkSpeed: info.linkSpeed
        });
      },
      handleVisibiltychange() {
        if (!document.hidden) {
          this.initSoftKey(elements.softkeyFlag);
          this.dispatchDialogShowEvent();
        }
      },

      wifiStatusPanelAriaDisable(enabled) {
        const list = elements.panel.querySelectorAll('#wifi_status li');

        for (let i = 0; i < list.length; i++) {
          if (list[i].hidden === false && enabled) {
            list[i].setAttribute('aria-disabled', true);
          } else if (list[i].hidden === false && !enabled) {
            list[i].removeAttribute('aria-disabled');
          }
        }

        const searchStr = '#wifi_status li input';
        const listInput = elements.panel.querySelectorAll(searchStr);

        for (let i = 0; i < listInput.length; i++) {
          if (listInput[i].hidden === false && enabled) {
            listInput[i].setAttribute('disabled', 'disabled');
          } else if (listInput[i].hidden === false && !enabled) {
            listInput[i].removeAttribute('disabled', 'disabled');
          }
        }

        if (enabled) {
          NavigationMap.menuReset(
            elements.panel.querySelector('.focus'),
            false
          );
        }
      },

      onWifiStatusChange(event) {
        const { status } = event;
        if (event.network.ssid !== elements.network.ssid) {
          return;
        }

        if (status === 'connecting' || status === 'associated') {
          elements.panel
            .querySelector('.wifi-security small')
            .setAttribute('data-l10n-id', `shortStatus-${status}`);
        } else if (status === 'connected') {
          this.wifiStatusPanelAriaDisable(false);
          NavigationMap.navigateBack();
          ToastHelper.showToast(
            Customization.getWifiCertifiedStrId(
              'wifi-connected',
              'wlan-connected'
            )
          );
        }
      },

      openWrongPasswordDialog() {
        this.openBadCredentialsDialog('wifi-authentication-failed');
      },

      openConnetingFailedDialog() {
        this.openBadCredentialsDialog('wifi-association-reject');
      },

      openObtainingIPFailedDialog() {
        this.openBadCredentialsDialog('wifi-DHCP-failed');
      },

      openBadCredentialsDialog(bodyId) {
        const { network } = elements;

        const dialogConfig = {
          title: {
            id: 'wifi-bad-credentials-title',
            args: {}
          },
          body: {
            id: bodyId,
            args: {
              ssid: network.ssid
            }
          },
          accept: {
            l10nId: 'ok',
            priority: 2,
            callback: () => {
              DialogHelper.destroy();
              if ('wifi-authentication-failed' === bodyId) {
                NavigationMap.navigateBack();
              }
            }
          }
        };

        elements.security.textContent = l10n.get('shortStatus-disconnected');
        elements.connectFlag = false;
        this.initSoftKey(elements.knownNetwork);
        this.wifiStatusPanelAriaDisable(false);
        DialogHelper.show(dialogConfig);
      },

      dispatchDialogShowEvent() {
        const evt = new CustomEvent('dialogpanelshow', {
          detail: {
            dialogpanel: `#${elements.panel.id}`
          }
        });
        window.dispatchEvent(evt);
      }
    });
  };
});

