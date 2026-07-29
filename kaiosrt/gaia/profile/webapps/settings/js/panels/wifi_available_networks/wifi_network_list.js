/* global WifiHelper */

// eslint-disable-next-line
define(['require','modules/wifi/wifi_utils','modules/wifi/wifi_context'],function(require) {
  const WifiUtils = require('modules/wifi/wifi_utils');
  const WifiContext = require('modules/wifi/wifi_context');
  const wifiManager = WifiHelper.getWifiManager();

  // eslint-disable-next-line
  const WifiNetworkList = function(elements, callback) {
    const list = elements.wifiAvailableNetworks;

    // eslint-disable-next-line
    var wifiNetworkList = {
      scanRate: 15000, // 15s after last scan results
      scanning: false,
      autoscan: false,
      panel: null,
      timerID: null,
      focusIndex: 0,
      rescanFlag: false,
      dialogPanelShow: false,
      index: {}, // Index of all scanned networks
      networks: {},
      listItems: elements.wifiAvailableNetworks,
      showSearchStatus(enabled) {
        list.classList.toggle('hidden', enabled);
        elements.infoItem.classList.toggle('hidden', !enabled);
      },
      clear() {
        // Clear the network list
        this.index = {};

        /*
         * Remove all items except the text expl.
         * and the "search again" button
         */
        const wifiItems = list.querySelectorAll('li');
        const len = wifiItems.length;
        for (let i = len - 1; i >= 0; i--) {
          list.removeChild(wifiItems[i]);
        }
      },

      getFocusIndex() {
        this.focusIndex = 0;

        const wifiItems = list.querySelectorAll('li');
        const focus = list.querySelector('li.focus');

        if (!wifiItems || !focus) {
          return;
        }

        const focusNetwork = JSON.parse(focus.dataset.network);
        for (let i = 0; i < wifiItems.length; i++) {
          const network = JSON.parse(wifiItems[i].dataset.network);
          if (
            focusNetwork.ssid === network.ssid &&
            focusNetwork.security === network.security
          ) {
            this.focusIndex = i;
            return;
          }
        }
      },

      refreshFocus() {
        const wifiItems = list.querySelectorAll('li');
        if (wifiItems.length > 0) {
          if (wifiItems.length < this.focusIndex + 1) {
            this.focusIndex = wifiItems.length - 1;
          }
          wifiItems[this.focusIndex].classList.add('focus');
          wifiItems[this.focusIndex].focus();
          wifiItems[this.focusIndex].scrollIntoView(false);
        }
      },

      newWifiListItem(networkKeys, knownNetwork) {
        let network = null;
        const offlineString = 'shortStatus-disconnected';

        this.getFocusIndex();
        this.clear();
        // Add detected networks
        let nodeForOffline = null;

        for (let j = 0; j < networkKeys.length; j++) {
          network = this.networks[networkKeys[j]];

          if (
            !WifiUtils.wlanEnabled &&
            (network.security === 'WAPI-PSK' ||
              network.security === 'WAPI-CERT')
          ) {
            continue;
          }

          const listItem = WifiUtils.newListItem({
            network,
            onClick: this.toggleNetwork.bind(this),
            showNotInRange: true,
            knownNetworks: knownNetwork
          });

          // Put connected network on top of list
          if (WifiHelper.isConnected(network)) {
            if (list.childNodes.length !== 0) {
              list.insertBefore(listItem, list.childNodes[0]);
              if (!nodeForOffline) {
                // eslint-disable-next-line
                nodeForOffline = list.childNodes[0];
              }
            } else {
              list.appendChild(listItem);
              // eslint-disable-next-line
              nodeForOffline = list.childNodes[0];
            }
          } else if (
            listItem.querySelector('a small').dataset.l10nId === offlineString
          ) {
            if (list.childNodes.length !== 0) {
              if (!nodeForOffline) {
                list.insertBefore(listItem, list.childNodes[0]);
                // eslint-disable-next-line
                nodeForOffline = list.childNodes[0];
              } else {
                list.insertBefore(listItem, nodeForOffline.nextSibling);
                nodeForOffline = nodeForOffline.nextSibling;
              }
            } else {
              list.appendChild(listItem);
              // eslint-disable-next-line
              nodeForOffline = list.childNodes[0];
            }
          } else {
            list.appendChild(listItem);
          }

          // Add composited key to index
          this.index[networkKeys[j]] = listItem;
        }
      },

      scan(toastFlag) {
        // Scan wifi networks and display them in the list
        if (this.scanning) {
          return;
        }

        // Stop auto-scanning if wifi disabled or the app is hidden
        if (!wifiManager.enabled || document.hidden) {
          this.scanning = false;
          return;
        }

        let progressItem = wifiNetworkList.panel.querySelector(
          '.searching_icon progress'
        );
        if (!progressItem) {
          progressItem = document.createElement('progress');

          const searchingText = '.searching_icon .searching-text';
          const wifiSearchText = wifiNetworkList.panel.querySelector(
            searchingText
          );
          const wifiSearchItem = wifiNetworkList.panel.querySelector(
            '.searching_icon'
          );
          wifiSearchItem.insertBefore(progressItem, wifiSearchText);
        }

        const wifiItems = this.listItems.querySelectorAll('li');
        if (0 === wifiItems.length) {
          this.showSearchStatus(true);
        }

        this.scanning = true;
        const req = WifiHelper.getAvailableAndKnownNetworks();

        req.onsuccess = () => {
          const allNetworks = req.result;
          let network = null;

          this.networks = {};
          for (let i = 0; i < allNetworks.length; ++i) {
            network = allNetworks[i];
            const key = WifiUtils.getNetworkKey(network);
            // Keep connected network first, or select the highest strength
            if (!this.networks[key] || network.connected) {
              this.networks[key] = network;
            } else if (
              !this.networks[key].connected &&
              network.relSignalStrength > this.networks[key].relSignalStrength
            ) {
              this.networks[key] = network;
            }
          }

          const networkKeys = Object.getOwnPropertyNames(this.networks);

          new Promise((resolve, reject) => {
            // Display network list
            if (networkKeys.length) {
              const noWifiItem = document.querySelector(
                '#wifi_available_networks .no-wifi-network'
              );
              if (noWifiItem) {
                noWifiItem.classList.add('hidden');
              }

              // Sort networks by signal strength
              networkKeys.sort((a, b) => {
                return (
                  this.networks[b].relSignalStrength -
                  this.networks[a].relSignalStrength
                );
              });

              const request = wifiManager.getKnownNetworks();
              request.onsuccess = () => {
                resolve(request.result);
              };

              request.onerror = error => {
                reject(error);
              };
            } else {
              // Display a "no networks found" message if necessary
              const noWifiItem = document.querySelector(
                '#wifi_available_networks .no-wifi-network'
              );
              if (noWifiItem) {
                noWifiItem.classList.remove('hidden');
              }

              // eslint-disable-next-line
              reject();
            }
          })
            .then(
              value => {
                this.newWifiListItem(networkKeys, value);
              },
              error => {
                if (networkKeys.length > 0) {
                  const knownNet = [];
                  this.newWifiListItem(networkKeys, knownNet);
                } else {
                  this.clear();
                }
                console.warn('Error : ', error);
                console.warn('scan: could not retrieve any known network.');
              }
            )
            .then(() => {
              // Hide the "Searching" status
              this.showSearchStatus(false);
              if (callback && typeof callback === 'function') {
                callback();
              }
              const liItem = list.querySelector('.focus');
              if (liItem) {
                liItem.classList.remove('focus');
                this.refreshFocus();
              }

              if (this.rescanFlag) {
                this.rescanFlag = false;
                ToastHelper.showToast('rescanComplete');
              }

              if (
                toastFlag &&
                (!wifiManager ||
                  !wifiManager.connection ||
                  'connected' !== wifiManager.connection.status)
              ) {
                ToastHelper.showToast('select-a-network');
              }

              this.scanning = false;
            });
        };

        req.onerror = () => {
          // Always try again.
          this.scanning = false;
          window.setTimeout(this.scan.bind(this), this.scanRate);
        };
      },

      startAutoscanTimer() {
        if (this.timerID) {
          window.clearInterval(this.timerID);
        }
        this.timerID = window.setInterval(this.scan.bind(this), this.scanRate);
      },

      getWpsAvailableNetworks() {
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
      },

      toggleNetwork(network, bodyId) {
        if (
          WifiContext.currentNetwork &&
          WifiHelper.getCompositedKey(network) ===
            WifiHelper.getCompositedKey(WifiContext.currentNetwork)
        ) {
          const { relSignalStrength } = network;
          network = WifiContext.currentNetwork;
          network.relSignalStrength = relSignalStrength;
        }

        const keys = WifiHelper.getSecurity(network);
        const security = keys ? keys : 'Open';
        const sl = Math.min(Math.floor(network.relSignalStrength / 20), 4);

        const req = wifiManager.getKnownNetworks();
        const done = () => {
          let key = null;
          let knownNetwork = false;
          const netKey = WifiUtils.getNetworkKey(network);
          // eslint-disable-next-line
          for (let i in req.result) {
            if (WifiUtils.getNetworkKey(req.result[i]) === netKey) {
              knownNetwork = true;
              break;
            }
          }

          const isConnected = WifiHelper.isConnected(network);
          if (isConnected || (knownNetwork && !bodyId)) {
            // Online: show status + offer to disconnect
            Settings.setCurrentPanel('#wifi_status', {
              sl,
              network,
              security,
              isConnected,
              knownNetwork
            });
          } else {
            // Offline, unknown network: propose to connect
            key = WifiHelper.getKeyManagement(network);
            switch (key) {
              case 'WEP':
              case 'WPA-PSK':
              case 'WPA-EAP':
              case 'WPA2-PSK':
              case 'WPA/WPA2-PSK':
              case 'OPEN':
              case 'SAE':
                network.password = null;
                Settings.setCurrentPanel('#wifi_auth', network);
                break;
              case 'WAPI-PSK':
              case 'WAPI-CERT':
                Settings.setCurrentPanel('#wifi_auth_wapi');
                break;
              default:
                break;
            }
          }
        };

        req.onsuccess = done;
        req.onerror = done;
      }
    };

    return wifiNetworkList;
  };

  return WifiNetworkList;
});
