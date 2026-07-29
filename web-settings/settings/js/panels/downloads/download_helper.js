
/* exported DownloadHelper */
/* global DownloadFormatter */
/* global DownloadUI */
/* global MimeMapper */

/*
 * DownloadHelper.js: Perform some utility functions with DOMDownload
 *  objects.
 *
 * - You have to include in you HTML:
 *
 *   <!-- <script src="shared/js/mime_mapper.js"></script> -->
 *   <!-- <script src="shared/js/download/download_store.js"></script> -->
 *   <script defer src="shared/js/lazy_loader.js"></script>
 *
 * - How to use this component.
 *
 *   For launching a download
 *
 *   var req = DownloadHelper.open(download);
 *
 *   req.onsuccess = function req_onsuccess() {
 *     alert('The download was opened so we can remove the notification');
 *   }
 *
 *   req.onerror = function req_onerror() {
 *     alert('Something wrong!: ' + req.error.message);
 *   }
 *
 */
// eslint-disable-next-line
const DownloadHelper = (function() {
  // Exception code constants
  const CODE = {
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
    DEVICE_STORAGE: 'DEVICE_STORAGE',
    MIME_TYPE_NOT_SUPPORTED: 'MIME_TYPE_NOT_SUPPORTED',
    INVALID_STATE: 'INVALID_STATE',
    NO_SDCARD: 'NO_SDCARD',
    NO_PROVIDER: 'NO_PROVIDER',
    UNMOUNTED_SDCARD: 'UNMOUNTED_SDCARD'
  };

  /*
   * Request auxiliary object to support asynchronous calls
   */
  /* eslint-disable */
  const Request = function() {
    this.done = result => {
      if (typeof this.onsuccess === 'function') {
        this.result = result;
        window.setTimeout(() => {
          this.onsuccess({
            target: this
          });
        }, 0);
      }
    };

    this.failed = error => {
      if (typeof this.onerror === 'function') {
        this.error = error;
        window.setTimeout(() => {
          this.onerror({
            target: this
          });
        }, 0);
      }
    };
  };
  /* eslint-enable */

  // Storage name by default
  const STORAGE_NAME_BY_DEFAULT = 'sdcard';

  // Storage name settings key
  const STORAGE_NAME_KEY = 'device.storage.writable.name';

  // Current storage name
  let storageName = STORAGE_NAME_BY_DEFAULT;

  SettingsDBCache.observe(
    STORAGE_NAME_KEY,
    STORAGE_NAME_BY_DEFAULT,
    function setStorageName(evt) {
      const { settingValue } = evt;
      if (settingValue) {
        storageName = settingValue;
      }
    }
  );

  /*
   * Error auxiliary method
   */
  function sendError(req, message, code) {
    req.failed({
      message,
      code
    });

    console.error(message);
  }

  /*
   * Returns a blob from the sdcard
   *
   * @param{Object} The download object
   *
   */
  function getBlob(download) {
    const req = new Request();
    const storage = getVolume(download.storageName);
    const storeAvailableReq = storage.available();

    storeAvailableReq.onsuccess = () => {
      const path = download.storagePath;
      switch (storeAvailableReq.result) {
        case 'unavailable':
          sendError(
            req,
            ` Could not open the file: ${path} from ${download.storageName}`,
            CODE.NO_SDCARD
          );
          break;

        case 'shared':
          sendError(
            req,
            ` Could not open the file: ${path} from ${download.storageName}`,
            CODE.UNMOUNTED_SDCARD
          );
          break;

        default:
          try {
            const storeGetReq = storage.get(path);

            storeGetReq.onsuccess = () => {
              req.done(storeGetReq.result);
            };

            storeGetReq.onerror = () => {
              sendError(
                req,
                `${storeGetReq.error.name} Could not open the file: ${path} from ${download.storageName}`,
                CODE.FILE_NOT_FOUND
              );
            };
          } catch (ex) {
            sendError(
              req,
              `Error getting the file ${path} from ${download.storageName}`,
              CODE.DEVICE_STORAGE
            );
          }
      }
    };

    storeAvailableReq.onerror = () => {
      sendError(req, 'Error getting storage state ', CODE.DEVICE_STORAGE);
    };

    return req;
  }

  /*
   * Base action that implements the commom logic for actions based on the
   * WebActivity API
   *
   * @param{Object} Configuration parameters
   */
  const Action = function Action(params) {
    this.req = params.request;
    this.name = params.actionType.activityName;
  };

  Action.prototype = {
    /*
     * It performs the action based on WebActivity
     */
    run: function run() {
      if (this.name === 'open') {
        this.data.allowSave = false;
      }

      if (
        this.data.type === 'text/x-vcard' ||
        this.data.type === 'text/vcard'
      ) {
        this.name = 'import';
      }

      ActivityHelper.start({
        name: this.name,
        data: this.data
      }).then(
        result => {
          this.onsuccess(result);
        },
        err => {
          DebugHelper.debug(
            `Download ${this.name} activity failed err: ${JSON.stringify(err)}`
          );
          if (
            'ACTIVITY_HANDLER_SHUTDOWN' !== err &&
            'ACTIVITY_CHOICE_CANCELED' !== err
          ) {
            this.onerror(err);
          }
        }
      );
    },

    /*
     * This method implements the generic onsuccess callback
     */
    onsuccess: function onsuccess(result) {
      if (result && result.target) {
        this.req.done(result.target.result);
      }
    },

    /*
     * This method implements the generic onerror callback
     */
    onerror: function onerror(evt) {
      this.req.failed({
        message: evt
      });
    }
  };

  /*
   * This action opens downloads extending the Action Object
   *
   * @param{Object} Configuration parameters
   */
  const OpenAction = function OpenAction(params) {
    Action.call(this, params);

    this.data = {
      url: params.download.path,
      filename: DownloadFormatter.getFileName(params.download),
      type: params.type,
      blob: params.blob
    };
  };

  OpenAction.prototype = {
    __proto__: Action.prototype
  };

  /*
   * This action shares downloads extending the Action Object
   *
   * @param{Object} Configuration parameters
   */
  const ShareAction = function ShareAction(params) {
    Action.call(this, params);

    let filename = DownloadFormatter.getFileName(params.download);
    if ('setringtone' === params.actionType.activityName) {
      const lastIndex = filename.lastIndexOf('.');
      // eslint-disable-next-line
      filename = -1 !== lastIndex ? filename.substring(0, lastIndex) : filename;
    }

    this.data = {
      // 'share' activities do not work with specific mime types
      type: `${params.type.split('/')[0]}/*`,
      blobs: [params.blob],
      filenames: [filename]
    };
  };

  ShareAction.prototype = {
    __proto__: Action.prototype,

    /*
     * It overrides the generic onerror callback for another more suitable
     */
    // eslint-disable-next-line
    _onerror: function sa_onerror(evt) {
      if (evt.target.error.name !== 'NO_PROVIDER') {
        return;
      }

      sendError(this.req, 'No provider to share file', CODE.NO_PROVIDER);
    }
  };

  /*
   * This action gets the info for a download
   *
   * @param{Object} Configuration parameters
   */
  const InfoAction = function InfoAction(params) {
    Action.call(this, params);

    this.data = {
      name: DownloadFormatter.getFileName(params.download),
      type: params.type,
      blob: params.blob,
      size: params.download.totalBytes,
      path: params.download.path
    };
  };

  InfoAction.prototype = {
    __proto__: Action.prototype,

    /*
     * It overrides the generic run method
     */
    run: function run() {
      this.req.done(this.data);
    }
  };

  // This is a factory that deals with different <Action> objects
  const ActionsFactory = {
    TYPE: {
      OPEN: {
        activityName: 'open',
        actionClass: OpenAction
      },
      SHARE: {
        activityName: 'share',
        actionClass: ShareAction
      },
      INFO: {
        actionClass: InfoAction
      },
      WALLPAPER: {
        activityName: 'set-wallpaper',
        actionClass: ShareAction
      },
      RINGTONE: {
        activityName: 'set-ringtone',
        actionClass: ShareAction
      }
    },

    create: function create(params) {
      // eslint-disable-next-line
      return new params.actionType.actionClass(params);
    }
  };

  /*
   * Returns the mime type
   *
   * @param{Object} It represents a DOMDownload object
   *
   * @returns(String) Mime type
   */
  function getType(download) {
    const fileName = DownloadFormatter.getFileName(download);
    const type = MimeMapper.guessTypeFromFileProperties(
      fileName,
      download.contentType
    );
    return type;
  }

  /*
   * This method allows third-parties to open or share downloads
   *
   * @param{Object} Action types: <ActionsFactory.TYPE.OPEN> or
   *                              <ActionsFactory.TYPE.SHARE>
   *
   * @param{Object} It represents a DOMDownload object
   */
  function runAction(actionType, download) {
    const req = new Request();

    window.setTimeout(function launching() {
      const { state } = download;
      if (state === 'succeeded' || state === 'finalized') {
        let type = getType(download);

        /*
         *
         * The 'open' action will always launch an activity using the original
         * Content type to allow for third party applications to handle
         * Arbitrary types of content.
         *
         * The 'share' action on the other hand only works with known mime
         * Types at this time.
         *
         */

        if (type.length === 0) {
          type = download.contentType;
        }

        const blobReq = getBlob(download);

        blobReq.onsuccess = () => {
          ActionsFactory.create({
            actionType,
            download,
            type,
            blob: blobReq.result,
            request: req
          }).run();
        };

        blobReq.onerror = () => {
          // Problem getting the blob from the sdcard
          req.failed(blobReq.error);
        };
        return;
      }

      sendError(
        req,
        'Becareful, the download is not finished!',
        CODE.INVALID_STATE
      );
    }, 0);

    return req;
  }

  /*
   * This method allows clients to remove a download, from the
   * list and the phone.
   *
   * @param{Object} It represents a DOMDownload object
   */
  function remove(download) {
    const req = new Request();
    const incompleteDownload = download.state !== 'succeeded';
    /*
     * If is not done, use download manager to remove it,
     * otherwise, deal with the datastore.
     */
    setTimeout(() => {
      if (incompleteDownload) {
        // eslint-disable-next-line
        if (!navigator.b2g.downloadManager) {
          sendError(req, 'DownloadManager not present', CODE.INVALID_STATE);
        } else {
          /*
           * First we pause the download so that everyone knows it's being
           * stopped. The Downloads API itself won't stop the download first,
           * it will simply kill it.
           * XXXAus: Remove when we fix bug #1090551
           */
          download.pause().then(
            () => {
              navigator.b2g.downloadManager.remove(download).then(
                () => {
                  req.done(download);
                },
                () => {
                  sendError(
                    'DownloadManager doesnt know about this download',
                    CODE.INVALID_STATE
                  );
                }
              );
            },
            () => {
              sendError(
                'Failed to pause download before removal',
                CODE.INVALID_STATE
              );
            }
          );
        }
      } else {
        navigator.b2g.downloadManager.remove(download);
        req.done(download);
      }
    }, 0);

    return incompleteDownload ? req : doRemoveFromPhone(req, download);
  }

  /*
   * Performs the proper delete of the physical file, also
   * from the datastore if the download has finished.
   *
   * @param{Object} This is the Request object
   * @param{Object} It represents a DOMDownload object
   */
  function doRemoveFromPhone(deleteRequest, download) {
    const req = new Request();

    deleteRequest.onsuccess = () => {
      const storage = getVolume(download.storageName);
      const storeAvailableReq = storage.available();

      storeAvailableReq.onsuccess = () => {
        const { path } = download;
        let storeDeleteReq = null;
        switch (storeAvailableReq.result) {
          case 'unavailable':
            sendError(
              req,
              ` Could not delete the file: ${path} from ${storageName}`,
              CODE.NO_SDCARD
            );
            break;

          case 'shared':
            sendError(
              req,
              ` Could not delete the file: ${path} from ${storageName}`,
              CODE.UNMOUNTED_SDCARD
            );
            break;

          default:
            storeDeleteReq = storage.delete(download.storagePath);

            storeDeleteReq.onsuccess = () => {
              /*
               * Remove from the datastore if status is 'succeeded'
               * if we find any problem with the datastore, don't send
               * an error, since the physical remove already happened
               */
              if (download.state === 'succeeded') {
                addRemoveDownloadItem(download);
                /*
                 * LazyLoader.load(['../shared/js/download/download_store.js'],
                 *   function() {
                 *     DownloadStore.remove(download);
                 *   }
                 * );
                 */
              }
              req.done(storeDeleteReq.result);
            };

            storeDeleteReq.onerror = () => {
              sendError(
                req,
                `${storeDeleteReq.error.name} Could not remove the file: ${download.path} from ${storageName}`,
                CODE.FILE_NOT_FOUND
              );
            };
            break;
        }
      };

      storeAvailableReq.onerror = () => {
        sendError(req, 'Error getting storage state ', CODE.DEVICE_STORAGE);
      };
    };

    deleteRequest.onerror = error => {
      sendError(req, error.message, error.code);
    };

    return req;
  }

  function addRemoveDownloadItem(download) {
    const downloadItems = localStorage.getItem('remove-download-items');
    let arrDownloadItems = [];

    if (downloadItems) {
      arrDownloadItems = JSON.parse(downloadItems);
    }

    arrDownloadItems.push(`${download.id}${download.storagePath}`);
    localStorage.setItem(
      'remove-download-items',
      JSON.stringify(arrDownloadItems)
    );
  }

  function handlerError(error, download, cb) {
    let req = null;
    const { show } = DownloadUI;

    /*
     * Canceled activites are normal and shouldn't be interpreted as errors.
     * Unfortunately, this isn't reported in a standard way by our
     * applications (or third party apps for that matter). This is why we
     * have this lazy filter here that may need to be updated in the future
     * but hopefully will just get removed.
     */
    if (
      error.message &&
      (error.message.endsWith('canceled') ||
        error.message.endsWith('Canceled') ||
        error.message.endsWith('cancelled') ||
        error.message.endsWith('Cancelled'))
    ) {
      // Since this isn't actually an error, we invoke the callback with null.
      if (cb) {
        cb(null);
        return;
      }
    }

    switch (error.code) {
      case CODE.NO_SDCARD:
      case CODE.UNMOUNTED_SDCARD:
      case CODE.FILE_NOT_FOUND:
      case CODE.NO_PROVIDER:
        req = show(DownloadUI.TYPE[error.code], download, true);
        req.onconfirm = cb;

        break;

      case CODE.MIME_TYPE_NOT_SUPPORTED:
        req = show(DownloadUI.TYPE.UNSUPPORTED_FILE_TYPE, download, true);
        req.onconfirm = () => {
          showRemoveFileUI(download, cb);
        };

        break;

      default:
        req = show(DownloadUI.TYPE.FILE_OPEN_ERROR, download, true);
        req.onconfirm = () => {
          if (typeof cb === 'function') {
            cb(download);
            return;
          }

          remove(download);
        };
        break;
    }

    // We have to remove the notification if the user cancels
    req.oncancel = cb;
  }

  function showRemoveFileUI(download, cb) {
    const req = DownloadUI.show(DownloadUI.TYPE.DELETE, download);

    req.oncancel = cb;

    req.onconfirm = () => {
      if (typeof cb === 'function') {
        cb(download);
        return;
      }

      remove(download);
    };
  }

  function getFreeSpace(cb) {
    const storage = navigator.getDeviceStorage(storageName);

    if (!storage) {
      console.error('Cannot get free space size in sdcard');
      cb(null);
      return;
    }

    const req = storage.freeSpace();

    req.onsuccess = e => {
      cb(e.target.result);
    };

    req.onerror = () => {
      cb(null);
    };
  }

  /**
   *  Gets the storage for the download based on the volumen
   *  it was saved (storageName)
   */
  function getVolume(volumeName) {
    /*
     * Per API design, all media type return the same volumes.
     * So we use 'sdcard' here for no reason.
     * https://bugzilla.mozilla.org/show_bug.cgi?id=856782#c10
     */
    const volumes = ApiManager.getDeviceStorages('sdcard');
    if (!volumeName || volumeName === '') {
      return volumes[0];
    }
    for (let i = 0; i < volumes.length; ++i) {
      if (volumes[i].storageName === volumeName) {
        return volumes[i];
      }
    }
    return volumes[0];
  }

  return {
    /*
     * This method allows clients to open a downlaod
     *
     * @param{Object} It represents a DOMDownload object
     */
    open(download) {
      return runAction(ActionsFactory.TYPE.OPEN, download);
    },

    /*
     * This method allows clients to share a downlaoded file
     *
     * @param{Object} It represents a DOMDownload object
     */
    share(download) {
      return runAction(ActionsFactory.TYPE.SHARE, download);
    },

    /*
     * This method allows clients to set as wallaper a downlaoded file
     *
     * @param{Object} It represents a DOMDownload object
     */
    wallpaper(download) {
      return runAction(ActionsFactory.TYPE.WALLPAPER, download);
    },

    /*
     * This method allows clients to set as ringtone a downlaoded file
     *
     * @param{Object} It represents a DOMDownload object
     */
    ringtone(download) {
      return runAction(ActionsFactory.TYPE.RINGTONE, download);
    },

    /*
     * This method returns information about a download
     *
     * @param{Object} It represents a DOMDownload object
     */
    info(download) {
      return runAction(ActionsFactory.TYPE.INFO, download);
    },

    /*
     * Given a download, remove it from the DownloadManager
     * list, and the file system.
     *
     * @param{Object} It represents a DOMDownload object
     */
    remove,

    /*
     * Returns exception code constants
     */
    get CODE() {
      return CODE;
    },

    /*
     * This method handles different errors when users attemp to open files
     *
     * @param{Object} Error object
     *
     * @param{Object} It represents a DOMDownload object
     *
     * @param{Function} This function is performed when the flow is finished
     */
    handlerError,

    /*
     * Returns the free memory size in bytes
     *
     * @param{Function} This function is performed when the free memory size has
     *                  been calculated
     */
    getFreeSpace
  };
})();
