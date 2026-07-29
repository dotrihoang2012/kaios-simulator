/* global WifiHelper */

// eslint-disable-next-line
define(['require','modules/dialog/dialog_service','modules/wifi/wifi_utils','modules/wifi/wifi_context'],function(require) {
  const DialogService = require('modules/dialog/dialog_service');
  const WifiUtils = require('modules/wifi/wifi_utils');
  const WifiContext = require('modules/wifi/wifi_context');
  const wifiManager = WifiHelper.getWifiManager();

  // eslint-disable-next-line
  const WifiNetworkList = function(elements) {
    const list = elements.wifiAvailableNetworks;

    const wifiNetworkList = {
      scanRate: 5000, // 5s after last scan results
      scanning: false,
      autoscan: false,
      index: {}, // Index of all scanned networks
      networks: {},
      listItems: elements.wifiAvailableNetworks,
      clear(addScanningItem) {
        // Clear the network list
        this.index = {};
        this.networks = {};

        /*
         * Remove all items except the text expl.
         * and the "search again" button
         */
        const wifiItems = list.querySelectorAll('li:not([data-state])');
        const len = wifiItems.length;
        for (let i = len - 1; i >= 0; i--) {
          list.removeChild(wifiItems[i]);
        }

        list.dataset.state = addScanningItem ? 'on' : 'off';
      },
      scan() {
        // Scan wifi networks and display them in the list
        if (this.scanning) {
          return;
        }

        // Stop auto-scanning if wifi disabled or the app is hidden
        if (!wifiManager.enabled || document.hidden) {
          this.scanning = false;
          return;
        }

        this.scanning = true;
        const req = WifiHelper.getAvailableAndKnownNetworks();

        req.onsuccess = () => {
          this.clear(false);
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
              network.relSignalStrength > this.networks[key].relSignalStrength
            ) {
              this.networks[key] = network;
            }
          }

          const networkKeys = Object.getOwnPropertyNames(this.networks);

          // Display network list
          if (networkKeys.length) {
            // Sort networks by signal strength
            networkKeys.sort((a, b) => {
              return (
                this.networks[b].relSignalStrength -
                this.networks[a].relSignalStrength
              );
            });

            // Add detected networks
            for (let j = 0; j < networkKeys.length; j++) {
              network = this.networks[networkKeys[j]];
              const listItem = WifiUtils.newListItem({
                network,
                onClick: this.toggleNetwork.bind(this),
                showNotInRange: true
              });
              // Put connected network on top of list
              if (WifiHelper.isConnected(network)) {
                list.insertBefore(listItem, elements.infoItem.nextSibling);
              } else {
                list.insertBefore(listItem, elements.scanItem);
              }
              // Add composited key to index
              this.index[networkKeys[j]] = listItem;
            }
          } else {
            // Display a "no networks found" message if necessary
            list.insertBefore(
              WifiUtils.newExplanationItem('noNetworksFound'),
              elements.scanItem
            );
          }

          // Display the "Search Again" button
          list.dataset.state = 'ready';

          // Auto-rescan if requested
          if (this.autoscan) {
            window.setTimeout(this.scan.bind(this), this.scanRate);
          }

          this.scanning = false;
        };

        req.onerror = () => {
          // Always try again.
          this.scanning = false;

          window.setTimeout(this.scan.bind(this), this.scanRate);
        };
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
      toggleNetwork(network) {
        const keys = WifiHelper.getSecurity(network);
        const security = keys ? keys : '';
        const sl = Math.min(Math.floor(network.relSignalStrength / 20), 4);

        if (WifiHelper.isConnected(network)) {
          // Online: show status + offer to disconnect
          DialogService.show('wifi_status', {
            sl,
            network,
            security
          }).then(result => {
            const { type } = result;
            if (type === 'submit') {
              WifiContext.forgetNetwork(network, () => {
                this.scan();
              });
            }
          });
        } else if (network.password && network.password === '*') {
          /*
           * Offline, known network (hence the '*' password value):
           * no further authentication required.
           */
          WifiHelper.setPassword({ network });
          WifiContext.associateNetwork(network);
        } else {
          // Offline, unknown network: propose to connect
          const key = WifiHelper.getKeyManagement(network);
          switch (key) {
            case 'WEP':
            case 'WPA-PSK':
            case 'WPA-EAP':
            case 'WPA2-PSK':
            case 'WPA/WPA2-PSK':
              DialogService.show('wifi_auth', {
                sl,
                security,
                network
              }).then(result => {
                const { type } = result;
                const authOptions = result.value;
                if (type === 'submit') {
                  WifiHelper.setPassword({
                    network,
                    password: authOptions.password,
                    identity: authOptions.identity,
                    eap: authOptions.eap,
                    phase2: authOptions.authPhase2,
                    certificate: authOptions.certificate,
                    keyIndex: authOptions.keyIndex
                  });
                  WifiContext.associateNetwork(network);
                }
              });
              break;
            default:
              WifiContext.associateNetwork(network);
              break;
          }
        }
      }
    };

    /*
     * NetworkStatus has one of the following values:
     * connecting, associated, connected, connectingfailed, disconnected.
     */
    WifiContext.addEventListener('wifiEnabled', event => {
      WifiUtils.updateListItemStatus({
        listItems: wifiNetworkList.index,
        activeItemDOM: list.querySelector('.active'),
        network: event.network,
        networkStatus: event.status
      });
    });

    WifiContext.addEventListener('wifiStatusChange', event => {
      WifiUtils.updateListItemStatus({
        listItems: wifiNetworkList.index,
        activeItemDOM: list.querySelector('.active'),
        network: event.network,
        networkStatus: event.status
      });
    });

    WifiContext.addEventListener('wifiConnectionInfoUpdate', event => {
      WifiUtils.updateNetworkSignal(event.network, event.relSignalStrength);
    });

    return wifiNetworkList;
  };

  return WifiNetworkList;
});
