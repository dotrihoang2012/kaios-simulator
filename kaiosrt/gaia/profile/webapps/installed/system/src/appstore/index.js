import BaseModule from 'base-module';

import {
  DOWNLOAD_ERRORS_TO_MESSAGE,
  AUTO_REBOOT_HANDLED_KEY,
  SETTINGS_KEY,
  DEFAULT_ICON_SIZE,
} from './constant';
import {
  isWifiConnected,
  isDataConnected,
  checkIsLowStorage,
  isLowBattery,
  isPackagedApp,
  getIconUrl,
} from './utils';
import JioService from './jio_service';
import SilentInstallService from './silent_install_service';
import AutoUpdateService from './auto_update_service';
import GlobalService from './global_service';
import APIAdapterHelper from './helper/api-adapter-helper';

class AppStore extends BaseModule {
  constructor() {
    super();

    this.name = 'AppStore';
    this.installedApps = new Map();
    this.ready = false;
    this.screenEnabled = true;
    this.hasWifi = false;
    this.hasData = false;
    this.isUpdatingSystemApp = false;
    this.lowStorageWarned = false;
    /**
     * Set data-enable as default in baseline.
     * @type {"data-enable" | "wifi-only" | "auto-update-off"}
     */
    this.autoDownloadMode = 'data-enable';
    this.autoDownload = isWifiConnected();
    this.jioService = new JioService();
    this.silentInstallService = new SilentInstallService();
    this.globalService = new GlobalService();
    this.autoUpdateService = new AutoUpdateService(this.globalService);
    this.initialized = false;
  }

  get autoDownloadFlag() {
    switch (this.autoDownloadMode) {
      case 'wifi-only':
        // only through wifi
        this.autoDownload = isWifiConnected();
        break;
      case 'auto-update-off':
        // disable auto update
        this.autoDownload = false;
        break;
      case 'data-enable':
        // update through wifi and cellular
        this.autoDownload = true;
        break;
    }
    return this.autoDownload;
  }

  start() {
    if (this.initialized) return;
    const conns = navigator.b2g.mobileConnections;

    this.addAppsManagerListener();
    this.fotaMigration().updateInstalledApps();

    SettingsObserver.observe(
      'app.update.auto-download',
      undefined,
      this['_observe_app.update.auto-download'].bind(this)
    );

    // Only get 'sim.base.customization.completed' value from SettingsManager once
    SettingsObserver.getValue(SETTINGS_KEY.CUSTOMIZATION_COMPLETED).then(
      (isComplete) => {
        this.silentInstallService.setDeviceStatus({
          key: 'isSimBaseCustomizationCompleted',
          value: isComplete,
        });
        if (!isComplete) {
          SettingsObserver.observe(
            SETTINGS_KEY.CUSTOMIZATION_COMPLETED,
            undefined,
            this['_observe_sim.base.customization.completed']
          );
        }
      }
    );

    // register event for silent install
    window.addEventListener('silentInstallDisabled', this);
    // do something after FTU process
    window.addEventListener('ftudone', this);
    window.addEventListener('ftuskip', this);
    // screen is enabled or disabled
    window.addEventListener('screenchange', this);

    // monitor the cellular network state.
    if (conns) {
      Array.from(conns).forEach((conn) => {
        conn.addEventListener('datachange', this);
      });
    }

    // monitor the wifi network state.
    if (navigator.b2g.wifiManager) {
      navigator.b2g.wifiManager.addEventListener('wifihasinternet', this);
    }

    // FIXME: IAC has been deprecated on KaiOS 3.0
    window.addEventListener('iac-storecomms', (event) => {
      const detail = event.detail;
      if (detail.isUpdatingSystemApp === true) {
        this.isUpdatingSystemApp = true;
      } else if (detail.isUpdatingSystemApp === false) {
        this.isUpdatingSystemApp = false;
      }
      if (detail.reboot === true) {
        this.globalService.powerOff();
      }
    });

    window.asyncStorage.getItem(AUTO_REBOOT_HANDLED_KEY, (rebootHandled) => {
      if (rebootHandled === 'true') {
        window.asyncStorage.removeItem(AUTO_REBOOT_HANDLED_KEY);
        this.globalService.showDialog(
          'system-software-updated',
          'device-has-been-restarted',
          {
            translated: false,
            type: 'alert',
          }
        );
      }
    });

    this.initialized = true;
  }

  _handle_datachange() {
    const dataConnected = isDataConnected();

    // Disabled cellular and WIFI in the meantime.
    if (this.hasData && !dataConnected) {
      this.hasWifi = false;
      this.hasData = false;
      return;
    }
    // Only enable the cellular data.
    if (!this.hasData && dataConnected) {
      console.warn('[app_store] RESET RETRY COUNTER');
      this.hasWifi = false;
      this.hasData = true;
      this.silentInstallService.resetRetryCount().retry();
    }
  }

  _handle_wifihasinternet() {
    // Enable WIFI
    if (!this.hasData && !this.hasWifi) {
      console.warn('[app_store] RESET RETRY COUNTER');
      this.hasWifi = true;
      this.hasData = false;
      this.silentInstallService.resetRetryCount().retry();
    }
  }

  _handle_screenchange(evt) {
    this.screenEnabled = evt.detail.screenEnabled;

    const screenLocked = this.globalService.isLockedScreen();
    const {
      hasPendingUpdates,
      isUpdating,
      autoUpdatingApps,
      autoUpdatePendingApps,
    } = this.autoUpdateService;

    this.silentInstallService.setDeviceStatus({
      key: 'screenEnabled',
      value: evt.detail.screenEnabled,
    });

    if (!this.screenEnabled && hasPendingUpdates) {
      // perform auto update only when battery level is above the limit or charging
      if (isLowBattery()) {
        return;
      }

      checkIsLowStorage().then((isLowStorage) => {
        if (isLowStorage === true && this.lowStorageWarned === false) {
          this.lowStorageWarned = true;
          this.globalService.showDialog(
            'storage-full',
            'storage-full-dialog-content',
            {
              translated: false,
              type: 'confirm',
              ok: 'settingsButton.ariaLabel',
              onOk: () => {
                if (!screenLocked) {
                  let activity = new WebActivity('configure', {
                    target: 'device',
                    section: 'applicationStorage',
                  });

                  activity.start();
                }
              },
            }
          );
        } else if (isLowStorage === false) {
          this.autoUpdateService
            .downloadSystemAppsWithCondition(screenLocked)
            .downloadNormalApps();
        }
      });
    }

    if (this.screenEnabled && isUpdating) {
      if (autoUpdatingApps.system.size > 0) {
        this.globalService.toggleAutoUpdateView('show', { isSystemApp: true });
      } else if (autoUpdatingApps.normal.size > 0) {
        this.globalService.toggleAutoUpdateView('show', { isSystemApp: false });
      }
    }

    if (
      this.screenEnabled &&
      !isUpdating &&
      screenLocked &&
      autoUpdatePendingApps.system.size > 0
    ) {
      this.globalService.showDialog(
        'system-software-update',
        'restart-required-after-update',
        {
          translated: false,
          type: 'confirm',
          ok: 'update',
          onOk: () => {
            this.autoUpdateService.downloadSystemApps();
          },
        }
      );
    }
  }

  _handle_ftudone() {
    this.silentInstallService.activate();
  }

  _handle_ftuskip() {
    this.silentInstallService.activate();
  }

  _handle_silentInstallDisabled() {
    // Remove the event listeners
    window.removeEventListener('ftudone', this);
    window.removeEventListener('ftuskip', this);

    const conns = navigator.b2g.mobileConnections || [];

    if (conns) {
      Array.from(conns).forEach((conn) => {
        conn.removeEventListener('datachange', this);
      });
    }

    if (navigator.b2g.wifiManager) {
      navigator.b2g.wifiManager.removeEventListener('wifihasinternet', this);
    }
  }

  //should read `autoDownloadMode` from settings.
  '_observe_app.update.auto-download'(value) {
    if (typeof value !== 'undefined') {
      this.autoDownloadMode = value;
    }
  }

  '_observe_sim.base.customization.completed' = (value) => {
    if (typeof value !== 'undefined' && value) {
      SettingsObserver.unobserve(
        SETTINGS_KEY.CUSTOMIZATION_COMPLETED,
        this['_observe_sim.base.customization.completed']
      );

      this.silentInstallService
        .setDeviceStatus({
          key: 'isSimBaseCustomizationCompleted',
          value,
        })
        .activate();
    }
  };

  addAppsManagerListener() {
    if (!AppsManager) {
      return;
    }

    AppsManager.addEventListener('install', this.handleInstalled);
    AppsManager.addEventListener('uninstall', this.handleUninstalled);
    AppsManager.addEventListener('update', this.handleUpdated);
    AppsManager.addEventListener(
      'update_available',
      this.handleUpdateAvailable
    );
    AppsManager.addEventListener(
      'download_failed',
      this.handleDownloadFailedEvent
    );
  }

  addApp(appObject) {
    if (window.isJioApplication) {
      this.jioService.addApp(appObject);
    }

    // For fast search
    this.installedApps.set(appObject.manifestUrl, appObject);
  }

  fotaMigration() {
    // Since new setting won't be bring to new version after fota,
    // So system should help set it.

    SettingsObserver.getValue(
      SETTINGS_KEY.ENABLE_SETTINGS_FEATURE_IN_STORE
    ).then((value) => {
      if (typeof value === 'undefined') {
        SettingsObserver.setValue([
          {
            name: SETTINGS_KEY.ENABLE_SETTINGS_FEATURE_IN_STORE,
            value: true,
          },
        ]);
      }
    });

    return this;
  }

  updateInstalledApps() {
    AppsManager.getAll().then((apps) => {
      apps.forEach((appObject) => {
        APIAdapterHelper.transformCompatibleAppsObject(appObject).then(
          (transFormedAppObj) => {
            this.addApp(transFormedAppObj);
            this.ready = true;
            this.emit('ready');
          }
        );
      });
    });
  }

  handleInstalled = (appObject) => {
    APIAdapterHelper.transformCompatibleAppsObject(appObject).then(
      (transFormedAppObj) => {
        this.addApp(transFormedAppObj);
        this.emit('change');
        this.publish('evl-downloadapplied', transFormedAppObj);
        this.downloadSuccess(transFormedAppObj);

        if (window.isJioApplication) {
          this.jioService.handleAppInstalled(transFormedAppObj);
        }
      }
    );
  };

  handleUninstalled = (appObject) => {
    const { manifestUrl } = appObject;
    const isAppExisting = this.installedApps.get(manifestUrl);

    if (isAppExisting) {
      this.installedApps.delete(manifestUrl);
      this.emit('change');
      return true;
    } else {
      return false;
    }
  };

  handleUpdateAvailable = (appObject) => {
    const cachedAppObject = this.installedApps.get(appObject.manifestUrl);
    const hasCachedAppObject = !!cachedAppObject;
    const prepareAppObjectPromise = hasCachedAppObject
      ? Promise.resolve(cachedAppObject)
      : APIAdapterHelper.transformCompatibleAppsObject(appObject);

    prepareAppObjectPromise.then((transFormedAppObj) => {
      if (!hasCachedAppObject) {
        this.addApp(transFormedAppObj);
      }

      const { allowedAutoDownload } = transFormedAppObj;

      if (
        (this.autoDownloadFlag && allowedAutoDownload) ||
        (window.isJioApplication && allowedAutoDownload)
      ) {
        this.autoUpdateService.addToPendingUpdatesMap(transFormedAppObj);
      }
    });
  };

  handleUpdated = (appObject) => {
    this.isUpdatingSystemApp = false;

    APIAdapterHelper.transformCompatibleAppsObject(appObject).then(
      (transFormedAppObj) => {
        const { allowedAutoDownload, manifestURL } = transFormedAppObj;

        this.addApp(transFormedAppObj);

        // If allowAuto is true, it means this update belongs to silent update.
        // So don't fire notice.
        if (allowedAutoDownload) {
          this.autoUpdateService.handleDownloadComplete(
            transFormedAppObj,
            true
          );
        } else {
          if (isPackagedApp(transFormedAppObj)) {
            this.downloadSuccess(transFormedAppObj, true);
          }
        }

        // The preloaded payment would use 'kaios-pay'; Otherwise use 'kaipay'.
        if (
          manifestURL === window.AppOrigin.getManifestURL('kaios-pay') ||
          manifestURL === window.AppOrigin.getManifestURL('kaipay')
        ) {
          // if the updated app is KaiOS Pay
          window.appWindowFactory.publish('reloadpaymentwindow', {});
        }
      }
    );
  };

  handleDownloadFailedEvent = (downloadFailedReason) => {
    const { appsObject, reason } = downloadFailedReason;
    this.publish('evl-downloaderror', appsObject);
    const { allowedAutoDownload } = appsObject;

    if (allowedAutoDownload) {
      this.autoUpdateService.handleDownloadComplete(appsObject, false);
    } else if (reason === AppsManager.AppsServiceError.UPDATE_ERROR) {
      if (isPackagedApp(app) || window.isJioApplication) {
        this.downloadError(downloadFailedReason, true);
      }
    } else {
      this.downloadError(downloadFailedReason);
    }
  };

  downloadSuccess(transFormedAppObj, update = false) {
    // Block auto update.
    if (transFormedAppObj.allowedAutoDownload) {
      return;
    }

    // Check silent install or not
    const isSilent = this.silentInstallService.checkIsSilent(
      transFormedAppObj.updateUrl
    );

    if (window.isJioApplication) {
      this.jioService.handleDownloadSuccess(transFormedAppObj, isSilent);
    }

    if (isSilent) {
      this.silentInstallService.setInstalledApps(transFormedAppObj.updateUrl);
    } else {
      const { manifestURL, manifest } = transFormedAppObj;
      const { name: appName, icons } = manifest;
      let msgBody;

      if (update) {
        msgBody = window.api.l10n.get('update_succeeded');
      } else {
        msgBody = window.api.l10n.get('download_succeeded');
      }

      let options = {
        body: msgBody,
      };
      let noticeCallback = function _launchAPP() {
        window.AppsManager.launch(manifestURL);
      };

      const { origin } = new URL(manifestURL);
      getIconUrl(icons, {
        origin,
        preferredSize: DEFAULT_ICON_SIZE.NORMAL,
      })
        .then((imageUrl) => {
          options['icon'] = imageUrl;

          this.globalService.showNotification(appName, options, noticeCallback);
        })
        .catch(() => {
          this.globalService.showNotification(appName, options, noticeCallback);
        });
    }
  }

  downloadError(downloadFailedReason, update = false) {
    const { appsObject, reason } = downloadFailedReason;
    const isSilent = this.silentInstallService.checkIsSilent(
      appsObject.updateUrl
    );

    if (update) {
      this.isUpdatingSystemApp = false;
    }

    if (!isSilent) {
      const errorNameToHuman = DOWNLOAD_ERRORS_TO_MESSAGE[reason];
      let title = null;
      let msg = null;

      switch (errorNameToHuman) {
        case 'storage-issue':
          this.globalService.showDialog(
            'storage-full-level-2-title',
            'delete-to-get-space-level-2',
            {
              translated: false,
              type: 'confirm',
              cancel: 'cancel',
              ok: 'settings',
              onOk: () => {
                let activity = new WebActivity('configure', {
                  section: 'mediaStorage',
                });
                activity.start();
              },
            }
          );
          break;
        case 'network-issue':
          title = update ? 'device-issue-update-title' : 'device-issue-title';
          msg = 'device-issue-detail';
          break;
        case 'device-issue':
          title = 'device-issue-title';
          msg = 'device-issue-detail';
          break;
        default:
          console.error(`downloadError with reason: ${reason}`);
          break;
      }

      if (!title || !msg) {
        return;
      }

      title = window.api.l10n.get(title);
      const body = window.api.l10n.get(msg);

      this.globalService.showNotification(title, {
        icon: 'download',
        body,
      });
    }

    if (window.isJioApplication) {
      this.jioService.handleDownloadError(downloadFailedReason, {
        isUpdate: update,
      });
    }
  }
}

const appStore = new AppStore();

window.addEventListener('services-init-complete', () => {
  appStore.start();
});

window.as = appStore;

export default appStore;
