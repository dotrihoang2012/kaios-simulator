/* global SimCardHelper */

define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  return function createCarrierOperatorSettings() {
    let elements = null;
    let serviceIndex = 0;
    let mobileConnection = null;

    let connecting = false;
    let connectedItem = null;
    let operatorItemMap = {};
    let scanRequest = null;
    let pendingAutomaticSelectionRequest = false;
    let previousConnected = null;
    let listElements = null;
    let scanFlag = false;
    let currentSelection = 'true';

    function initSoftkey(searchEnable) {
      const params = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: [
          {
            name: 'Select',
            l10nId: 'select',
            priority: 2
          }
        ]
      };

      if (searchEnable) {
        params.items.push({
          name: 'Search',
          l10nId: 'search',
          priority: 3,
          method() {
            scan();
          }
        });
      }
      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    function disableAutomaticSelectionState(disabled) {
      if (disabled) {
        elements.automaticOn.setAttribute('aria-disabled', 'true');
        elements.automaticOff.setAttribute('aria-disabled', 'true');
        elements.automaticOn.classList.add('none-select');
        elements.automaticOff.classList.add('none-select');
        SettingsSoftkey.hide();
      } else {
        elements.automaticOn.removeAttribute('aria-disabled');
        elements.automaticOff.removeAttribute('aria-disabled');
        elements.automaticOn.classList.remove('none-select');
        elements.automaticOff.classList.remove('none-select');
        SettingsSoftkey.show();
      }
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    function checkAutomaticSelection() {
      if (pendingAutomaticSelectionRequest) {
        doEnableAutomaticSelection();
        pendingAutomaticSelectionRequest = false;
      }
    }

    function selectOperator(network) {
      if (connecting || connectedItem === network) {
        return;
      }

      const listItem = operatorItemMap[`${network.mcc}.${network.mnc}`];
      if (!listItem) {
        return;
      }

      connecting = true;
      connectedItem = network;
      disableAutomaticSelectionState(true);
      disableListItems(true);

      const req = mobileConnection.selectNetwork(network);
      ToastHelper.showToast('operator-status-connecting');
      req.onsuccess = function onsuccess() {
        connecting = false;
        checkAutomaticSelection();
        disableAutomaticSelectionState(false);
        disableListItems(false);
        ToastHelper.showToast('operator-status-connected');
        previousConnected = network;
      };
      req.onerror = function onerror() {
        connecting = false;
        const dialogConfig = {
          title: { id: 'switch-to-auto-header', args: {} },
          body: { id: 'switch-to-auto', args: {} },
          cancel: {
            name: 'No',
            l10nId: 'no',
            priority: 1,
            callback() {
              if (previousConnected) {
                const request = mobileConnection.selectNetwork(
                  previousConnected
                );
                request.onsuccess = () => {
                  disableAutomaticSelectionState(false);
                  disableListItems(false);
                };
                request.onerror = request.onsuccess;
              } else {
                DebugHelper.debug('no connected network');
                disableAutomaticSelectionState(false);
                disableListItems(false);
              }
            }
          },
          confirm: {
            name: 'Yes',
            l10nId: 'yes',
            priority: 3,
            callback() {
              elements.automaticBtn[0].checked = true;
              currentSelection = 'true';
              stop();
              pendingAutomaticSelectionRequest = false;
              doEnableAutomaticSelection();
            }
          }
        };
        DialogHelper.show(dialogConfig);
      };
    }

    function invalidateRequest(request) {
      if (request) {
        request.onsuccess = () => {};
        request.onerror = () => {};
      }
    }

    function clear() {
      operatorItemMap = {};
      const operatorItems = elements.availableOperators.querySelectorAll(
        'li:not([data-state])'
      );
      const len = operatorItems.length;
      for (let i = len - 1; i >= 0; i--) {
        elements.availableOperators.removeChild(operatorItems[i]);
      }
      window.dispatchEvent(new CustomEvent('refresh'));
      initSoftkey(false);
    }

    function stop() {
      elements.availableOperators.dataset.state = 'off';
      elements.operatorsInfo.setAttribute('data-state', 'off');
      elements.operatorsInfo.setAttribute(
        'data-l10n-id',
        'operator-turnAutoSelectOff'
      );
      clear();
      invalidateRequest(scanRequest);
      scanRequest = null;
    }

    const ratMapping = {
      '14': '4G',
      '3': '3G',
      '1': '2G',
      '2': '2G',
      '16': '2G'
    };

    function getCarrierName(network) {
      const networkName =
        network.shortName || network.longName || network.mcc + network.mnc;
      let name = networkName;
      if (
        !networkName.includes('2G') &&
        !networkName.includes('2g') &&
        !networkName.includes('3G') &&
        !networkName.includes('3g') &&
        !networkName.includes('4G') &&
        !networkName.includes('4g')
      ) {
        const { mnc } = network;
        const index = mnc.indexOf('+');
        if (index > 0) {
          const rat = mnc.substr(index + 1, mnc.length - 1);
          if (ratMapping[rat]) {
            name = `${networkName} ${ratMapping[rat]}`;
          }
        }
      }
      return name;
    }

    function newListItem(network, callback) {
      /**
       * A network list item has the following HTML structure:
       *   <li>
       *     <a>
       *       <span>Network Name</span>
       *     </a>
       *   </li>
       */

      if (network.state === 'connected') {
        previousConnected = network;
      }
      // Name
      const name = document.createElement('span');
      name.textContent = getCarrierName(network);

      const a = document.createElement('a');
      a.appendChild(name);

      // Create list item
      const li = document.createElement('li');
      li.appendChild(a);
      li.classList.add('operatorItem');

      // Bind connection callback
      li.onclick = () => {
        callback(network, true);
      };
      return li;
    }

    function scan() {
      clear();
      elements.availableOperators.dataset.state = 'on'; // "Searching..."
      scanFlag = true;

      elements.operatorsInfo.setAttribute('data-state', 'on');
      elements.operatorsInfo.setAttribute('data-l10n-id', 'scanning');
      disableAutomaticSelectionState(true);

      // Invalidate the original request if it exists
      invalidateRequest(scanRequest);
      scanRequest = mobileConnection.getNetworks();

      scanRequest.onsuccess = function onsuccess() {
        scanFlag = false;
        const networks = scanRequest.result;
        for (let i = 0; i < networks.length; i++) {
          const network = networks[i];
          const listItem = newListItem(network, selectOperator);
          elements.availableOperators.insertBefore(listItem, elements.progress);

          operatorItemMap[`${network.mcc}.${network.mnc}`] = listItem;
        }
        elements.availableOperators.dataset.state = 'ready'; // "Search Again" button

        scanRequest = null;
        disableAutomaticSelectionState(false);
        initSoftkey(true);
      };

      scanRequest.onerror = error => {
        scanFlag = false;
        if (error.currentTarget.error.message === 'RequestNotSupported') {
          ToastHelper.showToast('request-not-supported');
        }
        DebugHelper.debug('carrier: could not retrieve any network operator. ');
        elements.availableOperators.dataset.state = 'ready'; // "Search Again" button

        scanRequest = null;
        disableAutomaticSelectionState(false);
        initSoftkey(true);
      };
    }

    function disableListItems(disabled) {
      const operatorItems = Array.prototype.slice.call(
        elements.availableOperators.querySelectorAll('.operatorItem')
      );
      operatorItems.forEach(operatorItem => {
        if (disabled) {
          operatorItem.disabled = true;
          operatorItem.setAttribute('aria-disabled', 'true');
          operatorItem.classList.add('none-select');
        } else {
          operatorItem.disabled = false;
          operatorItem.removeAttribute('aria-disabled');
          operatorItem.classList.remove('none-select');
        }
      });
    }

    function doEnableAutomaticSelection() {
      const req = mobileConnection.selectNetworkAutomatically();
      req.onsuccess = () => {
        elements.automaticBtn[0].checked = true;
        currentSelection = 'true';
        disableAutomaticSelectionState(false);
        disableListItems(false);
      };
      req.onerror = req.onsuccess;
    }

    function setAutomaticSelection(enabled, skip) {
      if (enabled) {
        stop();
        if (connecting) {
          DebugHelper.debug('setAutomaticSelection connecting');
        } else if (!skip) {
          doEnableAutomaticSelection();
        }
      } else {
        scan();
      }
    }

    function updateAutomaticOperatorSelection(mode) {
      if (mode === 'automatic') {
        disableAutomaticSelectionState(false);
        setAutomaticSelection(true, true);
      } else {
        disableAutomaticSelectionState(true);
        scan();
      }
    }

    function stopScan() {
      if (elements.automaticBtn[1].checked && scanFlag) {
        const req = mobileConnection.stopNetworkScan();
        req.onsuccess = () => {
          scanFlag = false;
          DebugHelper.debug('stopNetworkScan success');
        };
        req.onerror = err => {
          scanFlag = false;
          DebugHelper.debug(`stopNetworkScan error -${JSON.stringify(err)}`);
        };
      }
      const selectionMode = mobileConnection.networkSelectionMode;
      if (selectionMode === 'automatic') {
        stop();
      }
    }

    function keyDownHandler(evt) {
      switch (evt.key) {
        case 'EndCall':
          stopScan();
          break;
        case 'Backspace':
          evt.preventDefault();
          evt.stopPropagation();
          stopScan();
          Settings.setCurrentPanel('#carrier_detail', {
            serviceId: serviceIndex
          });
          break;
        default:
          break;
      }
    }

    function clickHandler(evt) {
      const disabled = evt.target.parentNode.parentNode.hasAttribute(
        'aria-disabled'
      );
      const { value } = evt.target;
      if (disabled || currentSelection === value) {
        evt.preventDefault();
        evt.stopPropagation();
        return;
      }
      const enabled = value === 'true';
      setAutomaticSelection(enabled, false);
      disableAutomaticSelectionState(!enabled);
      currentSelection = value;
    }

    return SettingsPanel({
      onInit(panel, options) {
        serviceIndex = options.serviceId;
        mobileConnection = ApiManager.connections[serviceIndex];
        elements = {
          header: panel.querySelector('gaia-header h1'),
          automaticOn: panel.querySelector('.automatic-on'),
          automaticOff: panel.querySelector('.automatic-off'),
          automaticBtn: panel.querySelectorAll(
            'input[name="network-selection-mode"]'
          ),
          availableOperators: panel.querySelector('#availableOperators'),
          operatorsInfo: panel.querySelector('#operators-info'),
          progress: panel.querySelector('#scan-progress')
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

        if (!options.visibilityChange) {
          const mode = mobileConnection.networkSelectionMode;
          if (mode === 'automatic') {
            elements.automaticBtn[0].checked = true;
            currentSelection = 'true';
          } else {
            elements.automaticBtn[1].checked = true;
            currentSelection = 'false';
          }

          disableAutomaticSelectionState(false);
          updateAutomaticOperatorSelection(mode);
          SettingsSoftkey.init(SoftParams.defaultSelect);
          ListFocusHelper.updateSoftkey(panel);
        }
        ListFocusHelper.addEventListener(listElements);
        elements.automaticBtn[0].addEventListener('click', clickHandler, true);
        elements.automaticBtn[1].addEventListener('click', clickHandler, true);
        window.addEventListener('keydown', keyDownHandler, true);
      },

      onBeforeHide() {
        ListFocusHelper.removeEventListener(listElements);
        elements.automaticBtn[0].removeEventListener(
          'click',
          clickHandler,
          true
        );
        elements.automaticBtn[1].removeEventListener(
          'click',
          clickHandler,
          true
        );
        window.removeEventListener('keydown', keyDownHandler, true);
      }
    });
  };
});
