/* global DeviceStorageHelper */

define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createStoragePanel() {
    let elements = {};
    const listElements = document.querySelectorAll(
      '#media_storage_location li'
    );
    const sizeList = {
      total: null,
      sdcard: null,
      apps: null
    };

    const updateSystemSize = function updateSystemSize() {
      if (sizeList.total && sizeList.sdcard && sizeList.apps) {
        const systemSize = sizeList.total - sizeList.sdcard - sizeList.apps;
        DeviceStorageHelper.showFormatedSize(
          elements.systemStorageDesc,
          'storageSize',
          parseInt(systemSize, 10)
        );
      }
    };

    const updateStorageSize = function updateStorageSize(
      deviceStorage,
      element,
      type
    ) {
      const results = {};
      const MIN_SIZE =
        type === 'apps' ? Constants.MIN_APP_SIZE : Constants.MIN_MEDIA_SIZE;
      deviceStorage.usedSpace().then(usedSize => {
        results.used = usedSize;
        deviceStorage.freeSpace().then(freeSize => {
          results.free = freeSize;
          results.total = usedSize + freeSize;
          DeviceStorageHelper.showFormatedSizeOfUsedAndTotal(
            element,
            'usedOfTotal',
            results
          );

          if (freeSize <= MIN_SIZE) {
            element.parentNode.setAttribute('data-state', 'no-space');
          } else {
            element.parentNode.removeAttribute('data-state');
          }
          if (type === 'sdcard1') {
            DeviceStorageHelper.showFormatedSize(
              elements.headerSdcardSize,
              'storage-name-external-0-size',
              results.total
            );
          } else {
            sizeList[type] = results.total;
            updateSystemSize();
          }
        });
      });
    };

    const updateStorageInfo = function updateStorageInfo() {
      updateStorageSize(
        ApiManager.getDeviceStorages('sdcard')[0],
        elements.mediaInternalDesc,
        'sdcard'
      );
      updateStorageSize(
        ApiManager.getDeviceStorage('apps'),
        elements.appStorageDesc,
        'apps'
      );

      if (ApiManager.getDeviceStorages('sdcard').length > 1) {
        ApiManager.getDeviceStorages('sdcard')[1]
          .available()
          .then(value => {
            if (value === 'available') {
              elements.mediaSdcardHeader.classList.remove('hidden');
              elements.mediaSdcard.classList.remove('hidden');
              elements.locationItem.classList.remove('none-select');
              elements.locationItem.removeAttribute('aria-disabled');
              updateStorageSize(
                ApiManager.getDeviceStorages('sdcard')[1],
                elements.mediaSdcardDesc,
                'sdcard1'
              );
              window.dispatchEvent(new CustomEvent('refresh'));
            } else {
              elements.locationItem.classList.add('none-select');
              elements.locationItem.setAttribute('aria-disabled', true);
            }
          });
      }
    };

    return SettingsPanel({
      onInit(panel) {
        elements = {
          cleanUpButton: panel.querySelector('.clean-up'),
          locationItem: panel.querySelector('#location-item'),
          headerInternalSize: panel.querySelector('#header-internal-size'),
          mediaInternal: panel.querySelector('#storage-media-internal'),
          mediaInternalDesc: panel.querySelector('#media-internal-desc'),
          applicationItem: panel.querySelector('#storage-application'),
          appStorageDesc: panel.querySelector('#application-storage-desc'),
          systemStorageDesc: panel.querySelector('#system-storage-desc'),
          mediaSdcardHeader: panel.querySelector('#media-sdcard-header'),
          headerSdcardSize: panel.querySelector('#header-sdcard-size'),
          mediaSdcard: panel.querySelector('#storage-media-sdcard'),
          mediaSdcardDesc: panel.querySelector('#media-sdcard-desc')
        };

        elements.cleanUpButton.onclick = () => {
          Settings.setCurrentPanel('application_storage', {
            originHref: '#media_storage_location'
          });
        };
        elements.applicationItem.onclick = () => {
          Settings.setCurrentPanel('application_storage', {
            originHref: '#media_storage_location'
          });
        };
        elements.locationItem.onclick = evt => {
          const { target } = evt;
          if (
            target.id === 'location-item' &&
            !elements.locationItem.hasAttribute('aria-disabled')
          ) {
            const locationConfig = {
              title: {
                id: 'confirmation',
                args: {}
              },
              body: {
                id: 'change-default-media-location-confirmation',
                args: {}
              },
              cancel: {
                name: 'Cancel',
                l10nId: 'cancel',
                priority: 1
              },
              confirm: {
                name: 'Change',
                l10nId: 'change',
                priority: 3,
                callback() {
                  const select = elements.locationItem.querySelector('select');
                  select.focus();
                }
              }
            };
            DialogHelper.show(locationConfig);
          }
        };
        elements.mediaInternal.onclick = () => {
          Settings.setCurrentPanel('media_storage', {
            originHref: '#media_storage_location',
            type: 'sdcard'
          });
        };
        elements.mediaSdcard.onclick = () => {
          Settings.setCurrentPanel('media_storage', {
            originHref: '#media_storage_location',
            type: 'sdcard1'
          });
        };

        DeviceFeature.ready(() => {
          const size = DeviceFeature.getValue('totalSize');
          const totalSize = parseInt(size, 10);
          DeviceStorageHelper.showFormatedSize(
            elements.headerInternalSize,
            'storage-name-internal-size',
            totalSize
          );
          sizeList.total = totalSize;
          updateSystemSize();
        });
        window.addEventListener('keydown', evt => {
          if (evt.key === 'Backspace') {
            if (
              document.activeElement.type === 'select-one' ||
              NavigationMap.currentActivatedLength > 0 ||
              Settings.isBackHref
            ) {
              return;
            }
            ActivityHandler.postResult();
          }
        });
      },

      onBeforeShow(panel) {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        ListFocusHelper.updateSoftkey(panel);
        updateStorageInfo();
        ListFocusHelper.addEventListener(listElements);
      },

      onBeforeHide() {
        ListFocusHelper.removeEventListener(listElements);
      }
    });
  };
});
