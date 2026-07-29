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
define('panels/wifi_join_hidden/panel',['require','modules/wifi/wifi_utils','modules/wifi/wifi_context','modules/settings_panel'],function(require) {
  const WifiUtils = require('modules/wifi/wifi_utils');
  const WifiContext = require('modules/wifi/wifi_context');
  const SettingsPanel = require('modules/settings_panel');
  const wifiManager = WifiHelper.getWifiManager();

  return function ctorJoinHiddenWifi() {
    let elements = {};
    const networkObj = {};
    const certificateFile = {};
    let connectFlag = false;

    function wifiAuthPanelAriaDisable(enabled) {
      const list = elements.panel.querySelectorAll(
        '.wifi-join-hidden-container li'
      );

      for (let i = 0; i < list.length; i++) {
        if (list[i].hidden === false && enabled) {
          list[i].setAttribute('aria-disabled', true);
        } else if (list[i].hidden === false && !enabled) {
          list[i].removeAttribute('aria-disabled');
        }
      }

      const searchStr = '.wifi-join-hidden-container li input';
      const listInput = elements.panel.querySelectorAll(searchStr);

      for (let i = 0; i < listInput.length; i++) {
        if (listInput[i].hidden === false && enabled) {
          listInput[i].setAttribute('disabled', 'disabled');
        } else if (listInput[i].hidden === false && !enabled) {
          listInput[i].removeAttribute('disabled', 'disabled');
        }
      }

      if (enabled) {
        const focusItem = elements.panel.querySelector(
          '.wifi-join-hidden-container .focus'
        );
        // eslint-disable-next-line
        focusItem && focusItem.focus();
      } else {
        const inputItem = elements.panel.querySelector(
          '.wifi-join-hidden-container .focus input'
        );
        // eslint-disable-next-line
        inputItem && inputItem.focus();
      }

      if (enabled) {
        window.dispatchEvent(new CustomEvent('refresh'));
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
          priority: 1
        },
        confirm: {
          l10nId: 'forget',
          priority: 3,
          callback: () => {
            WifiContext.forgetNetwork(elements.network);
            NavigationMap.navigateBack();
          }
        }
      };

      DialogHelper.show(dialogConfig);
    }

    function updateForgetSoftkey() {
      const params = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: [
          {
            name: 'Forget',
            l10nId: 'forget',
            priority: 1,
            method: () => {
              showConfirmDialog();
            }
          }
        ]
      };

      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    function softkeyHandle() {
      const input = elements.panel.querySelector('.focus input');
      const enabled = checkConnectSoftkeyState();
      if (input) {
        const cskFlag = input.name === 'show-pwd';
        input.focus();
        updateSoftKey(enabled, cskFlag);
      } else {
        updateSoftKey(enabled, true);
      }
    }

    function enableConnectSoftKey(evt) {
      updateSoftKey(evt.detail.enabled);
    }

    function updateSoftKey(enabled, csk) {
      const connect = {
        name: 'Connect',
        l10nId: 'device-option-connect',
        priority: 3,
        method: () => {
          wifiAuthPanelAriaDisable(true);
          updateForgetSoftkey();
          connectNetwork();
        }
      };

      const select = {
        name: 'Select',
        l10nId: 'select',
        priority: 2
      };

      const softkeyParams = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: []
      };

      if (csk) {
        softkeyParams.items.push(select);
      }
      if (enabled && elements.ssid.value.length) {
        softkeyParams.items.push(connect);
      }

      if ((enabled || csk) && softkeyParams.items.length) {
        SettingsSoftkey.init(softkeyParams);
        SettingsSoftkey.show();
      } else {
        SettingsSoftkey.hide();
      }
    }

    function isNetworkMatch(network) {
      const currentNetworkSSID = elements.ssid.value;
      return currentNetworkSSID === network.ssid;
    }

    function isConnectNetwork(network) {
      return (
        wifiManager &&
        wifiManager.connection &&
        'connected' === wifiManager.connection.status &&
        wifiManager.connection.network &&
        WifiHelper.getCompositedKey(network) ===
          WifiHelper.getCompositedKey(wifiManager.connection.network)
      );
    }

    function connectNetwork() {
      if (connectFlag) {
        return;
      }

      connectFlag = true;
      setTimeout(() => {
        connectFlag = false;
      }, 1000);

      // We have to keep these information in network object
      networkObj.ssid = elements.ssid.value;
      networkObj.hidden = true;

      let network = null;
      // eslint-disable-next-line
      if (window.WifiNetwork !== undefined) {
        network = new window.WifiNetwork(networkObj);
      }

      if (elements.security.value === 'WAPI-CERT') {
        network.wapiAsCertificate = certificateFile.fileASU;
        network.wapiUserCertificate = certificateFile.fileUser;
      } else {
        WifiHelper.setPassword({
          network,
          password: elements.password.value,
          identity: elements.identity.value,
          eap: elements.eap.value,
          phase2: elements.authPhase2.value,
          certificate: elements.certificate.value,
          keyIndex: elements.keyIndex.value - 1
        });

        if (elements.security.value === 'WAPI-PSK') {
          network.pskType = elements.hexmode.checked ? 'HEX' : null;
        }

        // eslint-disable-next-line
        network.sim_num = WifiUtils.getSimNum(elements);
      }

      const callback = result => {
        if (result !== null && result.message === 'network not found') {
          openBadCredentialsDialog('hidden-wifi-not-found');
        }
      };

      if (isConnectNetwork(network)) {
        ToastHelper.showToast('wifi-network-connect');
        NavigationMap.navigateBack();
      } else {
        elements.network = network;
        WifiContext.associateNetwork(network, callback);
      }
    }

    function wifiStatusChangeHandler(evt) {
      if (evt.status === 'connected' && isNetworkMatch(evt.network)) {
        wifiAuthPanelAriaDisable(false);
        ToastHelper.showToast('hidden-wifi-connected');
        if (NavigationMap.currentActivatedLength > 0) {
          DialogHelper.destroy();
        }
        NavigationMap.navigateBack();
      }
    }

    function openWrongPasswordDialog() {
      openBadCredentialsDialog('wifi-incorrect-password');
    }

    function openConnetingFailedDialog() {
      openBadCredentialsDialog('wifi-association-reject');
    }

    function openObtainingIPFailedDialog() {
      openBadCredentialsDialog('wifi-DHCP-failed');
    }

    function openBadCredentialsDialog(msgId) {
      const network = WifiContext.currentNetwork;
      const dialogConfig = {
        title: {
          id: 'wifi-bad-credentials-title',
          args: {}
        },
        body: {
          id: msgId,
          args: {
            ssid: !network ? {} : network.ssid
          }
        },
        accept: {
          name: 'OK',
          l10nId: 'ok',
          priority: 2,
          callback: () => {
            DialogHelper.destroy();
          }
        }
      };

      wifiAuthPanelAriaDisable(false);
      softkeyHandle();
      DialogHelper.show(dialogConfig);
    }

    function checkConnectSoftkeyState() {
      const noneString = l10n.get('none');
      const key = elements.security.value;
      const password = elements.password.value;
      const identity = elements.identity.value;
      const eap = elements.eap.value;

      const itemASU = elements.certificateASU.querySelector('small');
      const itemUser = elements.certificateUser.querySelector('small');
      if (elements.security.value === 'WAPI-CERT') {
        if (
          itemASU &&
          itemASU.textContent !== noneString &&
          itemUser &&
          itemUser.textContent !== noneString
        ) {
          return true;
        }
        return false;
      }

      return WifiHelper.isValidInput(key, password, identity, eap);
    }

    function onSecurityChange() {
      const key = elements.security.value
        ? elements.security.value
        : l10n.get('security-none');
      if (key === l10n.get('security-none')) {
        elements.security.querySelectorAll('option')[0].selected = true;
      }

      elements.panel.dataset.security = key;
      WifiHelper.setSecurity(networkObj, key);
      WifiUtils.changeDisplay(elements.panel, key);
      WifiUtils.initializeAuthFields(elements.panel, networkObj);
      updateSoftKey(checkConnectSoftkeyState(), true);
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    function onSSIDchange(event) {
      /*
       * Bug 1082394, during composition, we should not change the input
       * value. Otherwise, the input value will be cleared unexpectedly.
       * Besides, it seems unnecessary to change input value before
       * composition is committed.
       */
      if (event.isComposing) {
        return;
      }
      // Make sure ssid length is no more than 32 bytes.
      let str = elements.ssid.value;
      /*
       * Non-ASCII chars in SSID will be encoded by UTF-8, and length of
       * each char might be longer than 1 byte.
       * Use encodeURIComponent() to encode ssid, then calculate correct
       * length.
       */
      const encoder = new TextEncoder('utf-8');
      while (encoder.encode(str).length > 32) {
        str = str.substring(0, str.length - 1);
      }
      if (str !== elements.ssid.value) {
        elements.ssid.value = str;
      }
      updateSoftKey(checkConnectSoftkeyState());
    }

    function parseFilename(path) {
      return path.slice(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));
    }

    function handleCertificateFile(fileName) {
      if (!fileName) {
        return;
      }
      const item = elements.panel.querySelector('li.focus span');
      if (item) {
        if (item.textContent === l10n.get('ASU-Certificate')) {
          certificateFile.fileASU = fileName;
          elements.certificateASU.querySelector(
            'small'
          ).textContent = parseFilename(fileName);
        } else if (item.textContent === l10n.get('User-Certificate')) {
          certificateFile.fileUser = fileName;
          elements.certificateUser.querySelector(
            'small'
          ).textContent = parseFilename(fileName);
        }
      }

      SettingsDBCache.saveSettings({
        'settings.wifi.certificatefile': null
      });

      const enabled = checkConnectSoftkeyState();
      if (enabled) {
        updateSoftKey(enabled);
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          panel,
          network: null,
          ssid: panel.querySelector('input[name="ssid"]'),
          security: panel.querySelector('select[name="security"]'),
          identity: panel.querySelector('input[name="identity"]'),
          password: panel.querySelector('input[name="password"]'),
          showPassword: panel.querySelector('input[name=show-pwd]'),
          eap: panel.querySelector('select[name="eap"]'),
          keyIndex: panel.querySelector('li.key-index select'),
          authPhase2: panel.querySelector('li.auth-phase2 select'),
          certificate: panel.querySelector('li.server-certificate select'),
          hexmode: panel.querySelector('input[name=hexmode]'),
          certificateASU: panel.querySelector('li.ASU-Certificate'),
          certificateUser: panel.querySelector('li.User-Certificate')
        };
        this.certificateFlag = false;
        this.panelreadyHandler = this.panelreadyHandler.bind(this);
        this.handleFocusChanged = this.proFocusChanged.bind(this);
        this.keydownHandler = this.keydownHandler.bind(this);

        elements.password.parentNode.onfocus = () => {
          const cursorPosForInput = elements.password.value.length;

          elements.password.setSelectionRange(
            cursorPosForInput,
            cursorPosForInput
          );
        };
      },

      onBeforeShow() {
        wifiAuthPanelAriaDisable(false);
        window.addEventListener('keydown', this.keydownHandler, true);

        elements.ssid.addEventListener('input', onSSIDchange);

        elements.security.addEventListener('change', onSecurityChange);

        window.addEventListener('panelready', this.panelreadyHandler);

        window.addEventListener('enable-connect-softkey', enableConnectSoftKey);

        WifiContext.addEventListener(
          'wifiStatusChange',
          wifiStatusChangeHandler
        );
        WifiContext.addEventListener(
          'wifiWrongPassword',
          openWrongPasswordDialog
        );
        WifiContext.addEventListener(
          'wifiConnectingFailed',
          openConnetingFailedDialog
        );
        WifiContext.addEventListener(
          'wifiObtainingIPFailed',
          openObtainingIPFailedDialog
        );
        document.addEventListener('focusChanged', this.handleFocusChanged);

        const input = document.querySelector('li.focus input');
        if (input) {
          input.focus();
        }

        WifiUtils.getCarrierName(elements);

        if (
          NavigationMap.currentSection !== '#wifi_select_wlan_certificate_file'
        ) {
          elements.ssid.value = null;
          elements.security.value = l10n.get('security-none');
          onSecurityChange.call(elements.security);
          updateSoftKey(checkConnectSoftkeyState());
        } else {
          updateSoftKey(false, true);
          this.certificateFlag = true;
        }

        if (WifiUtils.wlanEnabled) {
          this.addWAPIOptions();
        } else {
          this.delWAPIOptions();
        }
      },

      onShow() {
        SettingsDBCache.observe(
          'settings.wifi.certificatefile',
          '',
          handleCertificateFile
        );
      },

      onBeforeHide() {
        elements.password.value = '';
        elements.identity.value = '';
        elements.showPassword.checked = false;

        window.removeEventListener('keydown', this.keydownHandler, true);

        elements.ssid.removeEventListener('input', onSSIDchange);

        elements.security.removeEventListener('change', onSecurityChange);

        window.removeEventListener('panelready', this.panelreadyHandler);

        window.removeEventListener(
          'enable-connect-softkey',
          enableConnectSoftKey
        );

        WifiContext.removeEventListener(
          'wifiStatusChange',
          wifiStatusChangeHandler
        );
        WifiContext.removeEventListener(
          'wifiWrongPassword',
          openWrongPasswordDialog
        );
        WifiContext.removeEventListener(
          'wifiConnectingFailed',
          openConnetingFailedDialog
        );
        WifiContext.removeEventListener(
          'wifiObtainingIPFailed',
          openObtainingIPFailedDialog
        );
        SettingsDBCache.unobserve(
          'settings.wifi.certificatefile',
          handleCertificateFile
        );
        document.removeEventListener('focusChanged', this.handleFocusChanged);
      },

      keydownHandler(evt) {
        let input = null;
        let enabled = null;
        let cskFlag = null;
        const searchStr = '.wifi-join-hidden-container .wifi-ssid';
        let ssidItem = null;
        switch (evt.key) {
          case 'Enter':
            input = document.querySelector('li.focus input');
            enabled = checkConnectSoftkeyState();
            if (input) {
              cskFlag = input.name === 'show-pwd';

              input.focus();
              updateSoftKey(enabled, cskFlag);
            }
            break;
          case 'Backspace':
            if (NavigationMap.currentActivatedLength <= 0) {
              evt.preventDefault();
              evt.stopPropagation();
              ssidItem = elements.panel.querySelector(searchStr);
              if ('true' !== ssidItem.getAttribute('aria-disabled')) {
                NavigationMap.navigateBack();
              }
            }
            break;
          default:
            break;
        }
      },

      proFocusChanged(event) {
        const input = event.detail.focusedElement.querySelector('input');

        const enabled = checkConnectSoftkeyState();
        if (input) {
          const cskFlag = input.name === 'show-pwd';

          input.focus();
          updateSoftKey(enabled, cskFlag);
        } else {
          updateSoftKey(enabled, true);
        }
      },

      addWAPIOptions() {
        const selectStr = '#wifi_join_hidden .security-type select';
        const selectItem = elements.panel.querySelector(selectStr);

        if (!selectItem) {
          return;
        }

        const wapiPsk = document.createElement('option');
        wapiPsk.value = 'WAPI-PSK';
        wapiPsk.setAttribute('data-l10n-id', 'security-wapi-psk');
        selectItem.add(wapiPsk);

        const wapiCert = document.createElement('option');
        wapiCert.value = 'WAPI-CERT';
        wapiCert.setAttribute('data-l10n-id', 'security-wapi-cert');
        selectItem.add(wapiCert);
      },

      delWAPIOptions() {
        const selectStr = '#wifi_join_hidden .security-type select';
        const selectItem = elements.panel.querySelector(selectStr);

        if (!selectItem) {
          return;
        }

        const optionItem = selectItem.querySelectorAll('option');
        for (let i = 0; i < optionItem.length; i++) {
          if (
            optionItem[i].value === 'WAPI-PSK' ||
            optionItem[i].value === 'WAPI-CERT'
          ) {
            selectItem.removeChild(optionItem[i]);
          }
        }
      },

      panelreadyHandler() {
        if (this.certificateFlag) {
          this.certificateFlag = false;
        } else {
          updateSoftKey(checkConnectSoftkeyState());
          elements.ssid.focus();
        }
      }
    });
  };
});

