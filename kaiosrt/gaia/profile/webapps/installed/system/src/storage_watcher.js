import BaseModule from 'base-module';
/**
 * DeviceStorageWatcher listens for nsIDOMDeviceStorage.onchange events
 * notifying about low device storage situations (see Bug 861921). When a
 * 'onchange' event containing a 'low-disk-space' reason is received, we show a
 * banner for a few seconds and pin a notification in the notifications center.
 * When the reason of the 'onchange' event is 'available-disk-space', we remove
 * the pinned notification, if one exists.
*/

class DeviceStorageWatcher extends BaseModule {
  name = 'DeviceStorageWatcher';

  start() {
    this._ = window.api.l10n.get;
    this._appStorage = navigator.b2g.getDeviceStorage('apps');
    if (!this._appStorage) {
      return;
    }
    this._appStorage.addEventListener('change', this);
    this._firstCheck = true;
    window.addEventListener('homescreenopened', this);
    window.addEventListener('almost-low-disk-space', this);
  }

  hideNotification() {
    this.closeSystemMessageNotification({ tag: 'phone-almost-full' });
  }

  getFreeSpaceSize() {
    let promise = new Promise(resolve => {
      let req = this._appStorage.freeSpace();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve();
    });
    return promise;
  }

  launchSettings() {
    let activity = new WebActivity('configure', {
      section: 'mediaStorage'
    });
    activity.start(() => {
      this.showStorageFullDialog();
    }, () => {
      this.showStorageFullDialog();
    });
  }

  popupStorageFullDialog() {
    Service.request('DialogService:show', {
      header: this._('storage-full-level-1-title'),
      content: this._('delete-to-get-space'),
      translated: true,
      type: 'confirm',
      ok: this._('settings'),
      cancel: 'cancel',
      onOk:() => {
        this.launchSettings();
      }
    });
  }

  showAlmostNotification() {
    let notification = new Notification(this._('storage-alert'), {
      body: this._('phone-almost-full'),
      tag: 'phone-almost-full',
      data: {
        systemMessageTarget: 'phone-almost-full'
      }
    });
    notification.onclick = () => {
      notification.close();
      this.popupStorageFullDialog();
    };
  }

  showStorageFullDialog() {
    let topMostWindow = Service.query('getTopMostWindow');
    if (topMostWindow && topMostWindow.isHomescreen) {
      if (this._hitLowestLevel) {
        Service.request('DialogService:show', {
          id: 'low-storage-warning',
          header: this._('storage-full-level-2-title'),
          content: this._('delete-to-get-space-level-2'),
          translated: true,
          type: 'confirm',
          cancel: 'cancel',
          ok: this._('settings'),
          onOk: () => {
            this.launchSettings();
          },
          onCancel: () => {
          }
        });
      }
    }
  }

  hideStorageFullDialog() {
    Service.request('DialogService:hide', 'low-storage-warning');
  }

  _handle_homescreenopened(evt) {
    if (evt.detail.isHomescreen) {
      this.showStorageFullDialog();
    }
  }

  '_handle_almost-low-disk-space'(evt) {
    this.debug('change almost-low-disk-space ' + evt.detail);
    if (evt.detail) {
      this.showAlmostNotification();
    } else {
      this.hideNotification();
    }
  }

  _handle_change(evt) {
    switch (evt.reason) {
      // We get 'onchange' events with a 'low-disk-space' reason when a
      // modification of a file is identified while the device is in a low
      // storage situation. When we get the first notification, we have to
      // show a system banner and pin a notification in the notifications
      // center, containing the remaining free space. Consecutive events with
      // a 'low-disk-space' reason will only update the remaining free space.
      case 'low-disk-space':
        this._hitLowestLevel = true;
        if (this._firstCheck) {
          this._firstCheck = false;
          this.showStorageFullDialog();
        }
        break;
      case 'available-disk-space':
        this.hideStorageFullDialog();
        this._hitLowestLevel = false;
        break;
    }
    this.debug('change reason ' + evt.reason);
  }
}

const instance = new DeviceStorageWatcher();
instance.start();
window.dsw = instance;

export default instance;
