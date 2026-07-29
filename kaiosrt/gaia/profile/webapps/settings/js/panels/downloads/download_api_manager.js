/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* Vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global DownloadUI, DownloadHelper, DownloadFormatter */


// eslint-disable-next-line
(function(exports) {
  const downloadsCache = {};
  // eslint-disable-next-line
  let downloadsListener = null;

  const COMPLETE_STATE = 'finalized';
  const SUCCEEDED_STATE = 'succeeded';

  function appendDownloadsToCache(downloads) {
    for (let i = 0; i < downloads.length; i++) {
      setDownload(downloads[i]);
    }
  }

  function setDownload(download) {
    downloadsCache[getDownloadId(download)] = download;
  }

  function deleteFromDownloadsCache(id) {
    delete downloadsCache[id];
  }

  /*
   * Function _resetDownloadsCache() {
   *   downloadsCache = {};
   * }
   */

  /*
   * Function _getTypeFromOperation(operation) {
   *   const TYPES = { added: 'added' };
   *   return TYPES[operation] || 'unknown';
   * }
   */

  /*
   * Function _updateDownloadsCacheWithDataStoreDownload(dsChange) {
   *   const getReq = DownloadStore.get(dsChange.id);
   *   getReq.onsuccess = function(event) {
   *     const entries = Object.keys(downloadsCache);
   *     const download = event.target.result;
   */

  /*
   *     Let cachedDownload = null;
   *     for (let i = 0; i < entries.length; i++) {
   *       const downloadCacheEntry = downloadsCache[entries[i]];
   *       if (
   *         downloadCacheEntry.storageName === download.storageName &&
   *         downloadCacheEntry.storagePath === download.storagePath
   *       ) {
   *         cachedDownload = downloadCacheEntry;
   *         break;
   *       }
   *     }
   */

  /*
   *     Const changeEvent = {
   *       type: _getTypeFromOperation(dsChange.operation),
   *       download
   *     };
   */

  /*
   *     If (cachedDownload) {
   *       changeEvent.downloadApiId = cachedDownload.id;
   *       _deleteFromDownloadsCache(cachedDownload.id);
   *       setDownload(download);
   *     }
   */

  /*
   *     CallListener(changeEvent);
   *   };
   *   getReq.onerror = (e) => {
   *     console.error(
   *       'Failed to get download with id = ',
   *       dsChange.id,
   *       ' -- ',
   *       e
   *     );
   *   };
   * }
   */

  function getDownloadId(download) {
    return DownloadFormatter.getUUID(download);
  }

  /*
   * It deletes a download
   *
   * @param{Object} It represents a download item that defines the download id
   *                and if the user's confirmation should be omitted (optional)
   *
   * @param{Function} Success callback
   *
   * @param{Function} Error callback
   */
  function deleteDownload(item, successCb, errorCb) {
    const { id } = item;
    const download = downloadsCache[id];

    function doDeleteDownload() {
      const reqRemove = DownloadHelper.remove(download);

      reqRemove.onsuccess = () => {
        deleteFromDownloadsCache(id);
        successCb();
      };

      reqRemove.onerror = () => {
        DownloadHelper.handlerError(reqRemove.error, download);
        errorCb(reqRemove.error.code);
      };
    }

    if (item.force) {
      doDeleteDownload();
    } else {
      const reqShow = DownloadUI.show(DownloadUI.TYPE.DELETE, download);

      reqShow.onconfirm = () => {
        doDeleteDownload();
      };

      reqShow.oncancel = errorCb;
    }
  }

  /*
   * Function _dataStoreChangeHandler(dsChange) {
   *   switch (dsChange.operation) {
   *     case 'added':
   *       // Update function will call the listener when appropriate.
   *       window.setTimeout(function nextTickUpdated() {
   *         _updateDownloadsCacheWithDataStoreDownload(dsChange);
   *       }, 0);
   *       break;
   *     default:
   *       break;
   *   }
   * }
   */

  /*
   * Function callListener(data) {
   *   if (downloadsListener) {
   *     downloadsListener(data);
   *   }
   * }
   */

  const DownloadApiManager = {
    initialized: false,

    init() {
      // eslint-disable-next-line
      if (this.initialized) {
      }

      /*
       * Add a listener to track when Download objects get added to the
       * Download Store. This is when we'll update our Download Item to use
       * the DataStore representation instead of the Download API DOM Download
       * object.
       * var req = DownloadStore.addListener(_dataStoreChangeHandler);
       */

      /*
       * Req.onsuccess = (function() {
       *   this._initialized = true;
       * }.bind(this));
       * req.onerror = (function(e) {
       *   console.error('Failed to initialize DownloadApiManager properly.', e);
       * });
       */
    },

    getCompleteDownload(items) {
      const downloadItems = localStorage.getItem('remove-download-items');
      const completeItems = [];
      let arrDownloadItems = [];

      if (!downloadItems) {
        return items;
      }

      arrDownloadItems = JSON.parse(downloadItems);
      items.forEach(item => {
        const index = arrDownloadItems.indexOf(`${item.id}${item.storagePath}`);
        if (-1 === index) {
          completeItems.push(item);
        }
      });

      for (let i = 0; i < arrDownloadItems.length; ) {
        const downloadIndex = items.findIndex(item => {
          return `${item.id}${item.storagePath}` === arrDownloadItems[i];
        });

        if (-1 === downloadIndex) {
          arrDownloadItems.splice(i, 1);
        } else {
          i++;
        }
      }

      localStorage.setItem(
        'remove-download-items',
        JSON.stringify(arrDownloadItems)
      );
      return completeItems;
    },

    getDownloads(onsuccess, onerror, oncomplete) {
      const promise = navigator.b2g.downloadManager.getDownloads();
      promise.then(apiDownloads => {
        function isDownloaded(download) {
          return (
            download.state !== COMPLETE_STATE &&
            download.state !== SUCCEEDED_STATE
          );
        }

        function downloaded(download) {
          return (
            download.state === COMPLETE_STATE ||
            download.state === SUCCEEDED_STATE
          );
        }
        /*
         * Not completed from the API. We need to remove the ones handled
         * by Datastore, due to we are storing all completed downloads
         * (not only within last week).
         */
        const notCompletedDownloads = apiDownloads.filter(isDownloaded);
        let completedDownloads = apiDownloads.filter(downloaded);
        completedDownloads = this.getCompleteDownload(completedDownloads);
        // Retrieve complete downloads from Datastore

        /*
         * Var request = DownloadStore.getAll();
         * request.onsuccess = function(event) {
         * Completed from API
         * var completedDownloads = event.target.result;
         * Merge both
         */
        const downloads = notCompletedDownloads.concat(completedDownloads);
        // Sort by timestamp
        console.log('------downloads-----zdx add for test---', downloads);
        const { length } = downloads;
        for (let i = 0; i < length; i++) {
          let tempStr = null;
          if (downloads[i].storagePath === 'downloads/picturetest') {
            tempStr = `${downloads[i].storagePath}.jpg`;
            downloads[i].storagePath = tempStr;
            tempStr = `${downloads[i].url}.jpg`;
            downloads[i].url = tempStr;
            tempStr = `${downloads[i].path}.jpg`;
            downloads[i].path = tempStr;
            downloads[i].contentType = 'image/jpeg';
          } else if (downloads[i].storagePath === 'downloads/htmltest') {
            tempStr = `${downloads[i].storagePath}.html`;
            downloads[i].storagePath = tempStr;
            tempStr = `${downloads[i].url}.html`;
            downloads[i].url = tempStr;
            tempStr = `${downloads[i].path}.html`;
            downloads[i].path = tempStr;
            downloads[i].contentType = 'image/html';
          }
        }
        downloads.sort((a, b) => {
          /*
           * TODO: Remove this when bug #945366
           * will be fixed
           */
          try {
            return b.startTime - a.startTime;
          } catch (ex) {
            return true;
          }
        });
        // Append to the Dictionary
        appendDownloadsToCache(downloads);
        onsuccess(downloads, oncomplete);
        /*
         * };
         * Request.onerror = function(e) {
         *   Console.warn('DATASTORE FAILED');
         *   // Use only the API
         *   appendDownloadsToCache(notCompletedDownloads);
         *   Onsuccess(notCompletedDownloads, oncomplete);
         * };
         */
      }, onerror);
    },

    setOnDownloadHandler(callback) {
      function handler(evt) {
        const { download } = evt;
        setDownload(download);
        if (typeof callback === 'function') {
          return callback(download);
        }
        return null;
      }
      navigator.b2g.downloadManager.ondownloadstart = handler;
    },

    deleteDownloads(
      downloadItems,
      onDeletedSuccess,
      onDeletedError,
      oncomplete
    ) {
      if (downloadItems === null) {
        if (typeof onDeletedError === 'function') {
          onDeletedError(null, 'Download items not defined or null');
        }
        return;
      }
      if (downloadItems.length === 0) {
        if (typeof oncomplete === 'function') {
          oncomplete();
        }
        return;
      }

      const currentItem = downloadItems.pop();
      deleteDownload(
        currentItem,
        () => {
          if (onDeletedSuccess) {
            onDeletedSuccess(currentItem.id);
          }

          this.deleteDownloads(
            downloadItems,
            onDeletedSuccess,
            onDeletedError,
            oncomplete
          );
        },
        msg => {
          if (onDeletedError) {
            onDeletedError(currentItem.id, msg);
          }

          this.deleteDownloads(
            downloadItems,
            onDeletedSuccess,
            onDeletedError,
            oncomplete
          );
        }
      );
    },

    getDownload(id) {
      return downloadsCache[id] || null;
    },

    updateDownload(download) {
      setDownload(download);
    },

    setListener(listener) {
      downloadsListener = listener;
    }
  };

  exports.DownloadApiManager = DownloadApiManager;
  // eslint-disable-next-line
})(this);
