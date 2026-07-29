/* global DownloadFormatter, Service, DownloadUI,
   DownloadHelper, WebActivity, DownloadObject,
   DownloadHandler, DownloadNotificationStore */
'use strict';

/**
 * This is the constructor that will represent a download notification
 * in the system
 *
 * @param {Object} download object provided by the API.
 */
function DownloadNotification(download) {
  /* Sample
   * {
       totalBytes: 5242880,
       currentBytes: 755617,
       url: "http://web4host.net/5MB.zip",
       path: "/mnt/media_rw/9016-4EF8/downloads/5…",
       storageName: "sdcard",
       storagePath: "downloads/5MB.zip",
       state: "downloading",
       contentType: "application/zip",
       startTime: Date 1970-01-01T01:00:01.032Z,
       id: "download-0"
      }
  */
  this.download = download;
  this.fileName = DownloadFormatter.getFileName(download);
  this.state = 'started';
  this.id = DownloadFormatter.getUUID(download);

  DownloadNotificationStore.addNotification(download.path);
  // We have to listen for state changes
  this.listener = this._update.bind(this);
  this.download.addEventListener('statechange', this.listener);

  if (download.state === 'started') {
    Service.request('NotificationStore:add', this._getInfo());
  } else {
    // For adopted downloads, it is possible for the download to already be
    // completed.
    this._update();
  }
}

DownloadNotification.prototype = {

  /**
   * This method knows when the toaster should be displayed. Basically
   * the toaster shouldn't be displayed if the download state does not change
   * or the download was stopped by the user or because of connectivity lost
   *
   * @return {boolean} True whether the toaster should be displayed.
   */
  _wontNotify: function dn_wontNotify() {
    var download = this.download;
    return this.state === download.state ||
           download.state === 'downloading' ||
          (download.state === 'stopped' && download.error === null);
  },


  notificationHandler: function dn_notificationHandler() {
    // close the notification
    this.notification.close();
    DownloadHandler.handlerOpenDownload({
      download: this.download,
      filename: this.fileName
    });
  },

  _updateUI: function dn_updateUI() {
    let noNotify = this._wontNotify();
    let info = this._getInfo();


    if ('failed' === this.state
      && 'stopped' === this.download.state
      && this.download.error
      && null !== this.download.error) {
      noNotify = false;
    }

    if (noNotify) {
      info.noNotify = true;
    }
    if (this.download.state === 'downloading') {
      info.mozbehavior = {
        noscreen: true
      };
    }

    if (this.download.state === 'succeeded') {
      this._close();
      const options = {
        icon: this._getIcon(),
        tag: info.downloadPath,
        body: info.text,
        data: {
          systemMessageTarget: 'system-download'
        }
      };

      window.NotificationService.send(info.title, options);
      this.download.removeEventListener('statechange', this.listener);
    } else {
      Service.request('NotificationStore:add', info);
    }
  },

  /**
   * It updates the notification when the download state changes.
   */
  _update: function dn_update(evt) {
    if (this.download.state === 'finalized') {
      // If the user delete the file, we will see this state and what we have to
      // do, is to remove the notification
      this._close();
      return;
    }

    if (evt && this.download.state === 'stopped') {
      this.state = this.download.state;
      this._onStopped().then(() => {
        this._updateUI();
      });
    } else {
      this._updateUI();
      this.state = this.download.state;
    }
  },

  _onStopped: function dn_onStopped() {
    return new Promise((resolve) => {
      if (this.download.error !== null) {
        // Error attr will be not null when a download is stopped because
        // something failed
        this.state = 'failed';
        this._onError();
        resolve();
      } else {
        if (!window.isOnline()) {
          // Remain downloading state when the connectivity was lost
          this.state = 'downloading';
        }
        resolve();
      }
    });
  },

  _onError: function dn_onError() {
    var result = parseInt(this.download.error.message);

    switch (result) {
      case DownloadUI.ERRORS.NO_MEMORY:
        DownloadUI.show(DownloadUI.TYPE['NO_MEMORY'],
                        this.download,
                        true);
        break;
      case DownloadUI.ERRORS.NO_SDCARD:
        DownloadUI.show(DownloadUI.TYPE['NO_SDCARD'],
                        this.download,
                        true);
        break;
      case DownloadUI.ERRORS.UNMOUNTED_SDCARD:
        DownloadUI.show(DownloadUI.TYPE['UNMOUNTED_SDCARD'],
                        this.download,
                        true);
        break;

      default:
        DownloadHelper.getFreeSpace((function gotFreeMemory(bytes) {
          if (bytes === 0) {
            DownloadUI.show(DownloadUI.TYPE['NO_MEMORY'], this.download, true);
          }
        }).bind(this));
    }
  },

  _ICONS_PATH: '/style/notifications/images/download.png',

  /**
   * It returns the icon depending on current state
   *
   * @return {String} Icon path.
   */
  _getIcon: function dn_getIcon() {
    return window.AppOrigin.getOrigin('system') + this._ICONS_PATH;
  },

  /**
   * This method returns an object to update the notification composed by the
   * text, icon and type
   *
   * @return {object} Object descriptor.
   */
  _getInfo: function dn_getInfo() {
    var state = this.download.state;
    var _ = window.api.l10n.get;

    state = ('downloading' === this.state && 'succeeded' !== state ||
      'failed' === this.state) ? this.state : state;

    var info = {
      id: this.id,
      title: this.fileName,
      icon: this._getIcon(),
      type: 'download-notification-' + state,
      isDownload: true,
      dismissable: state === 'succeeded' || state === 'stopped' ||
        state === 'failed',
      downloadPath: this.download.path,
      callback: () => {
        this.onClick();
      },
      mozbehavior: {}
    };

    if (state === 'downloading') {
      info.text = _('download_downloading', {
        percentage: DownloadFormatter.getPercentage(this.download)
      });
      info.progress = DownloadFormatter.getPercentage(this.download);
      info.sizeText = _('partialResult', {
        partial: DownloadFormatter.getDownloadedSize(this.download),
        total: DownloadFormatter.getTotalSize(this.download)
      });
    } else {
      info.text = _('download_' + state);
      info.progress = null;
    }

    return info;
  },

  /**
   * Closes the notification
   */
  _close: function dn_close() {
    Service.request('NotificationStore:remove', this.id);
    this.onClose();
  },

  /**
   * It performs the action when the notification is clicked by the user
   * depending on state:
   *
   * - 'downloading' -> launch the download list
   * - 'stopped' -> show confirmation to resume the download
   * - 'finalized' -> show confirmation to retry the download
   * - 'succeeded' -> open the downloaded file
   *
   * @param {function} Function that will be invoked when the notification
   *                   is removed from utility tray.
   */
  onClick: function dn_onClick() {
    switch (this.download.state) {
      case 'downloading':
      case 'stopped':
        // Launching settings > download list
        var activity = new WebActivity('configure', {
          target: 'device',
          section: 'downloads',
          downloadFileName: this.fileName
        });
        activity.start();
        break;
      case 'succeeded':
        DownloadHandler.handlerOpenDownload({
          download: this.download,
          filename: this.fileName
        });
        break;
    }

    // always clear the notification according the spec
    if (this.download.state !== 'downloading') {
      this._close();
    }
  },

  showDownloadUI: function(type, onOk) {
    var message = '';
    var _ = window.api.l10n.get;
    var args = Object.create(null);
    args.name = this.fileName;
    message = _(type.name + '_download_message', args);

    Service.request('DialogService:show', {
      header: _(type.name + '_download_title'),
      content: message,
      type: onOk ? 'confirm' : 'alert',
      translated: true,
      onOK: onOk
    });
  },

  /**
   * This method releases memory destroying the notification object
   */
  onClose: function dn_onClose() {
    if (this.download instanceof DownloadObject) {
      this.download.removeEventListener('statechange', this.listener);
    }
    // We need to keep this.download because we may need to show dialog
    // according to download instance.
  }
};
window.DownloadNotification = DownloadNotification;
