/* global  */

// eslint-disable-next-line
define(['require','modules/settings_panel','modules/wifi/wifi_utils','modules/wifi/wifi_context'],function(require) {
  const SettingsPanel = require('modules/settings_panel');
  const WifiUtils = require('modules/wifi/wifi_utils');
  const WifiContext = require('modules/wifi/wifi_context');

  return function ctorAuthWapi() {
    let elements = {};
    const certificateFile = {};
    const listElements = document.querySelectorAll('#wifi_auth_wapi li');

    function wifiAuthPanelAriaDisable(enabled) {
      const list = listElements;
      if (!list) {
        return;
      }

      for (let i = 0; i < list.length; i++) {
        if (list[i].hidden === false && enabled) {
          list[i].setAttribute('aria-disabled', true);
        } else if (list[i].hidden === false && !enabled) {
          list[i].removeAttribute('aria-disabled');
        }
      }

      const searchStr = '#wifi_auth_wapi li input';
      const listInput = elements.panel.querySelectorAll(searchStr);

      for (let i = 0; i < listInput.length; i++) {
        if (listInput[i].hidden === false && enabled) {
          listInput[i].setAttribute('disabled', 'disabled');
        } else if (listInput[i].hidden === false && !enabled) {
          listInput[i].removeAttribute('disabled', 'disabled');
        }
      }

      if (enabled) {
        NavigationMap.menuReset(elements.panel.querySelector('.focus'), false);
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
          callback: () => {
            DialogHelper.destroy();
            updateSoftKey(false, false, true);
          }
        },
        confirm: {
          l10nId: 'forget',
          priority: 3,
          callback: () => {
            DialogHelper.destroy();

            const network = {};
            const security = [elements.panel.dataset.security];

            network.ssid = elements.ssid.textContent;
            network.security = security;
            network.keyManagement = elements.panel.dataset.security;

            WifiContext.forgetNetwork(new window.WifiNetwork(network), () => {
              ToastHelper.showToast('networkforget');
            });
            WifiUtils.toggleLogin = false;
            Settings.setCurrentPanel('wifi_available_networks');
          }
        },
        backcallback: () => {
          DialogHelper.destroy();
          updateSoftKey(false, false, true);
        }
      };
      DialogHelper.show(dialogConfig);
    }

    function enableSoftKey(evt) {
      updateSoftKey(evt.detail.enabled);
    }

    function updateSoftKey(enabled, csk, connecting) {
      const connect = {
        name: 'Connect',
        l10nId: 'device-option-connect',
        priority: 3,
        method: () => {
          elements.connectFlag = true;
          wifiAuthPanelAriaDisable(true);
          updateSoftKey(false, false, true);
          connectNetwork();
        }
      };

      const select = {
        name: 'Select',
        l10nId: 'select',
        priority: 2
      };

      const forget = {
        name: 'Forget',
        l10nId: 'forget',
        priority: 1,
        method: () => {
          showConfirmDialog();
        }
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
      if (enabled && elements.ssid.textContent.length) {
        softkeyParams.items.push(connect);
      }

      if (connecting) {
        softkeyParams.items.push(forget);
      }

      if ((enabled || csk || connecting) && softkeyParams.items.length) {
        SettingsSoftkey.init(softkeyParams);
        SettingsSoftkey.show();
      } else {
        SettingsSoftkey.hide();
      }
    }

    function initCertificateData() {
      SettingsDBCache.saveSettings({
        'settings.wifi.certificatefile': null
      });

      certificateFile.fileASU = null;
      certificateFile.fileUser = null;

      const itemASU = elements.certificateASU.querySelector('small');
      const itemUser = elements.certificateUser.querySelector('small');
      const noneString = l10n.get('none');
      if (itemASU) {
        itemASU.textContent = noneString;
      }
      if (itemUser) {
        itemUser.textContent = noneString;
      }
    }

    function connectNetwork() {
      const network = {};
      const security = [elements.panel.dataset.security];

      network.ssid = elements.ssid.textContent;
      network.security = security;
      network.keyManagement = elements.panel.dataset.security;

      if (elements.panel.dataset.security === 'WAPI-PSK') {
        // eslint-disable-next-line
        network.wapi_psk = elements.password.value;
        network.pskType = elements.hexmode.checked ? 'HEX' : null;
      }
      if (elements.panel.dataset.security === 'WAPI-CERT') {
        network.wapiAsCertificate = certificateFile.fileASU;
        network.wapiUserCertificate = certificateFile.fileUser;
      }

      WifiContext.associateNetwork(new window.WifiNetwork(network));
      initCertificateData();
    }

    function keydownHandler(evt) {
      switch (evt.key) {
        case 'Backspace':
          if (!elements.connectFlag) {
            initCertificateData();
            WifiUtils.toggleLogin = false;
            Settings.setCurrentPanel('wifi_available_networks');
          }
          break;
        case 'ArrowUp':
        case 'ArrowDown':
          if (elements.connectFlag) {
            updateSoftKey(false, false, true);
          }
          break;
        default:
          break;
      }
    }

    function handleFocus() {
      const input = elements.panel.querySelector('li.focus input');
      const select = elements.panel.querySelector('li.focus.csk-select');
      const enabled = checkConnectSoftkeyState();
      if (input) {
        input.focus();
      }
      updateSoftKey(enabled, !!select);
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
      const select = elements.panel.querySelector('li.focus.csk-select');
      if (enabled) {
        updateSoftKey(enabled, !!select);
      }
    }

    function checkConnectSoftkeyState() {
      const noneString = l10n.get('none');
      const key = elements.securityType;
      const password = elements.password.value;

      if (key === 'WAPI-PSK' && password && password.length >= 8) {
        return true;
      }

      const itemASU = elements.certificateASU.querySelector('small');
      if (
        key === 'WAPI-CERT' &&
        itemASU &&
        itemASU.textContent !== noneString
      ) {
        return true;
      }

      return false;
    }

    function handleWifiNetwork(networkStr) {
      const network = JSON.parse(networkStr);
      WifiUtils.initializeAuthFields(elements.panel, network);
      WifiUtils.changeDisplay(elements.panel, network.security);

      elements.panel.dataset.security = network.security;
      elements.ssid.textContent = network.ssid;
      elements.signal.setAttribute(
        'data-l10n-id',
        `signalLevel${Math.min(Math.floor(network.relSignalStrength / 20), 4)}`
      );

      if (network.security) {
        elements.security.removeAttribute('data-l10n-id');
        elements.security.textContent = network.security;
        elements.securityType = network.security;
      } else {
        elements.security.setAttribute('data-l10n-id', 'securityNone');
      }

      const enabled = checkConnectSoftkeyState();
      if (enabled) {
        updateSoftKey(enabled);
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          panel,
          connectFlag: false,
          securityType: '',
          ssid: panel.querySelector('[data-ssid-auth-wapi]'),
          signal: panel.querySelector('[data-signal]'),
          security: panel.querySelector('[data-security]'),
          identity: panel.querySelector('input[name=identity]'),
          password: panel.querySelector('input[name=password]'),
          showPassword: panel.querySelector('input[name=show-pwd]'),
          eap: panel.querySelector('li.eap select'),
          authPhase2: panel.querySelector('li.auth-phase2 select'),
          keyIndex: panel.querySelector('li.key-index select'),
          certificate: panel.querySelector('li.server-certificate select'),
          hexmode: panel.querySelector('input[name=hexmode]'),
          certificateASU: panel.querySelector('li.ASU-Certificate'),
          certificateUser: panel.querySelector('li.User-Certificate')
        };

        this.onWifiStatusChange = this.onWifiStatusChange.bind(this);
        this.openWrongPasswordDialog = this.openWrongPasswordDialog.bind(this);
        this.openConnetingFailedDialog = this.openConnetingFailedDialog.bind(
          this
        );
        this.openObtainingIPFailedDialog = this.openObtainingIPFailedDialog.bind(
          this
        );
      },
      onBeforeShow() {
        updateSoftKey(checkConnectSoftkeyState());
        wifiAuthPanelAriaDisable(false);
        elements.connectFlag = false;

        if (
          NavigationMap.currentSection !== '#wifi_select_wlan_certificate_file'
        ) {
          SettingsDBCache.observe(
            'settings.wifi.network',
            '',
            handleWifiNetwork
          );
        }

        window.addEventListener('enable-connect-softkey', enableSoftKey);
        window.addEventListener('keydown', keydownHandler);
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
        ListFocusHelper.addEventListener(listElements, handleFocus);
        elements.password.value = '';
      },
      onShow() {
        SettingsDBCache.observe(
          'settings.wifi.certificatefile',
          '',
          handleCertificateFile
        );
      },
      onHide() {
        elements.identity.value = '';
        elements.password.value = '';
        elements.showPassword.checked = false;
      },
      onBeforeHide() {
        SettingsDBCache.unobserve('settings.wifi.network', handleWifiNetwork);
        SettingsDBCache.unobserve(
          'settings.wifi.certificatefile',
          handleCertificateFile
        );

        window.removeEventListener('enable-connect-softkey', enableSoftKey);
        window.removeEventListener('keydown', keydownHandler);
        ListFocusHelper.removeEventListener(listElements, handleFocus);
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

      onWifiStatusChange(event) {
        const { status } = event;
        if (event.network.ssid !== elements.ssid.textContent) {
          return;
        }

        if (status === 'connecting' || status === 'associated') {
          elements.panel
            .querySelector('.wifi-security small')
            .setAttribute('data-l10n-id', `shortStatus-${status}`);
        } else if (status === 'connected') {
          wifiAuthPanelAriaDisable(false);
          elements.connectFlag = false;
          WifiUtils.toggleLogin = false;
          Settings.setCurrentPanel('wifi_available_networks');
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
        const dialogConfig = {
          title: {
            id: 'wifi-bad-credentials-title',
            args: {}
          },
          body: {
            id: bodyId,
            args: {
              ssid: elements.ssid.textContent
            }
          },
          accept: {
            l10nId: 'ok',
            priority: 2,
            callback: () => {
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
      }
    });
  };
});
