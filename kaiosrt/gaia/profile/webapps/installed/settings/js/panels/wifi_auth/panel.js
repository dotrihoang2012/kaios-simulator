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
define('panels/wifi_auth/panel',['require','modules/wifi/wifi_utils','modules/wifi/wifi_context','modules/settings_panel'],function(require) {
  const WifiUtils = require('modules/wifi/wifi_utils');
  const WifiContext = require('modules/wifi/wifi_context');
  const SettingsPanel = require('modules/settings_panel');

  return function ctorWifiAuth() {
    let elements = {};
    let backPrevious = false;
    let self = null;

    function wifiAuthPanelAriaDisable(enabled) {
      const list = elements.panel.querySelectorAll('#wifi_auth li');

      for (let i = 0; i < list.length; i++) {
        if (!list[i].classList.contains('hidden') && enabled) {
          list[i].setAttribute('aria-disabled', true);
        } else if (!list[i].classList.contains('hidden') && !enabled) {
          list[i].removeAttribute('aria-disabled');
        }
      }

      const searchStr = '#wifi_auth li input';
      const listInput = elements.panel.querySelectorAll(searchStr);

      for (let i = 0; i < listInput.length; i++) {
        if (!listInput[i].classList.contains('hidden') && enabled) {
          listInput[i].setAttribute('disabled', 'disabled');
        } else if (!listInput[i].classList.contains('hidden') && !enabled) {
          listInput[i].removeAttribute('disabled', 'disabled');
        }
      }

      if (enabled) {
        NavigationMap.menuReset(elements.panel.querySelector('.focus'), false);
      }
    }

    function connectNetwork() {
      const { network } = elements;
      const key = WifiHelper.getKeyManagement(network);
      const callback = result => {
        if (result && result.message === 'network not found') {
          backPrevious = true;
          NavigationMap.navigateBack();
          self.openBadCredentialsDialog('wifi-association-reject');
        }
      };
      let simCardNum = null;

      switch (key) {
        case 'WEP':
        case 'WPA-PSK':
        case 'WPA-EAP':
        case 'WPA2-PSK':
        case 'WPA/WPA2-PSK':
        case 'SAE':
          if (elements.securityType === 'WPA-EAP') {
            simCardNum = WifiUtils.getSimNum(elements);
          }

          WifiHelper.setPassword({
            network,
            password: elements.password.value,
            identity: elements.identity.value,
            eap: elements.eap.value,
            phase2: elements.authPhase2.value,
            certificate: elements.certificate.value,
            keyIndex: elements.keyIndex.value - 1
          });

          // eslint-disable-next-line
          network.sim_num = simCardNum;
          WifiContext.associateNetwork(network, callback);
          break;
        default:
          WifiContext.associateNetwork(network, callback);
          break;
      }
    }

    function showConfirmDialog() {
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
          callback() {
            DialogHelper.destroy();
            if (backPrevious) {
              NavigationMap.navigateBack();
            }
          }
        },
        confirm: {
          l10nId: 'forget',
          priority: 3,
          callback() {
            DialogHelper.destroy();
            WifiContext.forgetNetwork(elements.network, () => {
              ToastHelper.showToast('networkforget');
            });
            NavigationMap.navigateBack();
          }
        }
      };

      DialogHelper.show(dialogConfig);
    }

    function enableSoftKey(evt) {
      updateSoftKey(evt.detail.enabled);
    }

    function updateSoftKey(doneSoftkeyEnable, showPassword, forgetEnable) {
      const none = {
        name: '',
        l10nId: '',
        priority: 1
      };

      const forget = {
        name: 'Forget',
        l10nId: 'forget',
        priority: 1,
        method: () => {
          showConfirmDialog();
        }
      };

      const select = {
        name: 'Select',
        l10nId: 'select',
        priority: 2
      };

      const connect = {
        name: 'Connect',
        l10nId: 'device-option-connect',
        priority: 3,
        method: () => {
          const itemWifiList = document.querySelector(
            'ul.wifi-availableNetworks'
          );
          if (itemWifiList) {
            itemWifiList.dataset.ssid = elements.ssid.textContent;
          }

          elements.connectFlag = true;
          connectNetwork();
          wifiAuthPanelAriaDisable(true);
          updateSoftKey(false, false, true);
        }
      };

      const params = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: []
      };

      if (forgetEnable) {
        params.items.push(forget);
      } else if (!doneSoftkeyEnable && !showPassword) {
        params.items.push(none);
      }

      if (showPassword) {
        params.items.push(select);
      }

      if (doneSoftkeyEnable) {
        params.items.push(connect);
      }

      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    function checkConnectSoftkeyState(key) {
      const password = elements.password.value;
      const identity = elements.identity.value;
      const eap = elements.eap.value;

      return WifiHelper.isValidInput(key, password, identity, eap);
    }

    function sendCustomEvent(name, detail) {
      const evt = new CustomEvent(name, detail);
      window.dispatchEvent(evt);
    }

    return SettingsPanel({
      onInit(panel, options) {
        elements = {
          network: options,
          connectFlag: false,
          securityType: '',
          panel,
          ssid: panel.querySelector('[data-ssid]'),
          signal: panel.querySelector('[data-signal]'),
          security: panel.querySelector('[data-security]'),
          identity: panel.querySelector('input[name=identity]'),
          password: panel.querySelector('input[name=password]'),
          showPassword: panel.querySelector('input[name=show-pwd]'),
          eap: panel.querySelector('li.eap select'),
          authPhase2: panel.querySelector('li.auth-phase2 select'),
          keyIndex: panel.querySelector('li.key-index select'),
          certificate: panel.querySelector('li.server-certificate select')
        };
        elements.password.parentNode.onfocus = () => {
          elements.password.focus();
          elements.password.selectionStart = elements.password.value.length;
        };
        elements.identity.parentNode.onfocus = () => {
          elements.identity.focus();
        };
        // eslint-disable-next-line
        self = this;
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
        this.handleFocusChanged = this.handleFocusChanged.bind(this);
      },
      onBeforeShow(panel, options) {
        const network = options;
        elements.network = options;
        elements.connectFlag = false;
        backPrevious = false;
        elements.authPhase2.querySelectorAll('option')[0].selected = true;
        WifiUtils.initializeAuthFields(panel, network);
        WifiUtils.changeDisplay(panel, options.security);
        wifiAuthPanelAriaDisable(false);

        panel.dataset.security = options.security;
        elements.ssid.textContent = network.ssid;
        elements.signal.setAttribute(
          'data-l10n-id',
          `signalLevel${options.sl}`
        );

        if (options.security) {
          elements.securityType = options.security;
        }
        elements.security.setAttribute(
          'data-l10n-id',
          WifiHelper.getKeyManagement(options)
        );

        this.dispatchDialogShowEvent();

        WifiUtils.getCarrierName(elements);

        updateSoftKey(checkConnectSoftkeyState(options.security));

        window.addEventListener('enable-connect-softkey', enableSoftKey);

        window.addEventListener('keydown', this.keydownHandler, true);
        document.addEventListener('focusChanged', this.handleFocusChanged);

        document.addEventListener(
          'visibilitychange',
          this.handleVisibiltychange
        );

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

      onShow() {
        ListFocusHelper.requestFocus(elements.panel, this.getFocusItem());
      },

      onHide() {
        elements.identity.value = '';
        elements.password.value = '';
        elements.showPassword.checked = false;
        backPrevious = false;
      },

      onBeforeHide() {
        sendCustomEvent('dialogpanelhide', {
          detail: {
            dialogpanel: '#wifi_auth'
          }
        });

        window.removeEventListener('enable-connect-softkey', enableSoftKey);

        window.removeEventListener('keydown', this.keydownHandler, true);
        document.removeEventListener('focusChanged', this.handleFocusChanged);

        document.removeEventListener(
          'visibilitychange',
          this.handleVisibiltychange
        );
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
      },

      getFocusItem() {
        let item = null;
        if (!elements.identity.parentNode.classList.contains('hidden')) {
          item = elements.identity.parentNode;
        } else if (!elements.password.parentNode.classList.contains('hidden')) {
          item = elements.password.parentNode;
        } else {
          item = elements.security.parentNode;
        }

        return item;
      },

      handleFocusChanged() {
        if (elements.connectFlag) {
          updateSoftKey(false, false, true);
        } else {
          const { security } = elements.panel.dataset;
          const item =
            elements.panel.querySelector('li.show-password.focus') ||
            elements.panel.querySelector('li.server-certificate.focus') ||
            elements.panel.querySelector('li.auth-phase2.focus') ||
            elements.panel.querySelector('li.eap.focus');
          if (item) {
            updateSoftKey(checkConnectSoftkeyState(security), true);
          } else {
            updateSoftKey(checkConnectSoftkeyState(security), false);
          }
        }
      },

      keydownHandler(e) {
        switch (e.key) {
          case 'Backspace':
            e.preventDefault();
            e.stopPropagation();
            if (!elements.connectFlag) {
              NavigationMap.navigateBack();
            }
            break;
          default:
            break;
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
          backPrevious = true;
          elements.connectFlag = false;
          wifiAuthPanelAriaDisable(false);
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
        let bodyId = 'wifi-authentication-failed';
        if (elements.securityType === 'WPA-EAP') {
          bodyId = 'wifi-eap-authentication-failed';
        }
        this.openBadCredentialsDialog(bodyId);
      },

      openConnetingFailedDialog() {
        this.openBadCredentialsDialog('wifi-association-reject');
      },

      openObtainingIPFailedDialog() {
        this.openBadCredentialsDialog('wifi-DHCP-failed');
        backPrevious = true;
        NavigationMap.navigateBack();
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
            callback() {
              DialogHelper.destroy();
            }
          }
        };

        const { security } = elements.panel.dataset;
        const item = elements.panel.querySelector('li.show-password.focus');
        if (item) {
          updateSoftKey(checkConnectSoftkeyState(security), true);
        } else {
          updateSoftKey(checkConnectSoftkeyState(security), false);
        }

        elements.security.textContent = elements.securityType;
        elements.connectFlag = false;
        wifiAuthPanelAriaDisable(false);
        DialogHelper.show(dialogConfig);
      },

      handleVisibiltychange() {
        if (!document.hidden) {
          this.dispatchDialogShowEvent();
        }
      },

      dispatchDialogShowEvent() {
        sendCustomEvent('dialogpanelshow', {
          detail: {
            dialogpanel: `#${elements.panel.id}`
          }
        });
      }
    });
  };
});

