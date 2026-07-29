/* global enumerateAll */

// eslint-disable-next-line
define('panels/wifi_select_certificate_file/panel',['require','modules/settings_panel'],function(require) {
  const SettingsPanel = require('modules/settings_panel');

  return function ctorSelectCertificateWifi() {
    let elements = {};

    function initSoftKey() {
      const softkeyParams = {
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

      SettingsSoftkey.init(softkeyParams);
      SettingsSoftkey.show();
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          panel,
          certificateFilesList: panel.querySelector(
            '.wifi-certificate-files-List'
          ),
          noCertFiles: panel.querySelector('.no-certificate-files'),
          wifiEnterCertPanelStatus: false
        };
      },

      onBeforeShow() {
        this.cleanup();
        this.createScanList(elements.certificateFilesList);
        window.addEventListener('keydown', this.handleKeydown);
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        elements.wifiEnterCertPanelStatus = false;
        window.removeEventListener('keydown', this.handleKeydown);
      },

      handleKeydown(e) {
        switch (e.key) {
          case 'Backspace':
            Settings.setCurrentPanel('wifi_manage_certificates');
            break;
          default:
            break;
        }
      },

      cleanup() {
        elements.certificateFilesList.classList.add('hidden');
        elements.noCertFiles.classList.add('hidden');
        // Clear the certificate files list
        while (elements.certificateFilesList.hasChildNodes()) {
          elements.certificateFilesList.removeChild(
            elements.certificateFilesList.lastChild
          );
        }
      },

      changeDisplay(value) {
        elements.certificateFilesList.classList.toggle('hidden', !value);
        elements.noCertFiles.classList.toggle('hidden', value);
      },

      createScanList(list) {
        const storages = navigator.b2g.getDeviceStorages('sdcard');
        enumerateAll(storages).then(files => {
          files.forEach(file => {
            const extension = this.parseExtension(file.name);
            if (this.isCertificateFile(extension)) {
              const li = this.createLinkAnchor(file);
              li.setAttribute('role', 'menuitem');
              list.appendChild(li);
            }
          });
          this.changeDisplay(list.children.length > 0);
          if (list.children.length > 0) {
            initSoftKey();
          }
          window.dispatchEvent(new CustomEvent('refresh'));
        });
      },
      setCertificateItemsEnabled(enabled) {
        const items = elements.certificateFilesList.querySelectorAll('li');
        let update = null;
        if (enabled) {
          update = item => {
            item.classList.remove('disabled');
          };
        } else {
          update = item => {
            item.classList.add('disabled');
          };
        }
        for (let i = 0; i < items.length; i++) {
          update(items[i]);
        }
      },
      createLinkAnchor(file) {
        // Create anchor
        const anchor = document.createElement('a');
        const certificateName = this.parseFilename(file.name);
        anchor.textContent = certificateName;

        const li = document.createElement('li');
        li.appendChild(anchor);

        anchor.onclick = () => {
          Settings.setCurrentPanel('#wifi_enter_certificate_nickname', file);
        };
        return li;
      },
      parseFilename(path) {
        return path.slice(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));
      },
      parseExtension(filename) {
        const array = filename.split('.');
        return array.length > 1 ? array.pop() : '';
      },
      isCertificateFile(extension) {
        const cerExtension = ['cer', 'crt', 'pem', 'der', 'p12', 'pfx'];
        return cerExtension.indexOf(extension) > -1;
      }
    });
  };
});

