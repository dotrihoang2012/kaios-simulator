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

/* global WifiHelper  */


// eslint-disable-next-line
define('panels/wifi_manage_certificates/panel',['require','modules/wifi/wifi_utils','modules/settings_panel'],function(require) {
  const WifiUtils = require('modules/wifi/wifi_utils');
  const SettingsPanel = require('modules/settings_panel');

  return function ctorManageCertificatedWifi() {
    let elements = {};
    const wifiManager = WifiHelper.getWifiManager();

    function initSoftKey(options) {
      const params = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: [options]
      };

      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    function showSelectSoftKey() {
      const items = {
        name: 'Select',
        l10nId: 'select',
        priority: 2
      };

      initSoftKey(items);
    }

    function showDeleteSoftKey(nickname) {
      const items = {
        name: 'Delete',
        l10nId: 'delete',
        priority: 3,
        method() {
          showConfirmDialog(nickname);
        }
      };

      initSoftKey(items);
    }

    function newCertificateItem(nickname) {
      const span = document.createElement('span');
      span.textContent = nickname;
      span.id = nickname;
      span.classList.add('certificate-file');

      const li = document.createElement('li');
      li.setAttribute('role', 'menuitem');
      li.appendChild(span);

      return li;
    }

    function showConfirmDialog(nickname) {
      const dialogConfig = {
        title: { id: 'confirmation', args: {} },
        body: {
          id: 'delete-certificate-confirm-msg',
          args: {
            certificateName: nickname
          }
        },
        cancel: {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1,
          callback() {
            DialogHelper.destroy();
          }
        },
        confirm: {
          name: 'Delete',
          l10nId: 'delete',
          priority: 3,
          callback() {
            DialogHelper.destroy();
            deleteCertificate(nickname);
          }
        }
      };
      DialogHelper.show(dialogConfig);
    }

    function deleteCertificate(nickname) {
      const scanWhenDeleteError = () => {
        // Pop out alert message for certificate deletion failed
        const dialogConfig = {
          title: { id: 'certificate-deletion-failed' },
          body: { id: 'certificate-deletion-failed-description', args: {} },
          accept: {
            l10nId: 'ok',
            priority: 2,
            callback() {
              DialogHelper.destroy();
              scan();
            }
          }
        };
        DialogHelper.show(dialogConfig);
      };

      wifiManager.deleteCert(nickname).then(
        () => {
          const item = document.getElementById(nickname).parentNode;
          elements.certificateList.removeChild(item);
          ToastHelper.showToast('certificate-deleted');

          const list = elements.certificateList;
          const certificateItems = list.querySelectorAll('li');
          if (certificateItems.length === 0) {
            showNoCertificatesInfo(list);
          }

          NavigationMap.refresh();
        },
        () => {
          scanWhenDeleteError();
        }
      );
    }

    function showNoCertificatesInfo(list) {
      const li = WifiUtils.newExplanationItem('noImportedCertificates');
      li.classList.add('non-focus');
      list.appendChild(li);
    }

    function scan() {
      cleanup();

      const list = elements.certificateList;

      wifiManager.getImportedCerts().then(
        result => {
          const certList = result;
          // Save the imported server certificates
          const certificateList = certList.ServerCert;

          // Display certificate list
          if (certificateList && certificateList.length) {
            for (let i = 0; i < certificateList.length; i++) {
              const aItem = newCertificateItem(certificateList[i]);
              list.appendChild(aItem);
            }

            // Add event listener for updating delete cert. soft-key
            const updateSoftKey = evt => {
              const nickname = evt.target.textContent;
              if (nickname === null) {
                return;
              }

              showDeleteSoftKey(nickname);
            };

            let j = 0;
            const certificateItems = list.querySelectorAll('li');
            const { length } = certificateItems;
            for (j; j < length; j++) {
              certificateItems[j].addEventListener('focus', updateSoftKey);
            }
          } else {
            // Show "no certificates" message
            showNoCertificatesInfo(list);
          }

          NavigationMap.refresh();
        },
        () => {
          console.warn('getImportedCerts failed');
        }
      );
    }

    function cleanup() {
      while (elements.certificateList.hasChildNodes()) {
        elements.certificateList.removeChild(
          elements.certificateList.lastChild
        );
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          panel,
          certificateList: panel.querySelector('.wifi-certificateList'),
          importCertificate: panel.querySelector('.operate-certificate li')
        };
      },

      onBeforeShow() {
        scan();
        showSelectSoftKey();
      },

      onShow(panel, option) {
        this.handleOption(option);
        elements.importCertificate.addEventListener('focus', showSelectSoftKey);
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
      },

      onHide() {
        elements.importCertificate.removeEventListener(
          'focus',
          showSelectSoftKey
        );
      },

      handleOption(option) {
        if (!option || !option.message) {
          return;
        }

        const dialogConfig = {
          title: { id: 'import-certificate-failed', args: {} },
          body: {},
          accept: {
            l10nId: 'ok',
            priority: 2
          }
        };

        switch (option.message) {
          case 'Import duplicate certificate':
            dialogConfig.body.id = 'duplicate-cert-description';
            break;
          case 'Import damaged certificate':
            dialogConfig.body.id = 'damage-cert-description';
            break;
          default:
            break;
        }

        DialogHelper.show(dialogConfig);
      }
    });
  };
});

