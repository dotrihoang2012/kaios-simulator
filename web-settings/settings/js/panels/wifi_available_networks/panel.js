/* global WifiHelper */

// eslint-disable-next-line
define(['require','modules/settings_panel','modules/wifi/wifi_context','modules/wifi/wifi_utils'],function(require) {
  const SettingsPanel = require('modules/settings_panel');
  const WifiContext = require('modules/wifi/wifi_context');
  const WifiUtils = require('modules/wifi/wifi_utils');
  const wifiManager = WifiHelper.getWifiManager();

  return function ctorWifiAvailableNetworks() {
    let elements = null;

    function refreshPanel() {
      const evt = new CustomEvent('refresh');
      window.dispatchEvent(evt);
    }

    return SettingsPanel({
      onInit(panel) {
        this.wifiSectionVisible = false;
        this.scanPending = false;
        this.networkListPromise = null;
        this.initialized = false;
        this.wifiConnecting = false;
        elements = {
          panel,
          wifiAvailableNetworks: panel.querySelector('.wifi-availableNetworks')
        };
        elements.infoItem = panel.querySelector('.searching_icon');
        elements.networklist = {
          infoItem: elements.infoItem,
          wifiAvailableNetworks: elements.wifiAvailableNetworks
        };
        elements.wifiNetworkList = null;

        SettingsDBCache.observe('wifi.enabled', true, enabled => {
          if (!enabled) {
            // Re-enable UI toggle
            this.getNetworkList().then(networkList => {
              networkList.scanning = false;
              networkList.autoscan = false;
              networkList.clear();
            });
          }
        });

        this.onWifiStatusChange = this.onWifiStatusChange.bind(this);
        this.openWrongPasswordDialog = this.openWrongPasswordDialog.bind(this);
        this.openConnetingFailedDialog = this.openConnetingFailedDialog.bind(
          this
        );
        this.openObtainingIPFailedDialog = this.openObtainingIPFailedDialog.bind(
          this
        );
        this.handleFocusChanged = this.handleFocusChanged.bind(this);
        this.updateSoftkeySubmit = this.updateSoftkeySubmit.bind(this);
        this.handleWifiEnabled = this.handleWifiEnabled.bind(this);
        this.handleWifiConnectionInfoUpdate = this.handleWifiConnectionInfoUpdate.bind(
          this
        );
        this.handleWifiHasInternet = this.handleWifiHasInternet.bind(this);
        this.handleWifiCaptive = this.handleWifiCaptive.bind(this);
      },

      onBeforeShow() {
        this.wifiSectionVisible = true;
        this.updateVisibilityStatus();
        window.addEventListener('wifi-auth-submit', this.updateSoftkeySubmit);
        WifiContext.addEventListener(
          'wifiStatusChange',
          this.onWifiStatusChange
        );
        WifiContext.addEventListener('wifiEnabled', this.handleWifiEnabled);
        WifiContext.addEventListener(
          'wifiConnectionInfoUpdate',
          this.handleWifiConnectionInfoUpdate
        );
        WifiContext.addEventListener(
          'wifiHasInternet',
          this.handleWifiHasInternet
        );
        WifiContext.addEventListener('wifiCaptive', this.handleWifiCaptive);
        this.getNetworkList().then(networkList => {
          networkList.startAutoscanTimer();
          elements.wifiNetworkList = networkList;
        });
      },

      onShow() {
        this.updateSoftkey('rescan');
        window.addEventListener('keydown', this.handleKeydown);
        document.addEventListener('focusChanged', this.handleFocusChanged);

        if (NavigationMap.previousSection !== '#wifi_auth_wapi') {
          this.getNetworkList().then(networkList => {
            networkList.panel = elements.panel;
            networkList.scan(true);
          });
        }
      },

      onBeforeHide() {
        this.wifiSectionVisible = false;
        window.removeEventListener('keydown', this.handleKeydown);
        window.removeEventListener(
          'wifi-auth-submit',
          this.updateSoftkeySubmit
        );
        document.removeEventListener('focusChanged', this.handleFocusChanged);
        WifiContext.removeEventListener(
          'wifiStatusChange',
          this.onWifiStatusChange
        );
        WifiContext.removeEventListener('wifiEnabled', this.handleWifiEnabled);
        WifiContext.removeEventListener(
          'wifiConnectionInfoUpdate',
          this.handleWifiConnectionInfoUpdate
        );
        WifiContext.removeEventListener(
          'wifiHasInternet',
          this.handleWifiHasInternet
        );
        WifiContext.removeEventListener('wifiCaptive', this.handleWifiCaptive);

        this.getNetworkList().then(networkList => {
          if (networkList.timerID) {
            window.clearInterval(networkList.timerID);
          }
        });
      },

      handleWifiEnabled(event) {
        if (!elements.wifiNetworkList) {
          return;
        }
        WifiUtils.updateListItemStatus({
          listItems: elements.wifiNetworkList.index,
          activeItemDOM: elements.wifiAvailableNetworks.querySelector(
            '.active'
          ),
          network: event.network,
          networkStatus: event.status
        });
      },

      handleWifiConnectionInfoUpdate(event) {
        WifiUtils.updateNetworkSignal(event.network, event.relSignalStrength);
      },

      handleWifiHasInternet(event) {
        if (!elements.wifiNetworkList) {
          return;
        }
        WifiUtils.updateHasInternetStatus({
          listItems: elements.wifiNetworkList.index,
          network: event.network
        });
      },

      handleWifiCaptive(event) {
        if (!elements.wifiNetworkList) {
          return;
        }
        WifiUtils.updateCaptiveStatus({
          listItems: elements.wifiNetworkList.index,
          network: event.network,
          loginSuccess: event.loginSuccess
        });
      },

      updateSoftkeySubmit() {
        this.updateSoftkey('rescan');
      },

      updateSoftkey(rskType) {
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
              method: () => {
                const li = elements.panel.querySelector('li.focus');
                if (li) {
                  const networkPara = JSON.parse(li.dataset.network);
                  if (
                    networkPara.security === 'WAPI-PSK' ||
                    networkPara.security === 'WAPI-CERT'
                  )
                    SettingsDBCache.saveSettings({
                      'settings.wifi.network': li.dataset.network
                    });
                }
              }
            }
          ]
        };
        if (rskType === 'rescan') {
          softkeyParams.items.push({
            name: 'Rescan',
            l10nId: 'rescan',
            priority: 3,
            method: () => {
              this.getNetworkList().then(networkList => {
                networkList.rescanFlag = true;
                networkList.scan();
              });
            }
          });
        } else if (rskType === 'forget') {
          softkeyParams.items.push({
            name: 'Forget',
            l10nId: 'forget',
            priority: 3,
            method: () => {
              this.forgetNetwork(WifiContext.currentNetwork);
            }
          });
        }
        SettingsSoftkey.init(softkeyParams);
        SettingsSoftkey.show();
      },

      updateItemPosition(network) {
        const key = WifiUtils.getNetworkKey(network);
        const connectedItem = elements.wifiNetworkList.index[key];
        if (!connectedItem) {
          return;
        }

        const list = elements.wifiAvailableNetworks;
        if (list.children.length !== 0) {
          let item = null;
          for (let i = 0; i < list.children.length; i++) {
            item = list.children[i];
            if (
              key === WifiUtils.getNetworkKey(JSON.parse(item.dataset.network))
            ) {
              list.removeChild(item);
              list.insertBefore(connectedItem, list.children[0]);
            }
          }
        } else {
          list.appendChild(connectedItem);
        }
        list.children[0].focus();
        const evt = new CustomEvent('refresh');
        window.dispatchEvent(evt);
      },

      wapiWifiStateChange(event) {
        if (!event.network) {
          return;
        }

        const { ssid } = event.network;
        const { security } = event.network;
        if (security !== 'WAPI-PSK' && security !== 'WAPI-CERT') {
          return;
        }

        const li = elements.panel.querySelectorAll('li.wifi');
        for (let i = 0; i < li.length; i++) {
          if (ssid === li[i].querySelector('span.ssid').textContent) {
            li[i].querySelector('a').removeAttribute('href');
            // eslint-disable-next-line
            li[i].querySelector('a').onclick = e => {
              elements.wifiNetworkList.toggleNetwork(event.network);
              e.stopPropagation();
            };
          }
        }
      },

      onWifiStatusChange(event) {
        if (event.status === 'connected') {
          if (this.wifiSectionVisible) {
            refreshPanel();
          } else {
            this.scanPending = true;
          }
          this.wifiConnecting = false;
          this.updateSoftkey('rescan');
          if (elements.wifiNetworkList) {
            this.updateItemPosition(event.network);
          }
        }

        if (elements.wifiNetworkList) {
          const list = elements.wifiAvailableNetworks;
          if (event.status === 'connected' || event.status === 'disconnected') {
            this.wapiWifiStateChange(event);
            if (list.dataset.ssid === event.network.ssid) {
              list.dataset.ssid = null;
            }
          }

          WifiUtils.updateListItemStatus({
            listItems: elements.wifiNetworkList.index,
            activeItemDOM: list.querySelector('.active'),
            network: event.network,
            networkStatus: event.status
          });
        }
      },

      handleKeydown(e) {
        switch (e.key) {
          case 'BrowserBack':
          case 'Backspace':
          case 'KanjiMode':
            Settings.isBackHref = true;
            Settings.setCurrentPanel('#wifi');
            break;
          default:
            break;
        }
      },

      handleFocusChanged(event) {
        this.doUpdateSoftkey(event.detail.focusedElement);
      },
      doUpdateSoftkey(focusedElement) {
        if (this.wifiConnecting) {
          let ssid = null;
          if (
            wifiManager &&
            wifiManager.connection &&
            wifiManager.connection.network
          ) {
            // eslint-disable-next-line
            ssid = wifiManager.connection.network.ssid;
          } else {
            return;
          }
          if (focusedElement.dataset.ssid === ssid) {
            this.updateSoftkey('forget');
          } else {
            this.updateSoftkey('none');
          }
        } else {
          this.updateSoftkey('rescan');
        }
      },
      initpanelready() {
        window.dispatchEvent(new CustomEvent('refresh'));
      },
      updateVisibilityStatus() {
        this.getNetworkList().then(networkList => {
          if (this.scanPending) {
            networkList.scan();
            this.scanPending = false;
          }
        });
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
        const network = WifiContext.currentNetwork;

        const onConfirm = () => {
          if (bodyId === 'wifi-authentication-failed') {
            this.getNetworkList().then(networkList => {
              networkList.toggleNetwork(network, bodyId);
            });
          }
        };

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
              onConfirm();
            }
          }
        };

        DialogHelper.show(dialogConfig);
      },
      getNetworkList() {
        if (!this.networkListPromise) {
          this.networkListPromise = new Promise(resolve => {
            require([
              'panels/wifi_available_networks/wifi_network_list'
            ], WifiNetworkList => {
              resolve(
                WifiNetworkList(
                  elements.networklist,
                  this.initpanelready.bind(this)
                )
              );
            });
          });
        }
        return this.networkListPromise;
      },
      forgetNetwork(network) {
        const dialogConfig = {
          title: { id: 'forgetNetwork-confirmation', args: {} },
          body: { id: 'forgetNetwork-dialog', args: {} },
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
              WifiContext.forgetNetwork(network, () => {
                this.getNetworkList().then(networkList => {
                  ToastHelper.showToast('networkforget');
                  networkList.scan();
                });
              });
              DialogHelper.destroy();
            }
          }
        };

        DialogHelper.show(dialogConfig);
      }
    });
  };
});
