import {
  AUTO_UPDATE_SUCCESS_FADEOUT,
  AUTO_REBOOT_HANDLED_KEY,
} from './constant';

class AutoUpdateService {
  constructor(globalServiceInstance) {
    if (AutoUpdateService.instance) {
      return AutoUpdateService.instance;
    }

    AutoUpdateService.instance = this;
    this.globalService = globalServiceInstance;
    this.autoUpdatingApps = {
      system: new Map(),
      normal: new Map(),
      reboot: false,
    };
    this.autoUpdatePendingApps = {
      system: new Map(),
      normal: new Map(),
    };
  }

  get isUpdating() {
    const apps = this.autoUpdatingApps;
    return apps.system.size + apps.normal.size;
  }

  get isUpdateFinished() {
    const apps = this.autoUpdatingApps;
    const remainingItems = apps.system.size + apps.normal.size;
    return remainingItems === 0;
  }

  get isRebootNeeded() {
    return this.autoUpdatingApps.reboot;
  }

  get hasPendingUpdates() {
    const apps = this.autoUpdatePendingApps;
    const remainingItems = apps.system.size + apps.normal.size;
    return remainingItems > 0;
  }

  isUpdatingApp = (manifestURL) => {
    return (
      this.autoUpdatingApps.system.has(manifestURL) ||
      this.autoUpdatingApps.normal.has(manifestURL)
    );
  };

  downloadSystemApps = () => {
    this.autoUpdatePendingApps.system.forEach((transFormedAppObj) => {
      this.transitionToUpdatingMap(transFormedAppObj);
      AppsManager.update(transFormedAppObj.manifestURL);
    });

    return this;
  };

  downloadSystemAppsWithCondition = (screenLocked) => {
    this.autoUpdatePendingApps.system.forEach((transFormedAppObj) => {
      const rebootNeeded = transFormedAppObj.manifest.reboot;
      if (!screenLocked || (screenLocked && !rebootNeeded)) {
        this.transitionToUpdatingMap(transFormedAppObj);
        AppsManager.update(transFormedAppObj.manifestURL);
      }
    });

    return this;
  };

  downloadNormalApps = () => {
    this.autoUpdatePendingApps.normal.forEach((transFormedAppObj) => {
      this.transitionToUpdatingMap(transFormedAppObj);
      AppsManager.update(transFormedAppObj.manifestURL);
    });

    return this;
  };

  transitionToUpdatingMap = (transFormedAppObj) => {
    if (!transFormedAppObj.manifest) {
      return;
    }

    if (transFormedAppObj.manifest.core) {
      this.autoUpdatePendingApps.system.delete(transFormedAppObj.manifestURL);
      this.autoUpdatingApps.system.set(transFormedAppObj.manifestURL, transFormedAppObj);
    } else {
      this.autoUpdatePendingApps.normal.delete(transFormedAppObj.manifestURL);
      this.autoUpdatingApps.normal.set(transFormedAppObj.manifestURL, transFormedAppObj);
    }
  };

  addToPendingUpdatesMap = (transFormedAppObj) => {;
    if (!transFormedAppObj.manifest) return;

    const { core: isCore } = transFormedAppObj.manifest;
    const { system, normal } = this.autoUpdatePendingApps;

    if (isCore) {
      system.set(transFormedAppObj.manifestURL, transFormedAppObj);
    } else {
      normal.set(transFormedAppObj.manifestURL, transFormedAppObj);
    }
  };

  removeFromUpdatingMap = (transFormedAppObj, downloadSucceeded) => {
    const { core: isCore } = transFormedAppObj.manifest;
    const { system, normal } = this.autoUpdatingApps;

    if (isCore) {
      if (transFormedAppObj.manifest.reboot && downloadSucceeded) {
        this.autoUpdatingApps.reboot = true;
      }
      system.delete(transFormedAppObj.manifestURL);
    } else {
      normal.delete(transFormedAppObj.manifestURL);
    }
  };

  handleDownloadComplete = (transFormedAppObj, success) => {
    if (!transFormedAppObj.manifest) {
      return;
    }

    if (!this.isUpdatingApp(transFormedAppObj.manifestURL)) {
      return;
    }

    this.removeFromUpdatingMap(transFormedAppObj, success);

    // last auto update app cleared
    if (this.isUpdateFinished) {
      this.globalService.toggleAutoUpdateView('show', { updateSuccess: true });
      setTimeout(() => {
        this.globalService.toggleAutoUpdateView('hide');
        if (this.isRebootNeeded) {
          window.localStorage.setItem(AUTO_REBOOT_HANDLED_KEY, 'true');
          this.globalService.powerOff();
        }
      }, AUTO_UPDATE_SUCCESS_FADEOUT);
    }
  };
}

export default AutoUpdateService;
