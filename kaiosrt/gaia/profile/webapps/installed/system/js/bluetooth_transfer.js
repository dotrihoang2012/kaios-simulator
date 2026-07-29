/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* API Summary:
   stopSendingFile(in DOMString aDeviceAddress);
   confirmReceivingFile(in DOMString aDeviceAddress, in bool aConfirmation); */
'use strict';
/* global NfcHandoverManager, MimeMapper, uuid,
          WebActivity, Service, attentionWindowManager*/
/* exported BluetoothTransfer */
(function(exports) {
var BluetoothTransfer = {
  // The first-in-first-out queue maintain each scheduled sending task.
  // Each element is a object for scheduled sending tasks.
  _sendingFilesQueue: [],
  _debug: true,
  _started: false,
  _timeout: null,
  _isStorageAvailable: true,
  _isUserCanceled: false,
  // Auto cancel current file transfer event delay time
  _delayTime: 60000,
  _translate: window.api.l10n.get,

  get _deviceStorage() {
    return navigator.b2g.getDeviceStorage('sdcard');
  },

  init: function bt_init() {
    // Bind message handler for sending files from Bluetooth app

    window.addEventListener('serviceworkermessage',
      this.swMessageHandler.bind(this)
    );

    window.addEventListener('activitybt-transfer-file-numbers',
      this._onFilesSending.bind(this)
    );

  },

  swMessageHandler: function(event) {
    const { type, data, category } = event.detail;

    if (category === 'systemmessage') {
      switch (type) {
        case 'bluetooth-opp-transfer-start':
          this._onUpdateProgress('start', data);
          break;
        case 'bluetooth-opp-transfer-complete':
          this._onTransferComplete(data);
          break;
        case 'bluetooth-opp-receiving-file-confirmation':
          this.showReceivePrompt(data);
          break;
        case 'bluetooth-opp-update-progress':
          this._onUpdateProgress('progress', data);
          break;
        default:
          break;
      }
    }
  },

  getDeviceName: function bt_getDeviceName(address) {
    return new Promise(function(resolve) {
      var adapter = Service.query('Bluetooth.getAdapter');
      if (adapter == null) {
        var msg = 'Since cannot get Bluetooth adapter, ' +
                  'resolve with an unknown device.';
        this.debug(msg);
        resolve(this._translate('unknown-device'));
      }
      var self = this;
      // Service Class Name: OBEXObjectPush, UUID: 0x1105
      // Specification: Object Push Profile (OPP)
      //                NOTE: Used as both Service Class Identifier and Profile.
      // Allowed Usage: Service Class/Profile
      // https://www.bluetooth.org/en-us/specification/assigned-numbers/
      // service-discovery
      var serviceUuid = '0x1105';
      var req = adapter.getConnectedDevices(serviceUuid);
      req.onsuccess = function bt_gotConnectedDevices() {
        if (req.result) {
          var connectedList = req.result;
          var length = connectedList.length;
          for (var i = 0; i < length; i++) {
            if (connectedList[i].address == address) {
              resolve(connectedList[i].name);
            }
          }
        } else {
          resolve(this._translate('unknown-device'));
        }
      };
      req.onerror = function() {
        var msg = 'Can not check is device connected from adapter.';
        self.debug(msg);
        resolve(this._translate('unknown-device'));
      };
    }.bind(this));
  },

  debug: function bt_debug(msg) {
    if (!this._debug) {
      return;
    }

    console.log('[System Bluetooth Transfer]: ' + msg);
  },

  _clearTimeout: function bt_clearTimeout() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  },

  humanizeSize: function bt_humanizeSize(bytes) {
    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var size, e;
    if (bytes) {
      e = Math.floor(Math.log(bytes) / Math.log(1024));
      size = (bytes / Math.pow(1024, e)).toFixed(2);
    } else {
      e = 0;
      size = '0';
    }
    return this._translate('fileSize', {
      size: size,
      unit: this._translate('byteUnit-' + units[e])
    });
  },

  _onFilesSending: function bt__onFilesSending(evt) {
    // Push sending files request in queue
    var sendingFilesSchedule = {
      numberOfFiles: evt.detail.content,
      numSuccessful: 0,
      numUnsuccessful: 0
    };
    this._sendingFilesQueue.push(sendingFilesSchedule);
    var msg = 'push sending files request in queue, queued length = ' +
              this._sendingFilesQueue.length;
    this.debug(msg);
  },

  showReceivePrompt: function bt_showReceivePrompt(evt) {
    var address = evt.address;
    var fileName = evt.fileName;
    var fileSize = this.humanizeSize(evt.fileLength);

    // Don't receive the file at the attention screens and passcode lockscreen.
    if (Service.query('locked') ||
        attentionWindowManager.hasActiveWindow()) {
      this.declineReceive(address);
      return;
    }

    this._timeout = setTimeout(() => {
      this.declineReceive(address);
      this.debug('device don\'t accept the file and timeout occurred.');
    }, this._delayTime);

    this.getDeviceName(address).then((deviceName) => {
      Service.request('NotificationView:close');
      Service.request('DialogService:show', {
        id: 'receive-file-prompt-dialog',
        header: this._translate('acceptFileTransfer'),
        content: this._translate('requestToReceive',
          {
            deviceName: deviceName,
            fileName: fileName,
            fileSize: fileSize
          }
        ),
        ok: 'accept',
        type: 'confirm',
        onBack: this.declineReceive.bind(this, address),
        onCancel: this.declineReceive.bind(this, address),
        onOk: this.acceptReceive.bind(this, evt),
        translated: true
      });
      this.playNotificationTone();
    });
  },

  playNotificationTone: function() {
    var ringtonePlayer = new Audio();
    const telephony = navigator.b2g.telephony;

    ringtonePlayer.src =
      'shared/resources/media/notifications/notifier_chime.opus';
    if (telephony && telephony.active) {
      ringtonePlayer.mozAudioChannelType = 'telephony';
      ringtonePlayer.volume = 0.3;
    } else {
      ringtonePlayer.mozAudioChannelType = 'notification';
    }
    ringtonePlayer.play();
    window.setTimeout(() => {
      ringtonePlayer.pause();
      ringtonePlayer.removeAttribute('src');
      ringtonePlayer.load();
    }, 2000);
  },

  declineReceive: function bt_declineReceive(address) {
    this._clearTimeout();

    Service.request('DialogService:hide', 'receive-file-prompt-dialog');
    var adapter = Service.query('Bluetooth.getAdapter');
    if (adapter != null) {
      adapter.confirmReceivingFile(address, false);
    } else {
      var msg = 'Cannot get adapter from system Bluetooth monitor.';
      this.debug(msg);
    }
  },

  acceptReceive: function bt_acceptReceive(evt) {
    this._clearTimeout();

    Service.request('DialogService:hide', 'receive-file-prompt-dialog');
    // Check storage is available or not before confirm receiving file
    var address = evt.address;
    var fileSize = evt.fileLength;
    var self = this;
    this.checkStorageSpace(fileSize,
      function checkStorageSpaceComplete(isStorageAvailable, errorMessage) {
        var adapter = Service.query('Bluetooth.getAdapter');
        var option = (isStorageAvailable) ? true : false;
        if (adapter) {
          self._isStorageAvailable = option;
          adapter.confirmReceivingFile(address, option);
        } else {
          var msg = 'Cannot get adapter from system Bluetooth monitor.';
          self.debug(msg);
        }
        // Storage is not available, then pop out a prompt with the reason
        if (!isStorageAvailable) {
          self.showStorageUnavaliablePrompt(errorMessage);
        }
    });
  },

  showStorageUnavaliablePrompt: function bt_showStorageUnavaliablePrompt(msg) {
    var body = this._translate(msg);
    Service.request('DialogService:show', {
      id: 'cannot-receive-file-alert',
      title: this._translate('cannotReceiveFile'),
      content: body,
      translated: true,
      type: 'alert',
      noClose: true,
      onOk: () => {
        Service.request('DialogService:hide', 'cannot-receive-file-alert');
      }
    });
  },

  checkStorageSpace: function bt_checkStorageSpace(fileSize, callback) {
    if (!callback) {
      return;
    }

    var storage = this._deviceStorage;

    var availreq = storage.available();
    availreq.onsuccess = function() {
      switch (availreq.result) {
      case 'available':
        // skip down to the code below
        break;
      case 'unavailable':
        callback(false, 'sdcard-not-exist2');
        return;
      case 'shared':
        callback(false, 'sdcard-in-use');
        return;
      default:
        callback(false, 'unknown-error');
        return;
      }

      // If we get here, then the sdcard is available, so we need to find out
      // if there is enough free space on it
      var freereq = storage.freeSpace();
      freereq.onsuccess = function() {
        if (freereq.result >= fileSize) {
          callback(true, '');
        } else {
          callback(false, 'sdcard-no-space2');
        }
      };
      freereq.onerror = function() {
        callback(false, 'cannotGetStorageState');
      };
    };

    availreq.onerror = function() {
      callback(false, 'cannotGetStorageState');
    };
  },

  get isSendFileQueueEmpty() {
    return this._sendingFilesQueue.length === 0;
  },

  get isFileTransferInProgress() {
    var jobs = document.querySelectorAll('[type="bluetooth-notification"]');
    return jobs.length > 0;
  },

  sendFileViaHandover: function bt_sendFileViaHandover(mac, blob) {
    var adapter = Service.query('Bluetooth.getAdapter');
    if (adapter != null) {
      var sendingFilesSchedule = {
        viaHandover: true,
        numberOfFiles: 1,
        numSuccessful: 0,
        numUnsuccessful: 0
      };
      this._onFilesSending({detail: sendingFilesSchedule});
      // XXX: Bug 915602 - [Bluetooth] Call sendFile api will crash
      // the system while device is just paired.
      // The paired device is ready to send file.
      // Since above issue is existed, we use a setTimeout with 3 secs delay
      var waitConnectionReadyTimeoutTime = 3000;
      setTimeout(function() {
        adapter.sendFile(mac, blob);
      }, waitConnectionReadyTimeoutTime);
    } else {
      var msg = 'Cannot get adapter from system Bluetooth monitor.';
      this.debug(msg);
    }
  },

  _onUpdateProgress: function bt__onUpdateProgress(mode, data) {
    switch (mode) {
      case 'start':
        if (data.received ||
          this._sendingFilesQueue[0].numberOfFiles === 1 ||
          this._sendingFilesQueue[0].numSuccessful +
          this._sendingFilesQueue[0].numUnsuccessful < 1) {
            this._started = true;
            if (!this._isUserCanceled) {
              if (!data.received) {
                this.showStartNotification(data);
              }

              this._timeout = setTimeout(() => {
                this.cancelTransfer(data.address);
                this.debug(
                  'opp\'s device don\'t accept the file and timeout occurred.');
              }, this._delayTime);
            }
          }
        break;
      case 'progress':
        if (this._started) {
          window.navigator.b2g.permissions.get(
            'desktop-notification',
            window.AppOrigin.getOrigin('bluetooth')
          ).then(perm => {
            if (perm === 'allow') {
              Service.request('SystemToaster:show', {
                text: this._translate('transfer-has-started-toast')
              });
            }
          });
          this._progress = true;
          this._started = false;
        }
        this._clearTimeout();
        this.updateProgress(data);
        break;
    }
  },

  showStartNotification: function bt_showStartNotification(evt) {
    window.navigator.b2g.permissions.get(
      'desktop-notification',
      window.AppOrigin.getOrigin('bluetooth')
    ).then(perm => {
      if (perm === 'allow' && this._started) {
        let info = {
          id: evt.address,
          title: this._translate('transfer-has-started-title'),
          icon: 'style/bluetooth_transfer/images/icon_bluetooth.png',
          type: 'bluetooth-notification',
          callback: () => {
            this.showStopTransferPrompt(evt.address);
          },
          dismissable: false,
          text : this._translate('transfer-has-started-description'),
        };
        Service.request('NotificationStore:add', info);
      }
    });
  },

  updateProgress: function bt_updateProgress(evt) {
    window.navigator.b2g.permissions.get(
      'desktop-notification',
      window.AppOrigin.getOrigin('bluetooth')
    ).then((perm) => {
      if (perm === 'allow' && this._progress) {
        var info = {
          id: evt.address,
          title: evt.received ?
            this._translate('bluetooth-receiving-progress') :
            this._translate('bluetooth-sending-progress'),
          icon: 'style/bluetooth_transfer/images/icon_bluetooth.png',
          type: 'bluetooth-notification',
          noNotify: true,
          callback: () => {
            this.showStopTransferPrompt(evt.address);
          },
          dismissable: false,
          text : Math.ceil(100 * (evt.processedLength / evt.fileLength)) + '%',
          progress: Math.ceil(100 * (evt.processedLength / evt.fileLength)),
          ignoreTimestamp: true,
          sizeText: this._translate('partialResult', {
            partial: this.humanizeSize(evt.processedLength),
            total: this.humanizeSize(evt.fileLength)
          })
        };
        Service.request('NotificationStore:add', info);

        if (evt.processedLength === evt.fileLength) {
          Service.request('NotificationStore:remove', info.id);
        }
      }
    });
  },

  cancelTransfer: function bt_cancelTransfer(address) {
    this._clearTimeout();
    var adapter = Service.query('Bluetooth.getAdapter');
    if (adapter != null) {
      this._isUserCanceled = true;
      adapter.stopSendingFile(address);
    } else {
      var msg = 'Cannot get adapter from system Bluetooth monitor.';
      this.debug(msg);
    }
  },

  showStopTransferPrompt: function bt_showStopTransferPrompt(address) {
    Service.request('DialogService:show', {
      header: this._translate('stopTransferTitle'),
      content: this._translate('stopTransferContent'),
      ok: 'stop',
      type: 'confirm',
      onOk: this.cancelTransfer.bind(this, address),
      translated: true
    });
  },

  _onTransferComplete: function bt__onTransferComplete(transferInfo) {
    this._clearTimeout();
    if (!this._sendingFilesQueue[0] || (
        this._sendingFilesQueue[0].numberOfFiles -
        this._sendingFilesQueue[0].numSuccessful -
        this._sendingFilesQueue[0].numUnsuccessful === 1)) {
      this._started = false;
      this._progress = false;
    }

     // Don't show the transfer fail notice/toast in the attention screens and
     // passcode lockscreen.
     if (!transferInfo.success &&
      (Service.query('locked') || attentionWindowManager.hasActiveWindow())) {
      return;
    }

    // Remove transferring progress
    Service.request('NotificationStore:remove', transferInfo.address);
    var icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';

    // Show notification
    var nData = {
      title: null,
      icon: icon,
      data: null,
      inoperable: true,
      notificationId: uuid()
    };

    var bluetoothSize = null;
    if (transferInfo.success) {
      // Received file can be opened only
      bluetoothSize = this.humanizeSize(transferInfo.fileLength);
      if (transferInfo.received) {
        nData.title =
          this._translate('transferFinished-receivedSuccessful-title');
        nData.inoperable = false;
      } else {
        nData.title = this._translate('transferFinished-sentSuccessful-title');
      }
    } else {
      //if timeout lead failed, hide the dialog
      //if storage is no memory, don't hide the alert dialog
      bluetoothSize = this.humanizeSize(false);
      if (this._isStorageAvailable) {
        Service.request('DialogService:hide', 'receive-file-prompt-dialog');
      }
      nData.title = this._translate('transferFinished-failed-title');
    }
    nData.data = {
      bluetoothSize: bluetoothSize
    };

    window.navigator.b2g.permissions.get(
      'desktop-notification',
      window.AppOrigin.getOrigin('bluetooth')
    ).then(perm => {
      if (perm === 'allow') {
        Service.request('NotificationStore:add', {
          id: nData.notificationId,
          icon: nData.icon,
          title: nData.title,
          type: 'desktop-notification',
          data: {
            bluetoothSize: bluetoothSize
          },
          callback: () => {
            // Received file can be opened only
            if (transferInfo.success === true && transferInfo.received) {
              this.openReceivedFile(transferInfo);
              Service.request('NotificationStore:remove', nData.notificationId);
            }
          },
          inoperable: nData.inoperable,
          //data: nData.data,  // This removed in the bluetooth v2.5.1 spec
          text: transferInfo.fileName ?
            transferInfo.fileName : this._translate('unknown-file')
        });

        var viaHandover = false;
        if (this._sendingFilesQueue.length > 0) {
          viaHandover = this._sendingFilesQueue[0].viaHandover || false;
        }

        // Have a report notification for sending multiple files.
        this.summarizeSentFilesReport(transferInfo);

        // Inform NfcHandoverManager that the transfer completed
        if(navigator.b2g.nfc){
          const details = {received: transferInfo.received,
                        success: transferInfo.success,
                        viaHandover: viaHandover};
          NfcHandoverManager.transferComplete(details);
        }
      }
    });
  },

  summarizeSentFilesReport: function bt_summarizeSentFilesReport(transferInfo) {
    // Ignore received files
    if (transferInfo.received) {
      return;
    }

    // Consumer: System app consume each sending file request from Bluetooth app
    var msg = 'remove the finished sending task from queue, queue length = ';
    var successful = transferInfo.success;
    var sendingFilesSchedule = this._sendingFilesQueue[0];
    var numberOfFiles = sendingFilesSchedule.numberOfFiles;
    if (numberOfFiles == 1) { // The scheduled task is for sent one file only.
      // We don't need to summarize a report for sent one file only.
      // Remove the finished sending task from the queue
      this._sendingFilesQueue.shift();
      this._isUserCanceled = false;
      msg += this._sendingFilesQueue.length;
      this.debug(msg);
    } else { // The scheduled task is for sent multiple files.
      // Create a report in notification.
      // Record each transferring report.
      if (successful) {
        this._sendingFilesQueue[0].numSuccessful++;
      } else {
        this._sendingFilesQueue[0].numUnsuccessful++;
      }

      var numSuccessful = this._sendingFilesQueue[0].numSuccessful;
      var numUnsuccessful = this._sendingFilesQueue[0].numUnsuccessful;
      if ((numSuccessful + numUnsuccessful) == numberOfFiles) {
        let icon = 'style/bluetooth_transfer/images/icon_bluetooth.png';

        Service.request('NotificationStore:add', {
          id: uuid(),
          icon: icon,
          title: this._translate('transferReport-title'),
          type: 'desktop-notification',

          inoperable: true,
          text: this._translate('transferReport-description', {
              numSuccessful: numSuccessful,
              numUnsuccessful: numUnsuccessful
            })
        });

        // Remove the finished sending task from the queue
        this._sendingFilesQueue.shift();
        this._isUserCanceled = false;
        msg += this._sendingFilesQueue.length;
        this.debug(msg);
      }
    }
  },

  openReceivedFile: function bt_openReceivedFile(evt) {
    // Launch the gallery with an open activity to view this specific photo
    // XXX: Bug 897434 - Save received/downloaded files in one specific folder
    // with meaningful path and filename
    var filePath = 'downloads/Bluetooth/' + evt.fileName;
    var contentType = evt.contentType;
    var storageType = 'sdcard';
    var self = this;
    var storage = navigator.b2g.getDeviceStorage(storageType);
    var getreq = storage.get(filePath);

    getreq.onerror = function() {
      var msg = 'failed to get file:' +
                filePath + getreq.error.name +
                getreq.error.name;
      self.debug(msg);
    };

    getreq.onsuccess = function() {
      var file = getreq.result;
      // When we got the file by storage type of "sdcard"
      // use the file.type to replace the empty fileType which is given by API
      var fileName = file.name;
      var extension = fileName.split('.').pop();
      var originalType = file.type || contentType;
      var mappedType = (MimeMapper.isSupportedType(originalType)) ?
        originalType : MimeMapper.guessTypeFromExtension(extension);

      const activity = new WebActivity(
        mappedType == 'text/vcard' ? 'import' : 'open', {
        type: mappedType,
        blob: file,
        // XXX: https://bugzilla.mozilla.org/show_bug.cgi?id=812098
        // Pass the file name for Music APP since it can not open blob
        filename: fileName
      });
      activity.start().then(() => {}, (error) => {
        var msg = 'open activity error:' + error.name;
        self.debug(msg);
        switch (error.name) {
        case 'NO_PROVIDER':
          Service.request('NotificationView:close');
          // Cannot identify MIMETYPE
          // So, show cannot open file dialog with unknow media type
          self.showUnknownMediaPrompt(fileName);
          return;
        case 'ActivityCanceled':
          return;
        case 'USER_ABORT':
          return;
        default:
          return;
        }
      });
    };
  },

  showUnknownMediaPrompt: function bt_showUnknownMediaPrompt(fileName) {
    let body =
      this._translate('unknownMediaTypeToOpenFile', { fileName: fileName });
    Service.request('DialogService:show', {
      id: 'cannot-open-file-alert',
      title: this._translate('cannotOpenFile'),
      content: body,
      translated: true,
      type: 'alert',
      noClose: true,
      onOk: () => {
        Service.request('DialogService:hide', 'cannot-open-file-alert');
      }
    });
  }

};

exports.BluetoothTransfer = BluetoothTransfer;
})(window);
