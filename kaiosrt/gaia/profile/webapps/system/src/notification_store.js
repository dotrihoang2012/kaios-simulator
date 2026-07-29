/* global SettingsObserver, Service, applications */
'use strict';

import BaseModule from 'base-module';
import Voicemail from './voicemail';

class NotificationStore extends BaseModule {
  name = 'NotificationStore';

  EVENT_PREFIX = 'notification-';

  SILENT_APPLICATIONS = [
    window.AppOrigin.getManifestURL('network-alerts')
  ];

  MAX_SIZE = 99;

  APP_ICON_SIZE = 84;

  // XXX: Move to lockscreen?
  lockscreenPreview = false;
  lockscreenContentShow = false;

  start() {
    window.addEventListener('applicationuninstall', (evt) => {
      let app = evt.detail.application;
      if (app) {
        this.clearAppNotice(app.manifestUrl);
      }
    });

    window.addEventListener('applicationenabledstatechange', (evt) => {
      let app = evt.detail.application;
      if (app) {
        let manifest = app.manifest ? app.manifest : app.updateManifest;
        if (
          // refer to https://bugzilla.kaiostech.com/show_bug.cgi?id=101314
          (typeof app.enabled !== 'undefined') && !app.enabled ||
          manifest.role === 'invisible' ||
          app.role === 'invisible'
        ) {
          this.removeDisabledAppNotice(app.manifestURL);
        }
      }
    });
    this.notificationMap = new Map();
    this.newComingCountMap = new Map();
    this.newComingCountSize = 0;
    window.addEventListener('applicationready', () => {
      this._resendStoredNotifications();
    },  { once: true });
    Service.register('handleEvent', this);
    Service.register('add', this);
    Service.register('remove', this);
    Service.register('clearAppNotice', this);
    Service.register('removeSystemNoticeByTag', this);

    Service.registerState('getAll', this);
    Service.registerState('isResending', this);
    Service.registerState('unreadCount', this);
    Service.registerState('lockscreenContentShow', this);

    SettingsObserver.observe('lockscreen.notifications-preview.enabled', true,
      this['_observe_lockscreen.notifications-preview.enabled'].bind(this));
    SettingsObserver.observe('lockscreen.notifications.content.enabled', true,
      this['_observe_lockscreen.notifications.content.enabled'].bind(this));

    this.resetNewComingCount();
  }

  clearAppNotice(manifestUrl) {
    let changed = false;
    this.notificationMap.forEach((detail, id) => {
      if (detail.manifestURL === manifestUrl) {
        changed = true;
        this.remove(id, true);
      }
    });
    if (changed) {
      this.publish('update-launcher');
      this.emit('deleted');
      this.emit('changed');
    }
  }

  removeDisabledAppNotice(manifestUrl) {
    this.clearAppNotice(manifestUrl)
  }

  unreadCount() {
    return this.notificationMap.size;
  }

  getAll() {
    return this.notificationMap;
  }

  '_observe_lockscreen.notifications-preview.enabled'(value) {
    this.lockscreenPreview = value;
    window.ExternalScreenManager &&
    window.ExternalScreenManager.send(
      new CustomEvent('noticepreviewenabled', { detail: value }));
  }

 '_observe_lockscreen.notifications.content.enabled'(value) {
    if (value === undefined) {
      this.lockscreenContentShow = true;
    } else {
      this.lockscreenContentShow = value;
    }
    window.ExternalScreenManager &&
    window.ExternalScreenManager.send(
      new CustomEvent('noticecontentshow', { detail: value }));
  }

  removeSystemNoticeByTag(tag, fromServiceWorker) {
    let id = '';
    if (fromServiceWorker) {
      id = `${window.AppOrigin.getOrigin('system')}#tag:${tag}`
    } else {
      id = `null#tag:${tag}`
    }
    this.remove(id);
  }

  isImage(icon) {
    const ext = ['.png', '.svg'];
    return ext.some(el => icon.endsWith(el));
  }

  handleEvent(evt) {
    var detail = evt.detail;
    switch (detail.type) {
      case 'desktop-notification':
        // It's a workaround patch fast resolve process notification send from
        // system app, else we need implement a system notices manager between
        // proxy and system app. (new notification() in proxy, and relate
        // callback function defined in system app, use postmessage to trans
        // notification process, click/close)
        var systemOrigin = window.AppOrigin.getOrigin('system');
        if (detail.id.startsWith('null')) {
          var origin = systemOrigin;
        } else {
          var { origin } = new URL(detail.id);
        }
        // Fix manifestURL before api provides it.
        if (!detail.manifestURL) {
          detail.manifestURL = `${origin}/${window.AppOrigin.getManifestName()}`;
        }

        // https://git.kaiostech.com/KaiOS/gecko-dev/-/blob/v3.0/b2g/chrome/
        // content/embedding/web-embedder.md, need FE get appIcon.
        let app = applications.getByManifestURL(detail.manifestURL);
        if (!app && !detail.icon && !detail.appIcon) {
          detail.icon =
            systemOrigin + '/style/notifications/images/browser_56.png';
        }
        if (app) {
          let appIcon = applications.getSuitableIconSrc(detail.manifestURL,
            app.manifest.icons,
            this.APP_ICON_SIZE * Math.ceil(window.devicePixelRatio || 1));
          detail.appIcon = appIcon;
        }
        // If icon path is a relative path, then change to absolute path
        if (detail.icon.includes('/') && !detail.icon.includes('://') &&
          !detail.icon.startsWith('blob:') &&
          !detail.icon.startsWith('data:')) {
          detail.icon = `${detail.origin}${detail.icon}`;
        }

        if (detail.icon) {
          detail.icon =
            detail.icon.replace('chrome://system', systemOrigin);
        }
        if (detail.appIcon) {
          detail.appIcon =
            detail.appIcon.replace('chrome://system', systemOrigin);
        }
        this.add(detail);
        if (this._resendExpecting === 1) {
          this.storeReady();
        }
        this._resendExpecting = Math.max(this._resendExpecting - 1, 0);
        var event = new CustomEvent('notification', {detail: detail});
        window.ExternalScreenManager &&
        window.ExternalScreenManager.send(event);
        window.dispatchEvent(event);
        break;
      case 'desktop-notification-remove':
        this.remove(detail.id);
        break;
    }
  }

  /**
   * Store finishes to get the notifications after restarting
   */
  storeReady() {
    window.dispatchEvent(
      new CustomEvent('notification-store-ready'));
  }

  /**
   * Increase new coming notice count
   * @param {object} detail detail.appName should be in ICON_MAP
   */
  addNewComingCount(detail) {
    this.newComingCountSize += 1;
    if (this.newComingCountSize > this.MAX_SIZE) {
      this.resetNewComingCount();
      this.notificationMap.forEach((detail) => {
        this.addNewComingCount(detail);
      });
      return;
    }
    let targetAppName = detail.manifestURL;
    let icon = detail.appIcon;
    // if is voicemail notification
    if (detail.manifestURL === window.AppOrigin.getManifestURL('system') &&
      detail.icon === Voicemail.icon) {
      targetAppName = 'Voicemail';
      icon = detail.icon;
    } else if (detail.icon ===
      'style/bluetooth_transfer/images/icon_bluetooth.png') {
      targetAppName = 'Bluetooth';
      icon = detail.icon;
    } else if (detail.data &&
      detail.data.systemMessageTarget === 'system-download') {
      targetAppName = 'Download';
      icon = detail.icon;
    } else if (detail.id.includes('batteryFull')) {
      targetAppName = 'BatteryFull';
      icon = 'style/notifications/images/battery_full.png';
    }

    const info = this.newComingCountMap.get(targetAppName);
    const count = info ? info.count + 1 : 1;
    if (this.newComingCountMap.get(targetAppName)) {
      this.newComingCountMap.delete(targetAppName);
    }
    this.newComingCountMap.set(targetAppName, {
      count: count,
      icon: icon
    });
  }

  resetNewComingCount() {
    this.newComingCountMap.clear();
    this.newComingCountSize = 0;
  }

  add(detail) {
    this.isResending = !!this._resendExpecting;
    /* If dir "auto" was specified by the notification,
     * use document direction instead because dir="auto"
     * does not align the notification node according to
     * the system language direction but instead it aligns
     * every child element according to its own language
     * which creates a UI mess we can't control by changing
     * the system language.
     */
    var manifestUrl = detail.manifestURL || '';
    let app = applications.getByManifestURL(manifestUrl);
    if (app) {
      let manifest = app.manifest ? app.manifest : app.updateManifest;
      if (
        // refer to https://bugzilla.kaiostech.com/show_bug.cgi?id=101314
        (typeof app.enabled !== 'undefined') && !app.enabled ||
        manifest.role === 'invisible' ||
        app.role === 'invisible'
      ) {
        return;
      }
    }

    var behavior = detail.mozbehavior || {};
    if (detail.dismissable === undefined) {
      detail.dismissable = true;
    }
    if (behavior && behavior.noclear) {
      detail.dismissable = false;
    }
    if (detail.timestamp === undefined) {
      detail.timestamp = new Date().getTime();
    }

    if (!detail.isDownload && !detail.type.startsWith('bluetooth')) {
      this.publish('mozContentNotificationEvent', {
        type: 'desktop-notification-show',
        id: detail.id
      }, true);
    }

    // check notification count limit before adding a new one
    if (this.notificationMap.size >= this.MAX_SIZE && !this.notificationMap.has(detail.id)) {
      var id = this.notificationMap.entries().next().value[0];
      this.remove(id, true);
    }
    this.notificationMap.set(detail.id, detail);
    if (detail.progress === undefined) {
      this.sortMap();
    }

    var notify = !('noNotify' in detail) &&
      // don't notify for network-alerts notifications
      (!this.SILENT_APPLICATIONS.includes(detail.manifestURL));

    if (notify && !this.isResending &&
      !(Service.query('isDeepCleanupMemory') && this._resendExpecting)) {
      Service.request('NotificationDialogView:maybeHide', detail);
      if (!Service.query('locked') || this.lockscreenPreview) {
        if (detail.requireInteraction) {
          Service.request('NotificationDialogView:show', detail);
        } else {
          Service.request('NotificationToaster:show', detail);
        }
      }

      // pump new notice together with the toaster
      if (Service.query('isPocketMode') && this.lockscreenPreview) {
        this.addNewComingCount(detail);
        this.publish('add-to-lockscreen', detail);
      }
    }
    if (!this.isResending && notify) {
      this.publish('update-launcher', detail);
    }

    this.emit('added');
    this.emit('changed', detail);
  }

  sortMap() {
    this.notificationMap = new Map([...this.notificationMap.entries()].sort((a, b) => {
      return a[1].timestamp > b[1].timestamp || a[1].progress !== undefined;
    }));
  }

  click(id) {
    const detail = this.notificationMap.get(id);

    if (detail && detail.callback) {
      detail.callback();
      return;
    }

    if (detail.requireInteraction) {
      Service.request('NotificationDialogView:show', detail, true);
    } else {
      const event = new CustomEvent('desktop-notification-click', {
        detail: { id: detail.id }
      });
      window.dispatchEvent(event);
    }
  }

  removeAll() {
    this.notificationMap.forEach((detail, id) => {
      if (detail.type === 'download-notification-downloading') {
        return;
      }
      if (detail.dismissable === false) {
        return;
      }
      this.remove(id, true);
    }, this);
    this.publish('update-launcher');
    this.emit('deleted');
    this.emit('changed');
  }

  remove(id, ignoreChange) {
    const detail = this.notificationMap.get(id);
    if (detail && detail.type.startsWith('download-notification-')) {
      DownloadNotificationStore.removeNotification(detail.downloadPath);
    }

    if (!this.notificationMap.get(id)) {
      return;
    }
    this.notificationMap.delete(id);
    const event = new CustomEvent('desktop-notification-close', {
      detail: { id: id }
    });
    window.dispatchEvent(event);
    if (!ignoreChange) {
      this.publish('update-launcher');
      this.emit('deleted', id);
      this.emit('changed');
    }
  }

  _resendStoredNotifications() {
    SettingsObserver.getValue('notifications.resend').then((value) => {
      let resendEnabled = value || false;
      if (!resendEnabled) {
        this.storeReady();
        return;
      }

      let resendCallback = ((number) => {
        this._resendExpecting = number;
        if (!number) {
          this.storeReady();
        }
      });

      window.dispatchEvent(
        new CustomEvent('desktop-notification-resend-all', {
          detail: {
            callback: resendCallback
          }
        }));
    });
  }
}

var notificationStore = new NotificationStore();

window.addEventListener('load', () => {
  notificationStore.start();
});

export default notificationStore;
