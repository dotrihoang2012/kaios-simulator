/* global enumerateAll */

// eslint-disable-next-line
define(['require','modules/settings_panel'],function(require) {
  const SettingsPanel = require('modules/settings_panel');
  const EnumerateAll = enumerateAll;

  return function ctorSelectWlanCertificateWifi() {
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
            priority: 2,
            method() {
              const li = elements.panel.querySelector('li.focus');

              SettingsDBCache.saveSettings({
                'settings.wifi.certificatefile': li.dataset.fullName
              });

              Settings.setCurrentPanel(NavigationMap.previousSection.slice(1));
            }
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
          wlanCertificateFilesList: panel.querySelector(
            '.wifi-wlan-certificate-files-List'
          )
        };
        this.dialogPanelShow = false;
        this.certificateFileNumFlag = false;
      },
      onBeforeShow() {
        this.cleanup();
      },
      onShow() {
        this.createScanList(elements.wlanCertificateFilesList);
        const header = elements.panel.querySelector('gaia-header');
        const previousSection = NavigationMap.previousSection.slice(1);
        if (header) {
          header.setAttribute('data-href', previousSection);
        }
      },

      cleanup() {
        // Clear the certificate files list
        while (elements.wlanCertificateFilesList.hasChildNodes()) {
          elements.wlanCertificateFilesList.removeChild(
            elements.wlanCertificateFilesList.lastChild
          );
        }
      },

      replaceFilePath(storages, fileName) {
        const string = `/${storages.storageName}/`;
        const path = `${storages.storagePath}/`;

        return fileName.replace(string, path);
      },

      // eslint-disable-next-line
      getFileAbsolutePath(storages, fileName) {
        for (let i = 0; i < storages.length; i++) {
          if (fileName.indexOf(`${storages[i].storageName}/`) >= 0) {
            return this.replaceFilePath(storages[i], fileName);
          }
        }
      },

      createScanList(list) {
        const storages = navigator.b2g.getDeviceStorages('sdcard');
        const cursor = EnumerateAll(storages, '');
        const itemText = document.getElementById('wifi-wapi-confirm-dialog');

        itemText.classList.add('hidden');

        cursor.onsuccess = () => {
          const file = cursor.result;
          if (file) {
            const extension = this.parseExtension(file.name);
            if (this.isWlanCertificateFile(extension)) {
              const fullName = this.getFileAbsolutePath(storages, file.name);
              const li = this.createLinkAnchor(fullName);
              li.setAttribute('role', 'menuitem');
              list.appendChild(li);
              this.certificateFileNumFlag = true;
            }
            cursor.continue();
          } else {
            NavigationMap.menuReset(null, false);

            itemText.classList.toggle('hidden', this.certificateFileNumFlag);
            if (this.certificateFileNumFlag) {
              initSoftKey();
            } else {
              SettingsSoftkey.hide();
            }
          }
        };

        cursor.onerror = () => {
          itemText.classList.remove('hidden');
          console.warn(`failed to get file:${cursor.error.name}`);
        };
      },
      _setWlanCertificateItemsEnabled(enabled) {
        const items = elements.wlanCertificateFilesList.querySelectorAll('li');
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
      createLinkAnchor(fileName) {
        // Create anchor
        const anchor = document.createElement('a');
        const wlanCertificateName = this.parseFilename(fileName);
        anchor.textContent = wlanCertificateName;

        const li = document.createElement('li');
        li.appendChild(anchor);
        li.dataset.fullName = fileName;
        li.dataset.name = wlanCertificateName;

        return li;
      },
      parseFilename(path) {
        return path.slice(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));
      },
      parseExtension(filename) {
        const array = filename.split('.');
        return array.length > 1 ? array.pop() : '';
      },
      isWlanCertificateFile(extension) {
        const cerExtension = ['cer', 'crt', 'pem', 'der', 'p12', 'pfx'];
        return cerExtension.indexOf(extension) > -1;
      }
    });
  };
});
