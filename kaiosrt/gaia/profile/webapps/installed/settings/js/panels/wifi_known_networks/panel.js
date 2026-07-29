/* global WifiHelper */

// eslint-disable-next-line
define(['require','modules/wifi/wifi_utils','modules/wifi/wifi_context','modules/settings_panel','panels/wifi_known_networks/wifi_known_networks'],function(require) {
  const WifiUtils = require('modules/wifi/wifi_utils');
  const wifiManager = WifiHelper.getWifiManager();
  const WifiContext = require('modules/wifi/wifi_context');
  const SettingsPanel = require('modules/settings_panel');
  const WifiKnownNetworks = require('panels/wifi_known_networks/wifi_known_networks');

  return function ctorWifiKnownNetwork() {
    let elements = {};
    let listItems = {};

    /*
     * In order to prevent CSK trigger click event.
     * Only the Right Softkey can forget the current network.
     */
    let isDialogShow = false;

    function onWifiStatusChange(event) {
      if ('connected' !== event.status) {
        return;
      }

      // eslint-disable-next-line
      for (let key in listItems) {
        const networkObj = JSON.parse(listItems[key].dataset.network);

        if (
          networkObj.ssid === event.network.ssid &&
          networkObj.security === event.network.security
        ) {
          listItems[key]
            .querySelector('small')
            .setAttribute('data-l10n-id', 'shortStatus-connected');
        }
      }
    }

    function onWifiEnabled(event) {
      const activeItem = elements.knownNetworkListWrapper.querySelector(
        '.active'
      );
      WifiUtils.updateListItemStatus({
        listItems,
        activeItemDOM: activeItem,
        network: event.network,
        networkStatus: event.status
      });
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          panel,
          knownNetworkListWrapper: panel.querySelector('.wifi-knownNetworks')
        };
      },

      onBeforeShow() {
        this.cleanup();
        this.scan();
        this.initSoftKey();
        WifiContext.addEventListener('wifiEnabled', onWifiEnabled);
        WifiContext.addEventListener('wifiStatusChange', onWifiStatusChange);
      },

      onBeforeHide() {
        WifiContext.removeEventListener('wifiEnabled', onWifiEnabled);
        WifiContext.removeEventListener('wifiStatusChange', onWifiStatusChange);
      },

      scan() {
        WifiKnownNetworks.scan(networks => {
          const networkKeys = Object.getOwnPropertyNames(networks);
          let network = null;
          if (networkKeys.length) {
            networkKeys.sort();

            const knownNetwork = {};
            for (let i = 0; i < networkKeys.length; i++) {
              network = networks[networkKeys[i]];
              const aItem = WifiUtils.newListItem({
                network,
                onClick: this.forgetNetwork.bind(this),
                showNotInRange: false,
                knownNetworks: knownNetwork
              });

              if (WifiHelper.isConnected(network)) {
                elements.knownNetworkListWrapper.insertBefore(
                  aItem,
                  elements.knownNetworkListWrapper.firstChild
                );
              } else {
                elements.knownNetworkListWrapper.appendChild(aItem);
              }

              /*
               * We have to keep them so that we can easily update
               * Its status without cleanup
               */
              listItems[networkKeys[i]] = aItem;
            }
          } else {
            // Display a "no known networks" message if necessary
            const li = WifiUtils.newExplanationItem('noKnownNetworks');
            li.classList.add('non-focus');
            elements.knownNetworkListWrapper.appendChild(li);
            SettingsSoftkey.hide();
          }

          NavigationMap.refresh();
        });
      },
      cleanup() {
        const wrapper = elements.knownNetworkListWrapper;
        while (wrapper.hasChildNodes()) {
          wrapper.removeChild(wrapper.firstChild);
        }
        listItems = {};
      },

      initSoftKey() {
        const softkeyParams = {
          menuClassName: 'menu-button',
          header: {
            l10nId: 'message'
          },
          items: [
            {
              name: 'Forget',
              l10nId: 'forget',
              priority: 3,
              method: () => {
                isDialogShow = true;
                const network = elements.panel.querySelector('.wifi.focus a');
                const networkObj = JSON.parse(
                  network.parentNode.dataset.network
                );
                const key = networkObj.security;
                if (key === 'WAPI-PSK' || key === 'WAPI-CERT') {
                  this.forgetNetwork(new window.WifiNetwork(networkObj));
                } else {
                  network.click();
                }
              }
            }
          ]
        };
        SettingsSoftkey.init(softkeyParams);
        SettingsSoftkey.show();
      },

      forgetNetwork(network) {
        const dialogConfig = {
          title: { id: 'forgetNetwork-confirmation', args: {} },
          body: { id: 'forgetNetwork-dialog', args: {} },
          cancel: {
            l10nId: 'cancel',
            priority: 1,
            callback() {
              DialogHelper.destroy();
              isDialogShow = false;
            }
          },
          confirm: {
            l10nId: 'forget',
            priority: 3,
            callback: () => {
              const request = wifiManager.forget(network);
              request.onsuccess = () => {
                ToastHelper.showToast('networkforget');
                this.cleanup();
                this.scan();
              };
              DialogHelper.destroy();
              isDialogShow = false;
            }
          }
        };

        if (isDialogShow) {
          DialogHelper.show(dialogConfig);
        }
      }
    });
  };
});
