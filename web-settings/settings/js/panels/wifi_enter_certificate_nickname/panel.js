/* global WifiHelper */

// eslint-disable-next-line
define('panels/wifi_enter_certificate_nickname/panel',['require','modules/settings_panel'],function(require) {
  const SettingsPanel = require('modules/settings_panel');
  const wifiManager = WifiHelper.getWifiManager();

  return function ctorWifiEnterCertificateNickname() {
    let elements = {};

    return SettingsPanel({
      onInit(panel, options) {
        elements = {
          panel,
          options,
          nickname: panel.querySelector('.nickname'),
          nicknameInput: panel.querySelector('.certificate-file-nickname')
        };

        this.onInputChange = this.onInputChange.bind(this);
        this.addInputFocusEvent = this.addInputFocusEvent.bind(this);
      },

      onBeforeShow(panel, options) {
        elements.options = options;
        this.updateSoftKey(true);
        elements.nicknameInput.value = this.parseFilename(
          elements.options.name
        );
        elements.nickname.addEventListener('focus', this.addInputFocusEvent);
        elements.nicknameInput.addEventListener('input', this.onInputChange);
      },

      onBeforeHide() {
        elements.nickname.removeEventListener('focus', this.addInputFocusEvent);
        elements.nicknameInput.removeEventListener('input', this.onInputChange);
      },

      parseFilename(path) {
        return path.slice(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));
      },

      saveCertificateFileName() {
        const certRequest = wifiManager.importCert(
          elements.options,
          '',
          elements.nicknameInput.value
        );

        /*
         * Gray out all item of certificate files
         * since we are importing other file.
         */
        certRequest.onsuccess = () => {
          // Direct dialog to "wifi_manage_certificates"
          Settings.setCurrentPanel('wifi_manage_certificates');
        };

        certRequest.onerror = () => {
          Settings.setCurrentPanel('wifi_manage_certificates', {
            message: certRequest.error.message
          });
        };
      },

      updateSoftKey(doneSoftkeyEnable) {
        const params = {
          menuClassName: 'menu-button',
          header: {
            l10nId: 'message'
          },
          items: [
            {
              name: 'Cancel',
              l10nId: 'cancel',
              priority: 1,
              method() {
                NavigationMap.navigateBack();
              }
            }
          ]
        };

        if (doneSoftkeyEnable) {
          params.items.push({
            name: 'Save',
            l10nId: 'save',
            priority: 3,
            method: () => {
              this.saveCertificateFileName();
            }
          });
        } else {
          params.items.slice(1, 1);
        }

        SettingsSoftkey.init(params);
        SettingsSoftkey.show();
      },

      addInputFocusEvent() {
        const nicknameInput = elements.panel.querySelector(
          '.certificate-file-nickname'
        );
        nicknameInput.focus();
        nicknameInput.selectionStart = nicknameInput.value.length;
      },

      onInputChange() {
        const enabled = elements.nicknameInput.value.length !== 0 || false;
        this.updateSoftKey(enabled);
      }
    });
  };
});

