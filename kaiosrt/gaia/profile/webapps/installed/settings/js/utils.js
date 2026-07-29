/* global  ConfirmDialogHelper, Toaster */


/* eslint-disable no-unused-vars*/

window.ToastHelper = (function ToastHelper() {
  function showToast(msgId, msgArg) {
    if (!document.hidden) {
      const toast = {
        messageL10nId: msgId,
        messageL10nArgs: msgArg,
        useTransition: true
      };

      if (typeof Toaster === 'undefined') {
        LazyLoader.load(
          [`${Constants.SHARD_ORIGIN}/js/utils/toaster/toaster.js`],
          () => {
            Toaster.showToast(toast);
          }
        );
      } else {
        Toaster.showToast(toast);
      }
    }
  }

  function showChangesSavedToast() {
    showToast('changessaved');
  }

  return {
    showToast,
    changeSaved: showChangesSavedToast
  };
})();

window.ObjectURL = (function ObjectURL() {
  function createURLByBlob(value) {
    let url = null;
    if (value instanceof Blob) {
      url = URL.createObjectURL(value);
      DebugHelper.debug(`ObjectURL createObjectURL:${url}`);
    } else {
      DebugHelper.log('The value is not blob');
    }
    return url;
  }

  function revokeObjectByURL(url) {
    if (url) {
      URL.revokeObjectURL(url);
      DebugHelper.debug(`ObjectURL revokeObjectByURL:${url}`);
    }
  }
  return {
    createURLByBlob,
    revokeObjectByURL
  };
})();

window.ConnectionHelper = (function ConnectionHelper() {
  function isOffline() {
    return (
      navigator.connection &&
      navigator.connection.type !== 'cellular' &&
      navigator.connection.type !== 'wifi'
    );
  }

  return {
    isOffline
  };
})();

window.DialogHelper = (function DialogHelper() {
  let dialog = null;

  function showDialog(config) {
    if (!config.backcallback) {
      config.backcallback = config.cancel && config.cancel.callback;
    }
    if (typeof ConfirmDialogHelper === Constants.UNDEFINED) {
      LazyLoader.load(
        [`${Constants.SHARD_ORIGIN}/js/helper/dialog/confirm_dialog_helper.js`],
        () => {
          dialog = new ConfirmDialogHelper(config);
          dialog.show(document.getElementById('app-confirmation-dialog'));
        }
      );
    } else {
      dialog = new ConfirmDialogHelper(config);
      dialog.show(document.getElementById('app-confirmation-dialog'));
    }
  }
  function destroyDialog() {
    dialog.destroy();
  }

  function getDialogElement() {
    return document.getElementById('app-confirmation-dialog');
  }
  return {
    get dialog() {
      return getDialogElement();
    },
    show: showDialog,
    destroy: destroyDialog
  };
})();

/**
 * Helper class for getting available/used storage
 * required by *_storage.js
 */

window.DeviceStorageHelper = (function DeviceStorageHelper() {
  function getReadableFileSize(bytes, digits) {
    // In: size in Bytes
    if (typeof bytes === 'undefined') return {};

    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    let e = null;
    let size = null;
    if (bytes) {
      e = Math.floor(Math.log(bytes) / Math.log(1024));
      size = (bytes / Math.pow(1024, e)).toFixed(digits || 0);
    } else {
      e = 0;
      size = '0';
    }

    return {
      size,
      unit: units[e]
    };
  }

  function showFormatedSize(element, l10nId, size) {
    if (typeof size === 'undefined' || isNaN(size) || size < 0) {
      element.textContent = '';
      return;
    }

    // KB - 3 KB (nearest ones), MB, GB - 1.29 MB (nearest hundredth)
    const fixedDigits = size < 1024 * 1024 ? 0 : 1;
    const sizeInfo = getReadableFileSize(size, fixedDigits);
    l10n.setAttributes(element, l10nId, {
      size: sizeInfo.size.toLocaleString(navigator.language),
      unit: l10n.get(`byteUnit-${sizeInfo.unit}`)
    });
  }

  function showFormatedSizeOfReleased(size) {
    if (typeof size === 'undefined' || isNaN(size) || size < 0) {
      return;
    }

    // KB - 3 KB (nearest ones), MB, GB - 1.29 MB (nearest hundredth)
    const fixedDigits = size < 1024 * 1024 ? 0 : 1;
    const sizeInfo = getReadableFileSize(size, fixedDigits);

    const toast = {
      messageL10nId: 'releasedSize',
      messageL10nArgs: {
        size: sizeInfo.size.toLocaleString(navigator.language),
        unit: l10n.get(`byteUnit-${sizeInfo.unit}`)
      },
      useTransition: true
    };
    ToastHelper.showToast(toast.messageL10nId, toast.messageL10nArgs);
  }

  function showFormatedSizeOfUsedAndTotal(element, l10nId, sizes) {
    if (typeof sizes === 'undefined') {
      element.textContent = '';
      return;
    }

    // KB - 3 KB (nearest ones), MB, GB - 1.29 MB (nearest hundredth)
    const fixedDigits = sizes.used < 1024 * 1024 ? 0 : 1;
    const sizeInfo = getReadableFileSize(sizes.used, fixedDigits);
    const fixedTotalDigits = sizes.used + sizes.free < 1024 * 1024 ? 0 : 1;
    const sizeTotalInfo = getReadableFileSize(
      sizes.used + sizes.free,
      fixedTotalDigits
    );
    l10n.setAttributes(element, l10nId, {
      usedSize: sizeInfo.size.toLocaleString(navigator.language),
      usedUnit: l10n.get(`byteUnit-${sizeInfo.unit}`),
      totalSize: sizeTotalInfo.size.toLocaleString(navigator.language),
      totalUnit: l10n.get(`byteUnit-${sizeTotalInfo.unit}`)
    });
  }

  return {
    showFormatedSize,
    showFormatedSizeOfReleased,
    showFormatedSizeOfUsedAndTotal
  };
})();

/**
 * Helper class to update SELECT softbar for all panels
 *
 */

window.ListFocusHelper = (function ListFocusHelper() {
  function init() {
    window.addEventListener('panelComplete', evt => {
      if (
        ListFocusHelper.focusElement &&
        evt.detail.panelId === `#${ListFocusHelper.currentPanel.id}`
      ) {
        NavigationMap.updateFocus(
          ListFocusHelper.currentPanel,
          ListFocusHelper.focusElement
        );
        ListFocusHelper.currentPanel = null;
        ListFocusHelper.focusElement = null;
      }
    });
  }
  function updateFocus(panel, element) {
    if (Settings.isBackHref) {
      return;
    }
    // It caused by incorrect parameters of panel, will be removed after it fixed.
    if (typeof panel === 'string') {
      panel = document.getElementById(panel);
    }
    if (NavigationMap.currentSection === `#${panel.id}`) {
      NavigationMap.updateFocus(panel, element);
    } else {
      ListFocusHelper.currentPanel = panel;
      ListFocusHelper.focusElement = element;
    }
  }

  function updateSoftkeyByFocus(evt) {
    const { classList } = evt.currentTarget;
    if (classList && classList.contains('none-select')) {
      SettingsSoftkey.hide();
    } else {
      SettingsSoftkey.show();
    }
  }

  function addFocusEventListener(elements, callback) {
    let i = elements.length - 1;
    if (callback) {
      for (i; i >= 0; i--) {
        elements[i].addEventListener('focus', callback);
      }
    } else {
      for (i; i >= 0; i--) {
        elements[i].addEventListener('focus', updateSoftkeyByFocus);
      }
    }
  }

  function removeFocusEventListener(elements, callback) {
    let i = elements.length - 1;
    if (callback) {
      for (i; i >= 0; i--) {
        elements[i].removeEventListener('focus', callback);
      }
    } else {
      for (i; i >= 0; i--) {
        elements[i].removeEventListener('focus', updateSoftkeyByFocus);
      }
    }
  }

  function updateSoftkey(panel) {
    let item = null;
    if (panel) {
      item = panel.querySelector('.focus');
    } else {
      item = document.querySelector('.focus');
    }
    if (!item) {
      return;
    }
    if (item.classList.contains('none-select')) {
      SettingsSoftkey.hide();
    } else {
      SettingsSoftkey.show();
    }
  }

  return {
    init,
    requestFocus: updateFocus,
    addEventListener: addFocusEventListener,
    removeEventListener: removeFocusEventListener,
    updateSoftkey
  };
})();
ListFocusHelper.init();
