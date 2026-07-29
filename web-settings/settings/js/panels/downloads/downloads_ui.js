
/* global DownloadFormatter */
/* global MimeMapper */

/**
 *  This file defines a component to show download confirmations
 *
 * - Stop download (Are you sure you want to stop the download?)
 * - Download stopped (Download was stopped. Try downloading again?)
 * - Download failed (xfile failed to download. Try downloading again?)
 * - Delete download (Delete xfile?)
 * - Unsupported file type
 * - File not found
 * - File open error
 * - No provider to share file
 *
 *  var request = DownloadUI.show(DownloadUI.TYPE.STOP, download);
 *
 *  request.oncancel = function() {
 *    alert('CANCEL');
 *  };
 *
 *  request.onconfirm = function() {
 *    alert('CONFIRM');
 *  };
 *
 *  WARNING: To use this library you need to include 'shared/js/l10n.js'
 *
 */
// eslint-disable-next-line
const DownloadUI = (function() {
  /**
   * Download type constructor
   *
   * @param {String} Type name
   * @param {Array} CSS classes to confirm button
   * @param {Boolean} Message without parameters
   */
  const DownloadType = function DownloadType(name, classes, isPlainMessage) {
    this.name = name;
    this.classes = classes;
    this.isPlainMessage = isPlainMessage;
    // eslint-disable-next-line
    this.numberOfButtons = classes.indexOf('full') !== -1 ? 1 : 2;
  };

  /**
   * Errors reported by the Downloads API.
   */
  const ERRORS = {
    NO_MEMORY: 2152857616,
    NO_SDCARD: 2152857618,
    UNMOUNTED_SDCARD: 2152857621
  };

  const TYPES = {
    STOP: new DownloadType('stop', ['danger'], true),
    STOPPED: new DownloadType('stopped', ['recommend'], true),
    FAILED: new DownloadType('failed', ['recommend']),
    DELETE: new DownloadType('delete', ['danger']),
    DELETE_ALL: new DownloadType('delete_all', ['danger']),
    UNSUPPORTED_FILE_TYPE: new DownloadType('unsupported_file_type', [
      'danger'
    ]),
    FILE_NOT_FOUND: new DownloadType(
      'file_not_found',
      ['recommend', 'full'],
      true
    ),
    FILE_OPEN_ERROR: new DownloadType('file_open_error', ['danger']),
    NO_SDCARD: new DownloadType(
      'no_sdcard_found_2',
      ['recommend', 'full'],
      true
    ),
    UNMOUNTED_SDCARD: new DownloadType(
      'unmounted_sdcard_2',
      ['recommend', 'full'],
      true
    ),
    NO_PROVIDER: new DownloadType('no_provider', ['recommend', 'full'], true),
    NO_MEMORY: new DownloadType('no_memory', ['recommend', 'full'], true)
  };

  // eslint-disable-next-line
  const DownloadAction = function(id, type) {
    /* eslint-disable */
    this.id = id;
    this.name = id.toLowerCase();
    this.title = `${this.name}_downloaded_file`;
    this.type = type;
    /* eslint-enable */
  };

  const ACTIONS = {
    OPEN: new DownloadAction('OPEN', 'confirm'),
    SHARE: new DownloadAction('SHARE', 'confirm'),
    WALLPAPER: new DownloadAction('WALLPAPER', 'confirm'),
    RINGTONE: new DownloadAction('RINGTONE', 'confirm'),
    CANCEL: new DownloadAction('CANCEL', 'cancel')
  };

  // Confirm dialog containers
  const confirm = null;
  let actionMenu = null;

  /*
   * New add
   * const downloadConfirmDialog = null;
   * const downloadsContainer = null;
   */
  /*
   * Const skNo = {
   *   name: 'No',
   *   l10nId: 'stop_download_left_button',
   *   priority: 1,
   *   method: null
   * };
   * const skYes = {
   *   name: 'Yes',
   *   l10nId: 'stop_download_right_button',
   *   priority: 3,
   *   method: null
   * };
   * const skOk = {
   *   name: 'Ok',
   *   l10nId: 'ok',
   *   priority: 2,
   *   method: null
   * };
   * const skLCancel = {
   *   name: 'Cancel',
   *   l10nId: 'cancel',
   *   priority: 1,
   *   method: null
   * };
   * const skRDelete = {
   *   name: 'Delete',
   *   // L10nId: 'stop',
   *   priority: 3,
   *   method: null
   * };
   * const skRResume = {
   *   name: 'Resume',
   *   // L10nId: 'stop',
   *   priority: 3,
   *   method: null
   * };
   */
  /*
   * Const stopDownloadSoftKeyBar = {
   *   header: { l10nId: 'message' },
   *   items: [skNo, skYes]
   * };
   * const resumeDownloadSoftKeyBar = {
   *   header: { l10nId: 'message' },
   *   items: [skLCancel, skRResume]
   * };
   * const noDownloadSoftKeyBar = {
   *   header: { l10nId: 'message' },
   *   items: [skOk]
   * };
   * const deleteDownloadSoftKeyBar = {
   *   header: { l10nId: 'message' },
   *   items: [skLCancel, skRDelete]
   * };
   * const unsupportDownloadSoftKeyBar = {
   *   header: { l10nId: 'message' },
   *   items: [skLCancel, skRDelete]
   * };
   */
  /**
   * Request auxiliary object to support asynchronous calls
   */
  // eslint-disable-next-line
  const Request = function() {
    /* eslint-disable */
    this.cancel = () => {
      removeContainers();
      if (typeof this.oncancel === 'function') {
        this.oncancel();
      }
    };

    this.confirm = result => {
      removeContainers();
      if (typeof this.onconfirm === 'function') {
        this.result = result;
        this.onconfirm({
          target: this
        });
      }
    };
    /* eslint-enable */
  };

  function removeContainers() {
    removeConfirm();
    removeActionMenu();
  }

  /*
   * Function addConfirm() {
   *   if (confirm !== null) {
   *     confirm.innerHTML = '';
   *     return;
   *   }
   */

  /*
   *   Confirm = document.createElement('form');
   *   confirm.id = 'downloadConfirmUI';
   *   confirm.setAttribute('role', 'dialog');
   *   confirm.setAttribute('data-type', 'confirm');
   *   document.body.appendChild(confirm);
   * }
   */

  function removeConfirm() {
    if (confirm === null) {
      return;
    }

    confirm.innerHTML = '';
    confirm.style.display = 'none';
  }

  // When users click or hold on home button UIs should be removed
  window.addEventListener('home', removeContainers);
  window.addEventListener('holdhome', removeContainers);

  function l10n(element, l10nid, l10nargs) {
    // First set our args.
    if (l10nid === 'stopped_download_message') {
      l10nid = 'kai-stopped_download_message';
    }
    if (l10nargs) {
      element.setAttribute('data-l10n-args', JSON.stringify(l10nargs));
    }
    // Then localize.
    element.setAttribute('data-l10n-id', l10nid);
    return element;
  }

  function createConfirm(type, req, downloads) {
    const title = `${type.name}_download_title`;
    let message = null;
    let dialogConfig = null;
    let argsStr = null;

    if (type.isPlainMessage) {
      message = `${type.name}_download_message`;
    } else if (type === TYPES.DELETE_ALL) {
      argsStr = downloads.length;
      message = `${type.name}_download_message_ext`;
    } else {
      argsStr = DownloadFormatter.getFileName(downloads[0]);
      message = `${type.name}_download_message`;
    }

    if (type.name === 'file_not_found') {
      dialogConfig = {
        title: { id: title, args: {} },
        body: { id: message, args: { argsStr } },
        accept: {
          l10nId: 'ok',
          priority: 3,
          callback() {
            DialogHelper.destroy();
          }
        }
      };
    } else if (
      type.name === 'unsupported_file_type' ||
      type.name === 'file_open_error'
    ) {
      dialogConfig = {
        title: { id: title, args: {} },
        body: { id: message, args: { argsStr } },
        cancel: {
          l10nId: 'cancel',
          priority: 1,
          callback() {
            req.cancel();
            DialogHelper.destroy();
          }
        },
        confirm: {
          l10nId: 'downloads-delete',
          priority: 3,
          callback() {
            req.confirm();
            DialogHelper.destroy();
          }
        }
      };
    } else if (type.name === 'delete') {
      // DownPanel.classList.remove('edit');

      dialogConfig = {
        title: { id: title, args: {} },
        body: { id: message, args: { name: argsStr } },
        cancel: {
          l10nId: 'cancel',
          priority: 1,
          callback() {
            req.cancel();
            // DownPanel.classList.remove('edit');
            DialogHelper.destroy();
          }
        },
        confirm: {
          l10nId: 'delete',
          priority: 3,
          callback() {
            req.confirm();
            // DownPanel.classList.remove('edit');
            DialogHelper.destroy();

            const downLoadList = document.getElementById('downloadList');
            const focusedElement = document.querySelector('#downloads .focus');

            if (null === focusedElement) {
              downLoadList.firstElementChild.childNodes[0].classList.add(
                'focus'
              );
            }
          }
        },
        backcallback() {
          DialogHelper.destroy();
        }
      };
    } else if (type.name === 'delete_all') {
      dialogConfig = {
        title: { id: title, args: {} },
        body: { id: message, args: { argsStr } },
        cancel: {
          l10nId: 'cancel',
          priority: 1,
          callback() {
            req.cancel();
            // DownPanel.classList.remove('edit');
            DialogHelper.destroy();
          }
        },
        confirm: {
          l10nId: 'delete',
          priority: 3,
          callback() {
            req.confirm();
            // DownPanel.classList.remove('edit');
            DialogHelper.destroy();

            const downLoadList = document.getElementById('downloadList');
            const focusedElement = document.querySelector('#downloads .focus');

            if (null === focusedElement) {
              downLoadList.firstElementChild.childNodes[0].classList.add(
                'focus'
              );
            }
          }
        },
        backcallback() {
          DialogHelper.destroy();
        }
      };
    } else if (type.name === 'stop') {
      dialogConfig = {
        title: { id: title, args: {} },
        body: { id: message, args: { argsStr } },
        cancel: {
          l10nId: 'stop_download_left_button',
          priority: 1,
          callback() {
            req.cancel();
            DialogHelper.destroy();
          }
        },
        confirm: {
          l10nId: 'stop_download_right_button',
          priority: 3,
          callback() {
            req.confirm();
            DialogHelper.destroy();
          }
        }
      };
    } else if (type.name === 'stopped' || type.name === 'failed') {
      dialogConfig = {
        title: { id: title, args: {} },
        body: { id: message, args: { argsStr } },
        cancel: {
          l10nId: 'cancel',
          priority: 1,
          callback() {
            req.cancel();
            DialogHelper.destroy();
          }
        },
        confirm: {
          l10nId: 'download-resume',
          priority: 3,
          callback() {
            req.confirm();
            DialogHelper.destroy();
          }
        }
      };
    } else {
      dialogConfig = {
        title: { id: title, args: {} },
        body: { id: message, args: { argsStr } },
        confirm: {
          l10nId: 'ok',
          priority: 2,
          callback() {
            DialogHelper.destroy();
          }
        }
      };
    }

    DialogHelper.show(dialogConfig);
  }

  /*
   * Function _changeDownloadListFocus() {
   *   const event = new CustomEvent('panelready', {
   *     detail: {
   *       current: Settings.currentPanel
   *     }
   *   });
   *   window.dispatchEvent(event);
   * }
   */
  function addActionMenu() {
    if (actionMenu !== null) {
      actionMenu.innerHTML = '';
      return;
    }

    actionMenu = document.createElement('form');
    actionMenu.id = 'downloadActionMenuUI';
    actionMenu.setAttribute('role', 'dialog');
    actionMenu.setAttribute('data-type', 'action');
    document.body.appendChild(actionMenu);
  }

  function removeActionMenu() {
    if (actionMenu === null) {
      return;
    }

    actionMenu.innerHTML = '';
    actionMenu.style.display = 'none';
  }

  function createActionMenu(req, download) {
    const actions = [ACTIONS.SHARE];

    const fileName = DownloadFormatter.getFileName(download);
    const type = MimeMapper.guessTypeFromFileProperties(
      fileName,
      download.contentType
    );
    if (type.length > 0) {
      if (type.startsWith('image/')) {
        actions.push(ACTIONS.WALLPAPER);
      } else if (type.startsWith('audio/')) {
        actions.push(ACTIONS.RINGTONE);
      }
    }

    actions.push(ACTIONS.CANCEL);
    doCreateActionMenu(req, fileName, actions);
  }

  function doCreateActionMenu(req, fileName, actions) {
    addActionMenu();

    const header = document.createElement('header');
    header.textContent = ''; // FileName;
    actionMenu.appendChild(header);

    const menu = document.createElement('menu');
    menu.classList.add('actions');

    actions.forEach(function addActionButton(action) {
      const button = document.createElement('button');
      button.id = action.id;
      l10n(button, action.title);
      button.dataset.type = action.type;
      menu.appendChild(button);
      button.addEventListener('click', function buttonCliked(evt) {
        button.removeEventListener('click', buttonCliked);
        req[evt.target.dataset.type](ACTIONS[evt.target.id]);
      });
    });

    actionMenu.appendChild(menu);

    actionMenu.style.display = 'block';
  }

  /*
   * Shows a confirmation depending on type. It returns a request object with
   * oncancel and onconfirm callbacks
   *
   * @param {String} Confirmation type
   *
   * @param {Array} It represents the download(s) object(s)
   */
  function show(type, downloads) {
    const req = new Request();

    downloads = Array.isArray(downloads) ? downloads : [downloads];

    // We have to discover the type of UI depending on state when type is null
    if (type === null) {
      type = TYPES.STOPPED;

      // eslint-disable-next-line
      const download = downloads[0];
      if (
        download.state === 'finalized' ||
        (download.state === 'stopped' && download.error !== null)
      ) {
        type = TYPES.FAILED;
      }
    }
    createConfirm(type, req, downloads);

    return req;
  }

  function showActions(download) {
    const req = new Request();

    window.setTimeout(() => {
      // eslint-disable-next-line
      createActionMenu.call(this, req, download)
    }, 0);

    return req;
  }

  return {
    show,

    showActions,

    hide: removeContainers,

    get ERRORS() {
      return ERRORS;
    },

    get TYPE() {
      return TYPES;
    }
  };
})();
