/* global DeviceStorageHelper */

define(['require','modules/settings_panel'],function(require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function creatMediaPanel() {
    const MEDIA_TYPE = ['music', 'pictures', 'videos', 'sdcard'];
    const ITEM_TYPE = ['music', 'pictures', 'videos', 'other', 'free'];
    let elements = null;
    let listElements = null;
    let storageType = 'sdcard';
    let deviceStorage = null;
    let storageStatus = null;
    let stackedBarHandler = null;

    const StackedBar = function StackedBar(div) {
      const container = div;
      let items = [];
      let totalSize = 0;

      return {
        add: function add(item) {
          totalSize += item.value;
          items.push(item);
        },

        refreshUI: function refreshUI() {
          container.parentNode.setAttribute('aria-disabled', false);
          container.parentNode.classList.remove('none-select');
          container.classList.remove('hidden');
          const { clientWidth } = container;
          let totalWidths = 100;
          items.sort((a, b) => {
            a = a.value;
            b = b.value;
            return a - b;
          });
          items.forEach(item => {
            let width = 0;
            if (
              item.value > 0 &&
              (item.value * 100) / totalSize < (1 * 100) / clientWidth
            ) {
              width = (1 * 100) / clientWidth;
            } else {
              width = (item.value * 100) / totalSize;
            }
            if (width < totalWidths) {
              totalWidths -= width;
            } else {
              width = totalWidths;
              totalWidths = 0;
            }
            item.width = width;
          });

          let results = [];
          for (let i = 0; i < ITEM_TYPE.length; i++) {
            results = results.concat(
              items.filter(m => m.type === ITEM_TYPE[i])
            );
          }
          results.forEach(item => {
            const className = `color-${item.type}`;
            let ele = container.querySelector(`.${className}`);
            if (!ele) {
              ele = document.createElement('span');
              ele.classList.add(className);
              ele.classList.add('stackedbar-item');
              container.appendChild(ele);
            }
            ele.style.width = `${item.width}%`;
          });
        },

        reset: function reset() {
          items = [];
          totalSize = 0;
          container.parentNode.setAttribute('aria-disabled', true);
          container.parentNode.classList.add('none-select');
          container.classList.add('hidden');
        }
      };
    };

    function getStorage(type, storageName) {
      const deviceStorages = ApiManager.getDeviceStorages(type);
      if (deviceStorages.length > 1) {
        if (deviceStorages[0].storageName === storageName) {
          return deviceStorages[0];
        }
        return deviceStorages[1];
      }
      return deviceStorages[0];
    }

    function updateStorageInfo() {
      const results = {};
      let current = MEDIA_TYPE.length;
      MEDIA_TYPE.forEach(type => {
        const storage = getStorage(type, storageType);
        storage.usedSpace().then(sizeValue => {
          results[type] = sizeValue;
          current--;
          if (current === 0) {
            storage.freeSpace().then(freeSize => {
              results.free = freeSize;
              results.other =
                results.sdcard -
                results.music -
                results.pictures -
                results.videos;

              stackedBarHandler.reset();
              ITEM_TYPE.forEach(item => {
                const element = elements.currentPanel.querySelector(
                  `.color-${item} .size`
                );
                DeviceStorageHelper.showFormatedSize(
                  element,
                  'storageSize',
                  results[item]
                );
                stackedBarHandler.add({ type: item, value: results[item] });
              });
              stackedBarHandler.refreshUI();

              // Update total space size
              const element = elements.currentPanel.querySelector(
                '[data-l10n-id="total-space"] + .size'
              );
              DeviceStorageHelper.showFormatedSize(
                element,
                'storageSize',
                results.sdcard + results.free
              );
              element.classList.remove('hidden');
            });
          }
        });
      });
    }

    function enableFormatSDCardBtn(enabled) {
      if (deviceStorage.canBeFormatted) {
        // Enable/disable button
        if (!enabled) {
          elements.mediaFormat.setAttribute('aria-disabled', true);
          elements.mediaFormat.classList.add('none-select');
        } else {
          elements.mediaFormat.removeAttribute('aria-disabled');
          elements.mediaFormat.classList.remove('none-select');
        }
        window.dispatchEvent(new CustomEvent('refresh'));
      }
    }

    function setInfoUnavailable() {
      ITEM_TYPE.forEach(type => {
        const rule = `.color-${type} .size`;
        const element = elements.currentPanel.querySelector(rule);
        element.setAttribute('data-l10n-id', 'size-not-available');
      });
      // Set total space info.
      const element = elements.currentPanel.querySelector('.total-space .size');
      element.setAttribute('data-l10n-id', 'size-not-available');
      stackedBarHandler.reset();
    }

    function enableStorageInfo(enabled) {
      // The storage details
      ITEM_TYPE.forEach(type => {
        const rule = `li.color-${type}`;
        const element = elements.currentPanel.querySelector(rule);
        element.setAttribute('aria-disabled', !enabled);
        if (!enabled) {
          element.classList.add('none-select');
        } else {
          element.classList.remove('none-select');
        }
      });

      // Total space size
      const rule = 'li.total-space';
      const element = elements.currentPanel.querySelector(rule);
      element.setAttribute('aria-disabled', !enabled);
      if (!enabled) {
        element.classList.add('none-select');
      } else {
        element.classList.remove('none-select');
      }
    }

    function updateInfo() {
      deviceStorage.available().then(state => {
        switch (state) {
          case 'shared':
            setInfoUnavailable();
            enableStorageInfo(false);
            break;
          case 'unavailable':
            setInfoUnavailable();
            enableStorageInfo(false);
            enableFormatSDCardBtn(false);
            break;
          case 'available':
            updateStorageInfo();
            enableStorageInfo(true);
            enableFormatSDCardBtn(true);
            break;
          default:
            break;
        }
      });
    }

    function updateUIState(status) {
      switch (status) {
        case 'Init':
        case 'NoMedia':
        case 'Pending':
        case 'Unmounting':
          enableFormatSDCardBtn(false);
          break;
        case 'Shared':
        case 'Shared-Mounted':
          enableFormatSDCardBtn(false);
          break;
        case 'Formatting':
          enableFormatSDCardBtn(false, true);
          /*
           * Set isFormatting flag to be false after button updated already,
           * Because we can not reset it in idle status.
           */
          ToastHelper.showToast('sdcardformatted');
          break;
        case 'Checking':
          break;
        case 'Idle': // Means Unmounted
          Settings.setCurrentPanel('root');
          break;
        case 'Mounted':
          enableFormatSDCardBtn(true);
          break;
        default:
          break;
      }
    }

    function formatSDCard() {
      const dialogConfig = {
        title: { id: 'format-sdcard-title', args: {} },
        body: { id: 'format-sdcard-message', args: {} },
        cancel: {
          l10nId: 'cancel',
          priority: 1,
          callback: () => {}
        },
        confirm: {
          l10nId: 'format-sdcard-btnformat',
          priority: 3,
          callback: () => {
            deviceStorage.format();
          }
        }
      };
      DialogHelper.show(dialogConfig);
    }

    function handleEvent(evt) {
      switch (evt.type) {
        case 'click':
          {
            const { target } = evt;
            switch (target.id) {
              case 'media-format':
                if (!target.hasAttribute('aria-disabled')) {
                  formatSDCard();
                }
                break;
              default:
                break;
            }
          }
          break;
        case 'change':
          updateInfo();
          break;
        case 'storage-state-change':
          storageStatus = evt.reason;
          updateUIState(storageStatus);
          break;
        default:
          break;
      }
    }

    function updateSoftKey() {
      const params = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: [
          {
            name: 'Open',
            l10nId: 'open',
            priority: 2,
            method() {
              const focusedElement = elements.currentPanel.querySelector(
                '.focus'
              );
              let manifestUrl = null;
              if (focusedElement.classList.contains('color-music')) {
                manifestUrl = window.AppOrigin.getManifestURL('music');
              } else if (focusedElement.classList.contains('color-pictures')) {
                manifestUrl = window.AppOrigin.getManifestURL('gallery');
              } else if (focusedElement.classList.contains('color-videos')) {
                manifestUrl = window.AppOrigin.getManifestURL('video');
              } else if (focusedElement.classList.contains('color-other')) {
                manifestUrl = window.AppOrigin.getManifestURL('filemanager');
              }
              window.open(manifestUrl, '_blank', 'kind=app,noopener=yes');
            }
          }
        ]
      };

      const focusedElement = elements.currentPanel.querySelector('.focus');
      if (
        focusedElement.classList.contains('color-music') ||
        focusedElement.classList.contains('color-pictures') ||
        focusedElement.classList.contains('color-videos') ||
        focusedElement.classList.contains('color-other')
      ) {
        SettingsSoftkey.init(params);
        SettingsSoftkey.show();
      } else if ('media-format' === focusedElement.id) {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
      } else {
        SettingsSoftkey.hide();
      }
    }

    return SettingsPanel({
      onInit(panel, option) {
        storageType = option.type;
        deviceStorage = getStorage('sdcard', storageType);
        elements = {
          currentPanel: panel,
          header: panel.querySelector('gaia-header'),
          stackedBar: panel.querySelector('#space-stacked-bar'),
          mediaMusic: panel.querySelector('#media-music'),
          mediaPictures: panel.querySelector('#media-pictures'),
          mediaVideos: panel.querySelector('#media-videos'),
          mediaFree: panel.querySelector('#media-free'),
          mediaTotal: panel.querySelector('#media-total'),
          mediaFormat: panel.querySelector('#media-format'),
          formatBtn: panel.querySelector('#media-format button')
        };
        stackedBarHandler = StackedBar(elements.stackedBar);
      },

      onBeforeShow(panel, option) {
        elements.header.setAttribute(
          'data-href',
          option.originHref ? option.originHref : '#root'
        );
        storageType = option.type;
        deviceStorage = getStorage('sdcard', storageType);
        /*
         *Hide format sd card for Next 3.0.
         * if (storageType === 'sdcard1') {
         *   elements.mediaFormat.classList.remove('hidden');
         * } else {
         *   elements.mediaFormat.classList.add('hidden');
         * }
         */
        listElements = panel.querySelectorAll('li:not(.hidden)');
        deviceStorage.addEventListener('change', handleEvent);
        deviceStorage.addEventListener('storage-state-change', handleEvent);
        elements.currentPanel.addEventListener('click', handleEvent);
        updateInfo();
        ListFocusHelper.addEventListener(listElements, updateSoftKey);
      },
      onShow: function onShow(panel) {
        ListFocusHelper.updateSoftkey(panel);
      },
      onBeforeHide() {
        ListFocusHelper.removeEventListener(listElements, updateSoftKey);
        deviceStorage.removeEventListener('change', handleEvent);
        deviceStorage.removeEventListener('storage-state-change', handleEvent);
      },
      onUninit() {
        stackedBarHandler.reset();
      }
    });
  };
});
