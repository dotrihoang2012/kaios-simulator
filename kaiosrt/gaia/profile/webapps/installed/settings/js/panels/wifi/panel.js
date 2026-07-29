/**
 * WifiWps is a module that can help you manipulate wps related stuffs easily.
 *
 * @module WifiWps
 */
/* global WifiHelper */

// eslint-disable-next-line
define('panels/wifi/wifi_wps',['require'],function(require) {
  const wifiManager = WifiHelper.getWifiManager();

  const WifiWps = () => {
    const wifiWps = {
      /**
       * A flag to make sure whether we are manipulating wps.
       *
       * @type {Boolean}
       * @default false
       */
      inProgress: false,
      /**
       * An array used to keep registered listeners for statusReset event.
       *
       * @type {Array}
       * @default []
       */
      statusResetEventListeners: [],
      /**
       * A method to trigger all registered handlers
       *
       * @type {Function}
       */
      statusReset() {
        this.statusResetEventListeners.forEach(handler => {
          handler();
        });
      },
      /**
       * Put necessary information about wps (ssid, method, pin) to connect
       * to specific wps.
       *
       * @param {Object} options
       */
      connect(options) {
        let req = null;

        const emptyFunc = () => {};
        const onSuccess = options.onSuccess || emptyFunc;
        const onError = options.onError || emptyFunc;

        const bssid = options.selectedAp;
        const method = options.selectedMethod;
        const { pin } = options;

        if (method === 'pbc') {
          req = wifiManager.wps({
            method: 'pbc'
          });
        } else if (method === 'myPin') {
          req = wifiManager.wps({
            method: 'pin',
            bssid
          });
        } else {
          req = wifiManager.wps({
            method: 'pin',
            bssid,
            pin
          });
        }

        req.onsuccess = () => {
          if (method === 'myPin') {
            this.showAlertDialog('wpsPinInput', { pin: req.result });
          }
          this.inProgress = true;
          onSuccess();
        };

        req.onerror = () => {
          onError(req.error);
        };
      },
      showAlertDialog(l10n, args) {
        const dialogConfig = {
          title: { id: 'settings', args: {} },
          body: { id: l10n, args },
          accept: {
            l10nId: 'ok',
            priority: 2,
            callback: () => {
              DialogHelper.destroy();
            }
          }
        };
        DialogHelper.show(dialogConfig);
      },
      /**
       * Cancel current wps operation and will call your onSuccess / onError
       * callback when operation is done.
       *
       * @memberOf WifiWps
       * @param {Object} options
       */
      cancel(options) {
        const emptyFunc = () => {};
        const onError = options.onError || emptyFunc;
        const onSuccess = options.onSuccess || emptyFunc;

        const req = wifiManager.wps({
          method: 'cancel'
        });

        req.onsuccess = () => {
          this.inProgress = false;
          this.statusReset();
          onSuccess();
        };

        req.onerror = () => {
          onError(req.error);
        };
      },
      /**
       * You can add your listeners when `statusreset` event is triggered.
       *
       * @memberOf WifiWps
       * @param {String} eventName
       * @param {Function} callback
       */
      addEventListener(eventName, callback) {
        if (eventName === 'statusreset') {
          this.statusResetEventListeners.push(callback);
        }
      },
      /**
       * Remove catched listener about `statusreset` event.
       *
       * @memberOf WifiWps
       * @param {String} eventName
       * @param {Function} callback
       */
      removeEventListener(eventName, callback) {
        if (eventName === 'statusreset') {
          const index = this.statusResetEventListeners.indexOf(callback);
          if (index >= 0) {
            this.statusResetEventListeners.splice(index, 1);
          }
        }
      }
    };
    return wifiWps;
  };

  return WifiWps;
});

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

/**
 * WifiUtils is a utils-box that keeps wifi-operations needed utils.
 *
 * @module WifiUtils
 */
define('modules/wifi/wifi_utils',['require'],function(require) {
  'use strict';

  var wifiManager = WifiHelper.getWifiManager();

  var WifiUtils = {
    wlanEnabled: false,
    toggleLogin: false,
    /**
     * Create an explanatory list item
     *
     * @memberOf WifiUtils
     * @param {String} message
     * @returns {HTMLLIElement}
     */
    newExplanationItem: function(message) {
      var li = document.createElement('li');
      li.className = 'explanation';
      li.setAttribute('data-l10n-id', message);
      return li;
    },

    _convertWifiNetworkToJSON: function(aNetwork) {
      let json = {};

      for (let key in aNetwork) {
        if (aNetwork[key] != undefined) {
          json[key] = aNetwork[key];
        }
      }
      return json;
    },

    /**
     * Create a network list item
     *
     * @memberOf WifiUtils
     * @param {Object} options
     * @returns {HTMLLIElement}
     */
    newListItem: function(options) {
      /**
       * A Wi-Fi list item has the following HTML structure:
       *   <li>
       *     <aside class="pack-end wifi-icon level-[?] [secured]"></aside>
       *     <a>
       *       <span> Network SSID </span>
       *       <small> Network Security </small>
       *     </a>
       *   </li>
       */
      var network = options.network;
      var showNotInRange = options.showNotInRange || false;
      var onClick = options.onClick || function() {};
      var knownNetworks = options.knownNetworks;

      // icon
      var icon = document.createElement('div');
      icon.setAttribute('aria-hidden', true);
      icon.classList.add('wifi-icon');
      icon.setAttribute('data-icon', 'wifi-32px');
      var iconLevel = document.createElement('div');
      iconLevel.classList.add('wifi-icon-level');
      var level = Math.min(Math.floor(network.relSignalStrength / 20), 4);
      iconLevel.setAttribute('singal-level', level);
      icon.appendChild(iconLevel);

      // ssid
      var ssid = document.createElement('span');
      ssid.textContent = network.ssid;
      ssid.classList.add('ssid');

      // supported authentication methods
      var small = document.createElement('small');
      var keys = WifiHelper.getSecurity(network);
      var networkNotInRange = (network.known && level === 0);
      var hasSecurity = (keys && keys.length);
      var keyManage = WifiHelper.getKeyManagement(network);

      if (hasSecurity) {
        if (showNotInRange && networkNotInRange) {
          small.setAttribute('data-l10n-id', 'notInRange');
        } else if ('OPEN' === keyManage) {
          small.setAttribute('data-l10n-id', 'securityOpen');
        } else {
          l10n.setAttributes(small, 'securedBy', {
            capabilities: l10n.get(keyManage)
          });
        }
        icon.classList.toggle('secured', 'OPEN' !== keyManage)
      } else {
        if (showNotInRange && networkNotInRange) {
          small.setAttribute('data-l10n-id', 'notInRange');
        } else {
          small.setAttribute('data-l10n-id', 'securityOpen');
        }
      }

      var a = document.createElement('a');

      a.appendChild(ssid);
      a.appendChild(small);

      // create list item
      var li = document.createElement('li');
      li.setAttribute('role', 'menuitem');
      li.dataset.ssid = network.ssid;
      li.appendChild(icon);
      li.appendChild(a);

      var networkObj = this._convertWifiNetworkToJSON(network);
      li.dataset.network = JSON.stringify(networkObj);

      var connectFlag = false;
      // Show connection status
      icon.classList.add('wifi-signal');
      if (WifiHelper.isConnected(network)) {
        if (network.hasInternet) {
          small.setAttribute('data-l10n-id', 'shortStatus-connected');
        } else if (network.captivePortalDetected) {
          small.setAttribute('data-l10n-id', 'shortStatus-captive-connected');
          icon.classList.add('nointernet');
        } else {
          small.setAttribute('data-l10n-id',
            'shortStatus-connected-no-internet');
          icon.classList.add('nointernet');
        }

        icon.classList.add('connected');
        li.classList.add('active');
        connectFlag = true;
      }

      var disconnectFlag = false;
      var wifiList = document.querySelector('ul.wifi-availableNetworks');
      if (knownNetworks && showNotInRange && !connectFlag) {
        for (var i = 0; i < knownNetworks.length; ++i) {
          if (knownNetworks[i].ssid === network.ssid &&
            knownNetworks[i].security === network.security) {
            if (knownNetworks[i].ssid !== wifiList.dataset.ssid) {
              small.setAttribute('data-l10n-id', 'shortStatus-disconnected');
            }
            disconnectFlag = true;
            break;
          }
        }
      }

      if (!connectFlag && !disconnectFlag
        && (network.security === 'WAPI-PSK'
          || network.security === 'WAPI-CERT')) {
        a.href = "#wifi_auth_wapi";
      } else {
        // bind connection callback
        a.onclick = e => {
          onClick(network);
          e.stopPropagation();
        };
      }

      li.classList.add('wifi');

      return li;
    },

    getSimNum: function(elements) {
      var retVal = 1;
      var _conns = navigator.b2g.mobileConnections;
      var authenticate =
        elements.panel.querySelector('select[name="authenticate"]');

      if (_conns && _conns.length > 1 &&
        ((!_conns[0].iccId && _conns[1].iccId) ||
        (_conns[0].iccId && _conns[1].iccId &&
        authenticate.value === 'SIM2'))) {
        retVal = 2;
      }

      return retVal;
    },

    getCarrierName: function(elements) {
      var _conns = navigator.b2g.mobileConnections;
      if (!_conns || _conns.length <= 1) {
        return;
      }

      if (!_conns[0].iccId || !_conns[1].iccId) {
        return;
      }

      var domNodes =
        elements.panel.querySelectorAll('[name="authenticate"] option');

      Array.prototype.forEach.call(_conns, function(conn, index) {
        var operatorInfos = MobileOperator.userFacingInfo(conn);
        if (operatorInfos.operator) {
          l10n.setAttributes(domNodes[index], 'sim-carrier-ext', {
            index: index + 1,
            carrierName: operatorInfos.operator
          });
        }
        else {
          l10n.setAttributes(domNodes[index],
            'sim-nocarrier-ext', {
            index: index + 1
          });
        }
      });
    },

    /**
     * Change dialog layout based on dialogId and security
     *
     * @memberOf WifiUtils
     * @param {HTMLElement} panel
     * @param {String} security
     */
    changeDisplay: function(panel, security) {
      var eap = panel.querySelector('li.eap select');
      var authenticate = panel.querySelector('li.authenticate select')
      var identity = panel.querySelector('input[name=identity]');
      var password = panel.querySelector('input[name=password]');
      var showPassword = panel.querySelector('input[name=show-pwd]');
      var authPhase2 = panel.querySelector('li.auth-phase2 select');
      var certificate = panel.querySelector('li.server-certificate select');
      var keyIndex = panel.querySelector('li.key-index select');
      var hexMode = panel.querySelector('li.hexmode');
      var certificateASU = panel.querySelector('li.ASU-Certificate');
      var certificateUser = panel.querySelector('li.User-Certificate');
      var securityWifi = panel.querySelector('li.wifi-security');
      var signalStrength = panel.querySelector('li.wifi-signal-strength');

      var conns = window.navigator.b2g.mobileConnections;
      var conditions =
        conns && conns.length > 1 && conns[0].iccId && conns[1].iccId
      var isMulti = conditions ? true : false;

      hexMode.classList.add('hidden');
      certificateASU.classList.add('hidden');
      certificateUser.classList.add('hidden');

      if (signalStrength && securityWifi) {
        securityWifi.classList.remove('hidden');
        signalStrength.classList.remove('hidden');
      }

      if (security === 'WPA-EAP') {
        eap.parentNode.parentNode.classList.remove('hidden');
        if (eap) {
          switch (eap.value) {
            case 'SIM':
            case 'AKA':
            case "AKA'":
              authenticate.parentNode.parentNode.classList.toggle(
                'hidden',
                !(isMulti && eap.value === 'SIM')
              )
              identity.parentNode.classList.add('hidden');
              password.parentNode.classList.add('hidden');
              showPassword.parentNode.parentNode.classList.add('hidden');
              authPhase2.parentNode.parentNode.classList.add('hidden');
              certificate.parentNode.parentNode.classList.add('hidden');
              break;
            case 'PEAP':
            case 'TLS':
            case 'TTLS':
              authenticate.parentNode.parentNode.classList.add('hidden');
              identity.parentNode.classList.remove('hidden');
              password.parentNode.classList.remove('hidden');
              showPassword.parentNode.parentNode.classList.remove('hidden');
              authPhase2.parentNode.parentNode.classList.remove('hidden');
              certificate.parentNode.parentNode.classList.remove('hidden');
              break;
            default:
              break;
          }
        }
        keyIndex.parentNode.parentNode.classList.add('hidden');
      } else if (security === 'None') {
        authenticate.parentNode.parentNode.classList.add('hidden');
        identity.parentNode.classList.add('hidden');
        password.parentNode.classList.add('hidden');
        showPassword.parentNode.parentNode.classList.add('hidden');
        eap.parentNode.parentNode.classList.add('hidden');
        authPhase2.parentNode.parentNode.classList.add('hidden');
        certificate.parentNode.parentNode.classList.add('hidden');
        keyIndex.parentNode.parentNode.classList.add('hidden');
      } else if (security === 'WEP') {
        authenticate.parentNode.parentNode.classList.add('hidden');
        identity.parentNode.classList.add('hidden');
        password.parentNode.classList.remove('hidden');
        showPassword.parentNode.parentNode.classList.remove('hidden');
        eap.parentNode.parentNode.classList.add('hidden');
        authPhase2.parentNode.parentNode.classList.add('hidden');
        certificate.parentNode.parentNode.classList.add('hidden');
        keyIndex.parentNode.parentNode.classList.remove('hidden');
      } else if (security === 'WAPI-PSK' && this.wlanEnabled) {
        hexMode.classList.remove('hidden');
        authenticate.parentNode.parentNode.classList.add('hidden');
        identity.parentNode.classList.add('hidden');
        password.parentNode.classList.remove('hidden');
        showPassword.parentNode.parentNode.classList.remove('hidden');
        eap.parentNode.parentNode.classList.add('hidden');
        authPhase2.parentNode.parentNode.classList.add('hidden');
        certificate.parentNode.parentNode.classList.add('hidden');
        keyIndex.parentNode.parentNode.classList.add('hidden');
      } else if (security === 'WAPI-CERT' && this.wlanEnabled) {
        certificateASU.classList.remove('hidden');
        certificateUser.classList.remove('hidden');
        authenticate.parentNode.parentNode.classList.add('hidden');
        identity.parentNode.classList.add('hidden');
        password.parentNode.classList.add('hidden');
        showPassword.parentNode.parentNode.classList.add('hidden');
        eap.parentNode.parentNode.classList.add('hidden');
        authPhase2.parentNode.parentNode.classList.add('hidden');
        certificate.parentNode.parentNode.classList.add('hidden');
        keyIndex.parentNode.parentNode.classList.add('hidden');
      } else if (security === 'OPEN' || security === l10n.get('security-none') ||
        security === '') {
        authenticate.parentNode.parentNode.classList.add('hidden');
        identity.parentNode.classList.add('hidden');
        password.parentNode.classList.add('hidden');
        showPassword.parentNode.parentNode.classList.add('hidden');
        eap.parentNode.parentNode.classList.add('hidden');
        authPhase2.parentNode.parentNode.classList.add('hidden');
        certificate.parentNode.parentNode.classList.add('hidden');
        keyIndex.parentNode.parentNode.classList.add('hidden');
      } else {
        authenticate.parentNode.parentNode.classList.add('hidden');
        identity.parentNode.classList.add('hidden');
        password.parentNode.classList.remove('hidden');
        showPassword.parentNode.parentNode.classList.remove('hidden');
        eap.parentNode.parentNode.classList.add('hidden');
        authPhase2.parentNode.parentNode.classList.add('hidden');
        certificate.parentNode.parentNode.classList.add('hidden');
        keyIndex.parentNode.parentNode.classList.add('hidden');
      }
    },

    changePhaseAuth: function(selectItem, eap) {
      for (let i = selectItem.children.length - 1; i >= 0; i--) {
        selectItem.removeChild(selectItem.children[i]);
      }

      let noItem = document.createElement('option');
      noItem.value = 'No';
      noItem.setAttribute('data-l10n-id', 'auth-phase2-no');
      let papItem = document.createElement('option');
      papItem.value = 'PAP';
      papItem.setAttribute('data-l10n-id', 'auth-phase2-pap');
      let maschapItem = document.createElement('option');
      maschapItem.value = 'MSCHAP';
      maschapItem.setAttribute('data-l10n-id', 'auth-phase2-mschap');
      let maschapv2Item = document.createElement('option');
      maschapv2Item.value = 'MSCHAPV2';
      maschapv2Item.setAttribute('data-l10n-id', 'auth-phase2-mschapv2');
      let gtcItem = document.createElement('option');
      gtcItem.value = 'GTC';
      gtcItem.setAttribute('data-l10n-id', 'auth-phase2-gtc');

      selectItem.appendChild(noItem);
      if ('PEAP' !== eap) {
        selectItem.appendChild(papItem);
        selectItem.appendChild(maschapItem);
      }
      selectItem.appendChild(maschapv2Item);
      selectItem.appendChild(gtcItem);
    },

    /**
     * This is used to help us do some initialization works if the panel
     * is auth related.
     *
     * @memberOf WifiUtils
     * @param {String} panel
     * @param {Object} network
     */
    initializeAuthFields: function(panel, network) {
      var key = WifiHelper.getKeyManagement(network);
      var identity = panel.querySelector('input[name=identity]');
      var password = panel.querySelector('input[name=password]');
      var showPassword = panel.querySelector('input[name=show-pwd]');
      var eap = panel.querySelector('li.eap select');
      var phaseAuth = panel.querySelector('li.auth-phase2 select');
      var certificate = panel.querySelector('li.server-certificate select');

      this.updateEapSelectOptions(eap);
      // load needed certificates first
      this.loadImportedCertificateOptions(certificate);
      identity.value = '';
      password.type = 'password';
      password.value = network.password || '';
      showPassword.checked = false;

      showPassword.onchange = function() {
        password.type = this.checked ? 'text' : 'password';
      };

      var checkPassword = function() {
        var enabled = WifiHelper.isValidInput(
          key, password.value, identity.value, eap.value);
        var evt = new CustomEvent('enable-connect-softkey', {
          detail: {
            'enabled': enabled
          }
        });
        window.dispatchEvent(evt);
      };

      this.changePhaseAuth(phaseAuth, eap.value);
      eap.onchange = () => {
        var seckey = panel.dataset.security;
        checkPassword();
        this.changePhaseAuth(phaseAuth, eap.value);
        WifiUtils.changeDisplay(panel, seckey);
        ListFocusHelper.requestFocus(panel, panel.querySelector('li.eap'));
      };

      password.oninput = checkPassword;
      identity.oninput = checkPassword;
      checkPassword();
    },

    /**
     * This is an inner function that used to inject certificates options
     * into select element.
     *
     * @memberOf WifiUtils
     * @param {HTMLSelectElement} select
     */
    loadImportedCertificateOptions: function(select) {
      if (!wifiManager.getImportedCerts) {
        return;
      }

      var certRequest = wifiManager.getImportedCerts();

      certRequest.onsuccess = function() {
        var i;
        var certList = certRequest.result;
        // save the imported server certificates
        var certificateList = certList.ServerCert;

        if (!certificateList) {
          return;
        }

        // reset the option to be <option value="none">--</option> only
        var originLengthOfOptions = select.options.length;
        for (i = 0; i < originLengthOfOptions - 1; i++) {
          select.remove(1);
        }

        for (i = 0; i < certificateList.length; i++) {
          var option = document.createElement('option');
          option.text = certificateList[i];
          option.value = certificateList[i];
          select.add(option, null);
        }
      };

      certRequest.onerror = function() {
        console.warn('getImportedCerts failed');
      };
    },

    updateEapSelectOptions: function(select) {
      var iccids = window.navigator.b2g.iccManager.iccIds;
      if (iccids.length < 1) {
        for (let i = 0, len = select.options.length; i < len; i++) {
          if (select.options[i].value === 'SIM') {
            select.remove(i);
            break;  // DO need break as options.length was updated after remove
          }
        }
        for (let i = 0, len = select.options.length; i < len; i++) {
          if (select.options[i].value === 'AKA') {
            select.remove(i);
            break;
          }
        }
        for (let i = 0, len = select.options.length; i < len; i++) {
          if (select.options[i].value === "AKA'") {
            select.remove(i);
            break;
          }
        }
      }
    },

    /**
     * Updates the icon of the given network
     *
     * @memberOf WifiUtils
     * @param {Object} network
     * @param {Integer} networkSignal
     */
    updateNetworkSignal: function(network, networkSignal) {
      var li = document.querySelector('li[data-ssid="' + network.ssid + '"]');
      var iconLevel = li.querySelector('.wifi-icon-level');

      var level = Math.min(Math.floor(networkSignal / 20), 4);
      iconLevel.setAttribute('singal-level', level);
    },

    /**
     * Get concated networkKey which can be used as identifier
     *
     * @memberOf WifiUtils
     * @param {Object} network
     * @return {String} concated network identifier
     */
    getNetworkKey: function(network) {
      if (!network) {
        return '';
      } else {
        return WifiHelper.getCompositedKey(network);
      }
    },

    updateHasInternetStatus: function(options) {
      options = options || {};
      var listItems = options.listItems;
      var network = options.network;

      if (!network.connected) {
        return;
      }

      var key = this.getNetworkKey(network);
      var listItemDOM = listItems[key];

      if (!listItemDOM) {
        return;
      }

      var wifiIconItem = listItemDOM.querySelector('.wifi-icon');

      if (network.hasInternet) {
        wifiIconItem.classList.remove('nointernet');
        listItemDOM.querySelector('small').setAttribute('data-l10n-id',
          'shortStatus-connected');
      } else {
        wifiIconItem.classList.add('nointernet');
        listItemDOM.querySelector('small').setAttribute('data-l10n-id',
          'shortStatus-connected-no-internet');
      }
    },

    updateCaptiveStatus: function(options) {
      options = options || {};
      var listItems = options.listItems;
      var network = options.network;
      var loginSuccess = options.loginSuccess;

      var key = this.getNetworkKey(network);
      var listItemDOM = listItems[key];
      if (!listItemDOM) {
        return;
      }

      var captiveString = l10n.get('shortStatus-captive-connected');
      var wifiItem = listItemDOM.querySelector('.connected');
      var noInternetItem = listItemDOM.querySelector('.nointernet');
      var smallItem = listItemDOM.querySelector('a small').textContent;

      if (!wifiItem) {
        return;
      }

      if (noInternetItem && loginSuccess === false) {
        listItemDOM.querySelector('small').setAttribute('data-l10n-id',
          'shortStatus-captive-connected');
      } else if (loginSuccess === true && captiveString === smallItem) {
        if (noInternetItem) {
          listItemDOM.querySelector('small').setAttribute('data-l10n-id',
          'shortStatus-connected-no-internet');
        } else {
          listItemDOM.querySelector('small').setAttribute('data-l10n-id',
          'shortStatus-connected');
        }
      }
    },

    /**
     * Reflect incoming network status on related listItem (show different UI)
     *
     * @memberOf WifiUtils
     * @param {Object} options
     * @param {Object} options.listItems - listItems with DOM elements
     * @param {Object} options.activeItemDOM - DOM element for active item
     * @param {Object} options.network - network object
     * @param {Object} options.networkStatus - current status for network
     */
    updateListItemStatus: function(options) {
      options = options || {};
      var listItems = options.listItems;
      var activeItemDOM = options.activeItemDOM;
      var network = options.network;
      var networkStatus = options.networkStatus;

      if (!network || !networkStatus || !listItems) {
        console.log('Please check passing options for updateListItemStatus');
        return;
      }
      var key = this.getNetworkKey(network);
      var listItemDOM = listItems[key];

      if (activeItemDOM && activeItemDOM != listItemDOM) {
        activeItemDOM.classList.remove('active');
        activeItemDOM.querySelector('small').setAttribute('data-l10n-id',
          'shortStatus-disconnected');
        activeItemDOM.querySelector('.wifi-icon').classList.remove(
          'connecting');
        activeItemDOM.querySelector('.wifi-icon').classList.remove('connected');
      }
      if (listItemDOM) {
        listItemDOM.classList.add('active');
        listItemDOM.querySelector('small').removeAttribute('data-l10n-args');

        var wifiIconItem = listItemDOM.querySelector('.wifi-icon');
        var iconLevel = listItemDOM.querySelector('.wifi-icon-level');
        if (networkStatus === 'connected') {
          listItemDOM.querySelector('small').setAttribute('data-l10n-id',
            'shortStatus-connected-no-internet');
          wifiIconItem.classList.add('nointernet');
        } else {
          listItemDOM.querySelector('small').setAttribute('data-l10n-id',
          'shortStatus-' + networkStatus);
        }

        if (networkStatus === 'connecting') {
          wifiIconItem.classList.remove('connected');
          wifiIconItem.classList.add('connecting');
        } else if (networkStatus === 'connected') {
          wifiIconItem.classList.remove('connecting');
          wifiIconItem.classList.add('connected');
        } else if (networkStatus === 'disconnected') {
          listItemDOM.classList.remove('active');
          wifiIconItem.classList.remove('connecting');
          wifiIconItem.classList.remove('connected');
        }
      }
    }
  };

  return WifiUtils;
});

/* global WifiHelper */


// eslint-disable-next-line
define('panels/wifi/panel',['require','modules/settings_panel','panels/wifi/wifi_wps','modules/wifi/wifi_context','modules/wifi/wifi_utils'],function(require) {
  const SettingsPanel = require('modules/settings_panel');
  const WifiWps = require('panels/wifi/wifi_wps');
  const WifiContext = require('modules/wifi/wifi_context');
  const wifiManager = WifiHelper.getWifiManager();
  const WifiUtils = require('modules/wifi/wifi_utils');
  return function ctorWifi() {
    let elements = null;
    let wifiEnabled = true;
    let wpsBackKey = false;
    let changeWifi = false;

    function onWpsStatusReset() {
      elements.wps.wpsPbcLabelBlock.setAttribute('data-l10n-id', 'wpsMessage');
    }

    return SettingsPanel({
      onInit(panel, options) {
        this.networkListPromise = null;
        this.networks = {};
        this.inProgress = false;
        elements = {
          panel,
          options,
          wifi: panel,
          wifiOn: panel.querySelector('.wifi-on'),
          wifiOff: panel.querySelector('.wifi-off'),
          wpsColumn: panel.querySelector('.wps-column'),
          wpsInfoBlock: panel.querySelector('.wps-column small'),
          wpsPbcLabelBlock: panel.querySelector('.wps-column span'),
          wifiBtn: [].slice.apply(
            panel.querySelectorAll('input[name="wifi-enabled"]')
          ),
          wifiAvailableNetworks: panel.querySelector('.availableNetworks'),
          advancedSettings: panel.querySelector('.advancedSettings'),
          items: panel.querySelectorAll('li')
        };

        if (ActivityHandler.currentActivity) {
          if (ActivityHandler.activityPanelId === 'connectivity_settings') {
            const header = panel.querySelector('gaia-header');
            header.setAttribute('data-href', '#connectivity_settings');
          }
        }

        const wpsColumnSmall = panel.querySelector('.wps-column small');
        wpsColumnSmall.setAttribute(
          'data-l10n-id',
          Customization.getWifiCertifiedStrId(
            'wpsDescription2',
            'wlan-wpsDescription2'
          )
        );
        const headerItem = panel.querySelector('gaia-header h1');
        headerItem.setAttribute(
          'data-l10n-id',
          Customization.getWifiCertifiedStrId('wifi-header', 'wlan-header')
        );

        elements.wps = {
          wpsColumn: elements.wpsColumn,
          wpsInfoBlock: elements.wpsInfoBlock,
          wpsPbcLabelBlock: elements.wpsPbcLabelBlock
        };
        elements.wifiOn.classList.remove('hidden');
        elements.wifiOff.classList.remove('hidden');
        SettingsDBCache.getSetting('wifi.enabled').then(value => {
          const enabled = value;
          wifiEnabled = enabled;
          if (enabled) {
            elements.wifiBtn[0].checked = true;
            this.setSettingsEnabled(enabled);
          } else {
            elements.wifiBtn[1].checked = true;
            elements.wpsColumn.classList.add('hidden');
            elements.wifiAvailableNetworks.classList.add('hidden');
            elements.advancedSettings.classList.add('hidden');
          }
          window.dispatchEvent(new CustomEvent('refresh'));
        });

        SettingsDBCache.observe('settings.wlan.enabled', false, enabled => {
          WifiUtils.wlanEnabled = enabled;
        });

        this.wps = WifiWps();
        // Element related events
        elements.wifiBtn.forEach(checkbox => {
          checkbox.onclick = this.saveWifi.bind(this);
        });

        // WifiContext related events
        WifiContext.addEventListener('wifiEnabled', () => {
          elements.wifiBtn.forEach(btn => {
            btn.disabled = false;
          });
          this.setSettingsEnabled(true);
          this.updateNetworkState(null, true);
          window.dispatchEvent(new CustomEvent('refresh'));
        });

        WifiContext.addEventListener('wifiDisabled', () => {
          elements.wifiBtn.forEach(btn => {
            btn.disabled = false;
          });
          window.dispatchEvent(new CustomEvent('refresh'));
        });

        this.boundWifiEnabled = enabled => {
          wifiEnabled = enabled;
          if (wifiEnabled) {
            elements.wifiBtn[0].checked = true;
          } else {
            elements.wifiBtn[1].checked = true;
          }
          if (enabled) {
            this.updateNetworkState(null, true);
          } else {
            this.setSettingsEnabled(enabled);
          }
        };
        this.handleKeydown = this.handleKeydown.bind(this);
        this.updateNetworkState = this.updateNetworkState.bind(this);
        this.handleFocusChanged = this.handleFocusChanged.bind(this);
      },
      onBeforeShow(panel, options) {
        elements.options = options;
        if (elements.options && elements.options.wpsInfoBlock) {
          this.inProgress = elements.options.inProgress;
          elements.wpsInfoBlock.setAttribute(
            'data-l10n-id',
            options.wpsInfoBlock
          );
          if (options.args) {
            elements.wpsInfoBlock.setAttribute(
              'data-l10n-args',
              JSON.stringify(options.args)
            );
          }

          if (options.succ) {
            elements.wifiAvailableNetworks.children[0].removeAttribute('href');
            elements.advancedSettings.children[0].removeAttribute('href');
          }

          this.updateSoftKeyStop.bind(this)();
        } else {
          elements.wpsInfoBlock.setAttribute(
            'data-l10n-id',
            Customization.getWifiCertifiedStrId(
              'wpsDescription2',
              'wlan-wpsDescription2'
            )
          );
          this.initSoftKey();
        }
        SettingsDBCache.observe(
          'wifi.enabled',
          true,
          this.boundWifiEnabled,
          true
        );
      },

      onShow(panel, options) {
        if (!options.visibilityChange) {
          this.updateEnableHigtlight();
        }
        WifiContext.addEventListener(
          'wifiStatusChange',
          this.updateNetworkState
        );
        this.wps.addEventListener('statusreset', onWpsStatusReset);
        window.addEventListener('keydown', this.handleKeydown, true);
        document.addEventListener('focusChanged', this.handleFocusChanged);
      },
      onBeforeHide() {
        SettingsDBCache.unobserve('wifi.enabled', this.boundWifiEnabled);
        window.removeEventListener('keydown', this.handleKeydown, true);
        document.removeEventListener('focusChanged', this.handleFocusChanged);
      },

      onHide() {
        WifiContext.removeEventListener(
          'wifiStatusChange',
          this.updateNetworkState
        );
        this.wps.removeEventListener('statusreset', onWpsStatusReset);
      },

      handleKeydown(e) {
        let btn = null;
        switch (e.key) {
          case 'Enter':
            if (
              this.inProgress &&
              (elements.panel.querySelector('.focus.availableNetworks') ||
                elements.panel.querySelector('.focus.advancedSettings'))
            ) {
              this.wpsConnectingDialog.bind(this)();
              break;
            }

            btn = elements.panel.querySelector('.focus input');
            if (btn) {
              elements.panel.querySelector('.focus').focus();
              const header = document.querySelectorAll('.current [data-href]');
              const currenId = header[0].getAttribute('data-href');
              setTimeout(() => {
                if (btn.value === 'false' && btn.checked) {
                  /*
                   * When other app enter "Settings Configure Activity",
                   * this page can back normal.
                   */
                  if (currenId === '#connectivity_settings') {
                    Settings.setCurrentPanel('connectivity_settings');
                  }
                }
              }, 500);
            } else if (
              elements.panel
                .querySelector('.focus')
                .classList.contains('wps-column')
            ) {
              this.onWpsColumnClick.bind(this)();
            }
            break;
          case 'BrowserBack':
          case 'Backspace':
            if (NavigationMap.currentActivatedLength <= 0) {
              e.preventDefault();
              e.stopPropagation();
              if (this.inProgress) {
                wpsBackKey = true;
                this.wpsConnectingDialog.bind(this)();
              } else {
                NavigationMap.navigateBack();
              }
            }
            break;
          default:
            break;
        }
      },

      handleFocusChanged() {
        if (
          elements.panel.querySelector('.wps-column.focus') &&
          this.inProgress
        ) {
          this.updateSoftKeyStop.bind(this)();
        } else {
          this.initSoftKey();
        }
      },

      updateEnableHigtlight() {
        if (Settings.isBackHref) {
          return;
        }

        SettingsDBCache.getSetting('wifi.enabled').then(value => {
          const liItem = value ? elements.items[0] : elements.items[1];
          ListFocusHelper.requestFocus(elements.panel, liItem);
        });
      },

      initSoftKey() {
        const softkeyParams = {
          menuClassName: 'menu-button',
          header: {
            l10nId: 'message'
          },
          items: [
            {
              name: 'Select',
              l10nId: 'select',
              priority: 2,
              method() {
                if (Settings.getCurrentPanel() === '#wifi') {
                  const checkbox = elements.panel.querySelector(
                    'li.focus input'
                  );
                  if (checkbox) {
                    checkbox.click();
                  }
                }
              }
            }
          ]
        };
        SettingsSoftkey.init(softkeyParams);
        SettingsSoftkey.show();
      },
      updateSoftKeyStop() {
        const softkeyParams = {
          menuClassName: 'menu-button',
          header: {
            l10nId: 'message'
          },
          items: [
            {
              name: 'Stop',
              l10nId: 'stop',
              priority: 3,
              method: () => {
                this.stopWpsConnect.bind(this)();
              }
            }
          ]
        };
        SettingsSoftkey.init(softkeyParams);
        SettingsSoftkey.show();
      },

      wpsFailedDialog() {
        const dialogConfig = {
          title: {
            id: Customization.getWifiCertifiedStrId(
              'wpsFailedDialogTitle',
              'wlan-wpsFailedDialogTitle'
            ),
            args: {}
          },
          body: {
            id: 'wpsFailedDialogBody',
            args: {}
          },
          accept: {
            l10nId: 'ok',
            priority: 2,
            callback() {
              DialogHelper.destroy();
            }
          }
        };

        DialogHelper.show(dialogConfig);
      },

      wpsConnectingDialog() {
        const dialogConfig = {
          title: {
            id: Customization.getWifiCertifiedStrId(
              'wpsConnectingDialogTitle',
              'wlan-wpsConnectingDialogTitle'
            ),
            args: {}
          },
          body: {
            id: 'wpsConnectingDialogBody',
            args: {}
          },
          backcallback() {
            wpsBackKey = false;
            DialogHelper.destroy();
          },
          cancel: {
            name: 'Yes',
            l10nId: 'yes',
            priority: 1,
            callback: () => {
              this.stopWpsConnect.bind(this)();
            }
          },
          confirm: {
            name: 'No',
            l10nId: 'no',
            priority: 3,
            callback() {
              wpsBackKey = false;
              DialogHelper.destroy();
            }
          }
        };

        DialogHelper.show(dialogConfig);
      },

      updateNetworkState(e, isWifiEnable) {
        // Update network state, called only when wifi enabled.
        const networkStatus = wifiManager.connection.status;
        const { network } = wifiManager.connection;
        const { ssid } = elements.wpsInfoBlock.dataset;
        if (isWifiEnable) {
          this.updateWpsItem();
          return;
        }

        if (this.inProgress) {
          if (networkStatus !== 'disconnected') {
            elements.wpsInfoBlock.setAttribute(
              'data-l10n-id',
              WifiContext.wifiStatusText.id
            );
            if (WifiContext.wifiStatusText.args) {
              elements.wpsInfoBlock.setAttribute(
                'data-l10n-args',
                JSON.stringify(WifiContext.wifiStatusText.args)
              );
            } else {
              elements.wpsInfoBlock.removeAttribute('data-l10n-args');
            }
          }
          if (networkStatus === 'connected') {
            elements.wpsInfoBlock.dataset.ssid = network.ssid;
          }
          if (
            networkStatus === 'connected' ||
            networkStatus === 'wps-timedout' ||
            networkStatus === 'wps-failed' ||
            networkStatus === 'wps-overlapped'
          ) {
            this.inProgress = false;
            elements.wifiAvailableNetworks.children[0].setAttribute(
              'href',
              '#wifi_available_networks'
            );
            elements.advancedSettings.children[0].setAttribute(
              'href',
              '#wifi_advanced_settings'
            );
            if (NavigationMap.currentActivatedLength > 0) {
              DialogHelper.destroy();
            }
            this.wps.statusReset();
            this.initSoftKey();
            if (networkStatus === 'wps-failed') {
              this.wpsFailedDialog();
            }
          }
        } else if (
          networkStatus === 'disconnected' ||
          (networkStatus === 'connected' && ssid !== network.ssid)
        ) {
          this.updateWpsItem();
        }
      },

      updateWpsItem() {
        elements.wpsInfoBlock.dataset.ssid = null;
        elements.wpsInfoBlock.removeAttribute('data-l10n-args');
        elements.wpsPbcLabelBlock.setAttribute('data-l10n-id', 'wpsMessage');
        elements.wpsInfoBlock.setAttribute(
          'data-l10n-id',
          Customization.getWifiCertifiedStrId(
            'wpsDescription2',
            'wlan-wpsDescription2'
          )
        );
      },

      setSettingsEnabled(enabled) {
        if (enabled) {
          /**
           * WifiManager may not be ready (enabled) at this moment.
           * To be responsive, show 'initializing' status and 'search...'
           * first. A 'scan' would be called when wifiManager is enabled.
           */
          elements.wpsColumn.classList.remove('hidden');
          elements.wifiAvailableNetworks.classList.remove('hidden');
          elements.advancedSettings.classList.remove('hidden');
        } else {
          if (this.inProgress) {
            elements.wpsInfoBlock.setAttribute(
              'data-l10n-id',
              WifiContext.wifiStatusText.id
            );
            if (WifiContext.wifiStatusText.args) {
              elements.wpsInfoBlock.setAttribute(
                'data-l10n-args',
                JSON.stringify(WifiContext.wifiStatusText.args)
              );
            } else {
              elements.wpsInfoBlock.removeAttribute('data-l10n-args');
            }
          }
          elements.wpsColumn.classList.add('hidden');
          elements.wifiAvailableNetworks.classList.add('hidden');
          elements.advancedSettings.classList.add('hidden');
        }
        window.dispatchEvent(new CustomEvent('refresh'));
      },

      processHotspotAndUsbTethering(ipt, checked) {
        SettingsDBCache.getSettings(
          ['tethering.wifi.enabled', 'tethering.usb.enabled'],
          results => {
            const wifiHotspot = results['tethering.wifi.enabled'];
            const usbTether = results['tethering.usb.enabled'];
            const cancelPro = () => {
              elements.wifiBtn[0].checked = false;
              elements.items[0].classList.remove('focus');
              elements.wifiBtn[1].checked = true;
              elements.items[1].classList.add('focus');
              elements.items[1].focus();
            };

            if (wifiHotspot || usbTether) {
              let bodyL10n = null;
              if (wifiHotspot) {
                bodyL10n = Customization.getWifiCertifiedStrId(
                  'wifi-hotspot-dialog',
                  'wlan-hotspot-dialog'
                );
              } else if (usbTether) {
                bodyL10n = 'wifi-usb-dialog';
                bodyL10n = Customization.getWifiCertifiedStrId(
                  'wifi-usb-dialog',
                  'wlan-usb-dialog'
                );
              }

              const dialogConfig = {
                title: {
                  id: Customization.getWifiCertifiedStrId('wifi', 'wlan'),
                  args: {}
                },
                body: {
                  id: bodyL10n,
                  args: {}
                },
                cancel: {
                  name: 'Cancel',
                  l10nId: 'cancel',
                  priority: 1,
                  callback() {
                    cancelPro();
                  }
                },
                confirm: {
                  name: 'Turn On',
                  l10nId: 'turnOn',
                  priority: 3,
                  callback: () => {
                    if (wifiHotspot) {
                      SettingsDBCache.saveSettings({
                        'tethering.wifi.enabled': false
                      });
                    } else if (usbTether) {
                      SettingsDBCache.saveSettings({
                        'tethering.usb.enabled': false
                      });
                    }
                    this.saveWifiProcess(ipt, checked);
                  }
                },
                backcallback() {
                  cancelPro();
                }
              };

              DialogHelper.show(dialogConfig);
            } else {
              this.saveWifiProcess(ipt, checked);
            }
          }
        );
      },

      saveWifiProcess(ipt, checked) {
        ipt.checked = true;
        SettingsDBCache.saveSettings({
          'wifi.enabled': checked
        });
        ToastHelper.showToast('changessaved');
        elements.wifiBtn.forEach(btn => {
          btn.disabled = true;
        });
      },

      saveWifi(e) {
        // `this` is Wifi Object
        if (changeWifi) {
          return;
        }
        changeWifi = true;

        setTimeout(() => {
          changeWifi = false;
        }, 500);

        const ipt = e.target;
        const checked = ipt.value === 'true';
        if (wifiEnabled === checked) {
          return;
        }

        if (checked) {
          this.processHotspotAndUsbTethering(ipt, checked);
        } else {
          this.saveWifiProcess(ipt, checked);
        }
      },

      wpsPanelNavigate() {
        if (wpsBackKey) {
          wpsBackKey = false;
          if (ActivityHandler.currentActivity) {
            ActivityHandler.postResult();
          } else {
            Settings.setCurrentPanel('root');
          }
        } else if (elements.panel.querySelector('.focus.availableNetworks')) {
          Settings.setCurrentPanel('wifi_available_networks');
        } else if (elements.panel.querySelector('.focus.advancedSettings')) {
          Settings.setCurrentPanel('wifi_advanced_settings');
        }
      },

      stopWpsConnect() {
        if (this.inProgress) {
          this.wps.cancel({
            onSuccess: () => {
              this.inProgress = false;
              elements.wifiAvailableNetworks.children[0].setAttribute(
                'href',
                '#wifi_available_networks'
              );
              elements.advancedSettings.children[0].setAttribute(
                'href',
                '#wifi_advanced_settings'
              );
              this.initSoftKey();
              elements.wpsInfoBlock.setAttribute(
                'data-l10n-id',
                'fullStatus-wps-canceled'
              );
              this.wpsPanelNavigate();
            },
            onError: error => {
              this.inProgress = false;
              this.initSoftKey();
              l10n.setAttributes(
                elements.wpsInfoBlock,
                'wpsCancelFailedMessageError',
                {
                  error: error.name
                }
              );
            }
          });
        }
      },

      onWpsColumnClick() {
        const small = elements.panel.querySelector('.focus small');

        if (
          small &&
          small.textContent === l10n.get('fullStatus-wps-canceled')
        ) {
          elements.wpsInfoBlock.removeAttribute('data-l10n-args');
          elements.wpsPbcLabelBlock.setAttribute('data-l10n-id', 'wpsMessage');
          elements.wpsInfoBlock.setAttribute(
            'data-l10n-id',
            Customization.getWifiCertifiedStrId(
              'wpsDescription2',
              'wlan-wpsDescription2'
            )
          );
        } else if (!this.inProgress) {
          Settings.setCurrentPanel('#wifi_wps');
        }
      },

      _netWorksList() {
        // Stop auto-scanning if wifi disabled or the app is hidden
        if (!wifiManager.enabled || document.hidden) {
          return;
        }
        if (!this.networkListPromise) {
          this.networkListPromise = new Promise(resolve => {
            const req = WifiHelper.getAvailableAndKnownNetworks();

            req.onsuccess = () => {
              const allNetworks = req.result;
              let network = null;

              for (let i = 0; i < allNetworks.length; ++i) {
                network = allNetworks[i];
                const key = WifiUtils.getNetworkKey(network);
                // Keep connected network first, or select the highest strength
                if (!this.networks[key] || network.connected) {
                  this.networks[key] = network;
                } else if (
                  !this.networks[key].connected &&
                  network.relSignalStrength >
                    this.networks[key].relSignalStrength
                ) {
                  this.networks[key] = network;
                }
              }
              resolve();
            };
          });
        }
        // eslint-disable-next-line
        return this.networkListPromise;
      },
      _getWpsAvailableNetworks() {
        // Get WPS available networks
        const ssids = Object.getOwnPropertyNames(this.networks);
        const wpsAvailableNetworks = [];
        for (let i = 0; i < ssids.length; i++) {
          const network = this.networks[ssids[i]];
          if (WifiHelper.isWpsAvailable(network)) {
            wpsAvailableNetworks.push(network);
          }
        }
        return wpsAvailableNetworks;
      }
    });
  };
});

