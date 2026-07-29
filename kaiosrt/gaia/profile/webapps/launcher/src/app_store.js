import Service from 'service';
import BaseEmitter from 'base-emitter';
import * as utils from './util/utils';
import { removeItemFromAppsOrder } from './AppList/sortOperations';
import { mountItemIcon } from './AppStore/iconOperations';
import * as Item from './AppStore/Item';
import * as ItemUtils from './AppStore/ItemUtils';
import ItemType from './AppStore/ItemType';
import Customization from './Customization';
import { eventLogger, EVENT_TYPES } from './eventlogger';
import defaultAppsOrder from './Configs/defaultAppsOrder';
import defaultFolderApp from './Configs/defaultFolderApp';
import defaultVirtualAPP from './Configs/defaultVirtualApp';
import forceSettingsName from './Configs/defaultForceSettingsName';
import BookmarkDB from './AppStore/BookmarkDB';
import AppNotices from './AppNotice';

let folderNames = [];
let defaultFolderApps = [];
let customizaedFolder = {};

const defaultFlags = {
  stkEnabled: false,
  airplaneModeEnabled: false,
  forcedOpenFolder: false
};

// Provide temporary verification code to verify the forced
// opening of the folder function, should be deleted after the
// test is completed
if (localStorage.getItem('forcedOpenFolder')) {
  defaultFlags.forcedOpenFolder = true;
}

class AppStore extends BaseEmitter {

  name = 'AppStore';
  initialized = false;
  apps = [];
  flags = defaultFlags;
  defaultAppsOrder = defaultAppsOrder;

  constructor() {
    super();
    // We expected that window.localized should invoke the initialize method.
    // But when it doesn't, we will manually fire the initialization.
    Service.register('updateFolderOrder', this);
    window.addEventListener('localized', this.handlers.windowLocalized);
    this.initAppManagerListener();
    this.initBookMarkListener();

    if (!this.initialized) {
      this.initialize();
    }
  }

  initialize = () => {
    if (this.initialized) {
      console.warn(`
        Potential duplicated initializing detected.
        This may only happen during the development,
        but should not be seen on the production build.
      `);
      return;
    }

    this.initialized = true;
    this.generateAllItems();

    /**
     * The Customization class is responsible for handling
     * the setting key: `home.customization.rules`.
     */
    this.customization = new Customization();
    this.customization.on('updated',
      this.handlers.customizationUpdated);
    this.customization.mount();

    SettingsObserver.observe('icc.applications', null,
      this.handlers.iccApps);
    SettingsObserver.observe('airplaneMode.status', null,
      this.handlers.airplaneModeToggled);
  };

  initAppManagerListener = () => {
    AppsManager.addEventListener('update', this.handlers.appUpdate);
    AppsManager.addEventListener('install', this.handlers.appInstall);
    AppsManager.addEventListener('uninstall', this.handlers.appUninstall);
    AppsManager.addEventListener('enabledstatechange', this.handlers.enabledStateChange);
  };

  initBookMarkListener = () => {
    Service.register('updateBookmark', this);
    Service.register('removeBookmark', this);

    navigator.serviceWorker.addEventListener('message', (event) => {
      const bookMarkActivity = event.data;
      if (bookMarkActivity.name === 'bookmark') {
        if (bookMarkActivity.type === 'add-success') {
          this.handlers.bookmarkAdded(bookMarkActivity.data);
        } else if (bookMarkActivity.type === 'remove-success') {
          this.handlers.bookmarkRemoved(bookMarkActivity.data);
        }
      }
    });
  };

  updateBookmark = (result) => this.handlers.bookmarkUpdated(result);
  removeBookmark = (result) => this.handlers.bookmarkRemoved(result);

  /**
   * The method that revokes all the state, flags, and event handlers.
   * Only used for testing purpose.
   */
  reset() {
    this.apps = [];
    this.flags = defaultFlags;

    window.removeEventListener('localized',
      this.handlers.windowLocalized);

    if (AppsManager) {
      AppsManager.removeEventListener('update',
        this.handlers.appUpdate);
      AppsManager.removeEventListener('install',
        this.handlers.appInstall);
      AppsManager.removeEventListener('uninstall',
        this.handlers.appUninstall);
      AppsManager.removeEventListener('enabledstatechange',
        this.handlers.enabledStateChange);
    }

    if (BookmarkDB) {
      Service.unregister('updatebookmark', this);
      Service.unregister('removebookmark', this);
    }

    if (this.customization) {
      this.customization.offAll('updated');
      this.customization.unmount();
    }

    SettingsObserver.unobserve('icc.applications',
      this.handlers.iccApps);
    SettingsObserver.unobserve('airplaneMode.status',
      this.handlers.airplaneModeToggled);
  }

  initFolderConfig() {
    return new Promise((res) => {
      DeviceCapabilityManager.get('hardware.memory').then((memOnDevice) => {
        let localFoder = localStorage.getItem('localFolderOrder');
        if (!this.isInitEnd) {
          defaultFolderApps = defaultFolderApps.concat(JSON.parse(localFoder) ||
          (memOnDevice <= 256 ? [] : defaultFolderApp));
          this.hidePresetFolder();
        }

        if (memOnDevice === 256) {
          folderNames = ['Carrier'];
        } else {
          folderNames = ['Games', 'Carrier', 'Utilities'];
        }
        res();
      });
    });
  }

  hidePresetFolder() {
    const forceSettings = Service.query('forceSettings');
    const names = forceSettings && forceSettings[forceSettingsName[0]];
    if (!names || !names.length) return;

    const defaultFolder = Object.assign([], defaultFolderApps);
    names.forEach((name) => {
      defaultFolder.forEach((item, index) => {
        if (name === item.basisname) {
          defaultFolderApps.splice(index, 1);
        }
      });
    });
  }

  hideGVAApp() {
    const hideGVAStep = [
      { enabled: false },
      { enabled: true },
      { enabled: false },
      { enabled: false },
      { enabled: false },
      { enabled: true }
    ];
    let hasGVAApp = false;

    this.apps.forEach((item) => {
      if (item.origin === window.AppOrigin.getOrigin('assistant')) {
        hasGVAApp = true;
      }
    });
    Service.request('updateDefaultTutorial', !hasGVAApp ? hideGVAStep : null);
  }

  /**
   * Event handlers for AppStore.
   */
  handlers = {
    windowLocalized: () => {
      this.isInitEnd && this.generateAllItems();
    },
    appUpdate: (app) => {
      this.getAppManifest(app).then((result) => {
        const { app: completeApp } = result;
        if (completeApp.manifest.categories) {
          this.updateFolderApp(completeApp);
        }
      });
    },
    appInstall: (app) => {
      // pending --> installed <---> updating
      if (0 === app.installState) {
        app.installFromStore = true;
        this.getAppManifest(app).then((result) => {
          const { app: completeApp, appListItem } = result;
          if (completeApp.manifest.categories) {
            this.installAppIntoFolder(completeApp, appListItem[0].displayName);
          }

          appListItem.forEach((installedItem) => {
            eventLogger.log({
              type: EVENT_TYPES.APP_POSITION,
              app_id: installedItem.manifestUrl,
              app_version: installedItem.manifest &&
                installedItem.manifest.version,
              starting_position: -1,
              end_position: installedItem.position
            });
          });
        });
      } else {
        app.ondownloadapplied = (e) => {
          app.ondownloadapplied = null;
          app.ondownloaderror = null;
          this.handlers.appInstall(e);
        };
        app.ondownloaderror = () => {
          app.ondownloadapplied = null;
          app.ondownloaderror = null;
          console.error('App download fail.');
        };
      }
    },
    appUninstall: (appUrl) => {
      const removedItem = this.removeItemByManifestURL(appUrl);
      removeItemFromAppsOrder(appUrl);

      if (removedItem.manifest.categories) {
        this.uninstallAppIntoFolder(removedItem);
      }

      if (removedItem) {
        eventLogger.log({
          type: EVENT_TYPES.APP_POSITION,
          app_id: removedItem.manifestUrl,
          app_version: removedItem.manifest &&
            removedItem.manifest.version,
          starting_position: removedItem.position,
          end_position: -1
        });
      }
    },
    bookmarkAdded: (bookmark) => {
      const addedItemList = this.addItem(ItemType.Bookmark, { bookmark });
      addedItemList.forEach((addedItem) => {
        eventLogger.log({
          type: EVENT_TYPES.APP_POSITION,
          app_id: addedItem.manifestUrl,
          app_version: null,
          starting_position: -1,
          end_position: addedItem.position
        });
      });
    },
    bookmarkUpdated: (bookmark) => {
      this.addItem(ItemType.Bookmark, { bookmark });
    },
    bookmarkRemoved: (bookmark) => {
      const bookmarkUrl = bookmark.url;
      const removedItem = this.removeItemByManifestURL(bookmarkUrl);
      removeItemFromAppsOrder(bookmarkUrl);
      if (removedItem) {
        eventLogger.log({
          type: EVENT_TYPES.APP_POSITION,
          app_id: removedItem.manifestUrl,
          app_version: null,
          starting_position: removedItem.position,
          end_position: -1
        });
      }
    },
    iccApps: (json) => {
      try {
        if (!json) return;
        const menu = JSON.parse(json);
        this.flags.stkEnabled = (
          menu &&
          ('object' === typeof menu) &&
          Object.keys(menu).length > 0
        );
        if (Object.keys(menu).length === 1) {
          this.stkName = menu[Object.keys(menu)[0]].entries.title;
        } else {
          this.stkName = '';
        }
        this.notifyChange();
      } catch (err) {
        console.error(err);
      }
    },
    airplaneModeToggled: (value) => {
      switch (value) {
        case 'enabled':
          this.flags.airplaneModeEnabled = true;
          this.notifyChange();
          break;
        case 'disabled':
          this.flags.airplaneModeEnabled = false;
          this.notifyChange();
          break;
        default:
          break;
      }
    },
    customizationUpdated: () => {
      // Remove all of the customization items,
      // then re-generate all the customization items.
      Promise.resolve()
        .then(() => {
          this.apps
            .filter((item) => Customization.isCustomizedItem(item))
            .forEach((item) => this.removeItemByManifestURL(item.manifestUrl));
          return Promise.resolve();
        })
        .then(() => {
          // Generate folder items
          this.customization.getCustomFolders()
            .forEach((folder) => {
              folder.basisname = `customization-${folder.name.toLowerCase()}`;
              folder.showname = folder.name.toLowerCase();
              folder.origin = 'homescreen.carrier.folder';
              customizaedFolder = folder;
              let index = defaultFolderApps.findIndex((item) => item.source === 'customization');
              if (index !== -1) {
                defaultFolderApps[index] = folder;
              } else {
                defaultFolderApps.unshift(folder);
              }

              if (this.isInitEnd) {
                this.addItem(ItemType.Folder, { folder });
              }
            });
        });
    },
    enabledStateChange: () => {
      this.isInitEnd && this.generateAllItems();
    }
  };

  /**
   * Notify the presentation layer to
   * update to the latest state.
   */
  notifyChange = () => this.emit('change');
  notifyGetAllEnd = (apps) => this.emit('getAllEnd', apps);
  updateFolderList = (name) => this.emit('updateFolderList', name);
  /**
   * Push the given item into the store,
   * and will de-duplicate with the existed items.
   */
  pushToItemList(item) {
    const matchedIndex =
      ItemUtils.findItemIndexByManifestURL(this.apps, item.manifestUrl);
    if (matchedIndex >= 0) {
      this.apps[matchedIndex] = item;
    } else {
      this.apps.push(item);
    }
  }

  toUppercase(name) {
    if (!name) {
      return '';
    }
    return name.replace(name[0], name[0].toUpperCase());
  }

  getCategories(categories) {
    if (typeof categories === 'string') {
      return [categories];
    }
    return categories;
  }

  getFolder(name) {
    return defaultFolderApps.find((folder) => folder.basisname === name);
  }

  setLocalFolder() {
    const localFolder = defaultFolderApps.filter((item) => item.source !== 'customization');
    utils.setLocalStorage('localFolderOrder', JSON.stringify(localFolder));
  }

  updateFolderApp(app) {
    const manifest = app.manifestUrl;
    let categories = this.getCategories(app.manifest.categories);
    let index = 0;

    let folderName = this.toUppercase(
      categories.find((item) => folderNames.includes(this.toUppercase(item)))
    );
    if (!folderName || folderName.toLowerCase() === customizaedFolder.basisname) {
      return;
    }

    const appConfig = {
      name: app.manifest.name,
      manifestUrl: app.manifestUrl
    };
    let folderItem = defaultFolderApps.find((folder) => {
      index = folder.items
        .findIndex((item) => item.manifestUrl && item.manifestUrl === manifest);
      return index !== -1;
    });
    if (folderItem.name === folderName) {
      return;
    }

    folderItem.items.splice(index, 1);

    let newFolderItem = defaultFolderApps.find((folder) => folder.name === folderName);
    newFolderItem.items.push(appConfig);
    defaultFolderApps.forEach((item) => {
      if (item.source === 'customization') {
        return;
      }
      this.updateFolder(item.basisname);
    });
  }

  updateFolderOrder(options) {
    defaultFolderApps.forEach((item) => {
      if (item.basisname === options.name) {
        item.items = options.items;
      }
    });

    this.setLocalFolder();
  }

  updateFolder(name) {
    this.updateFolderList(name);

    this.setLocalFolder();
  }

  upgradeToForder() {
    // To upgrade from R2 to R3, you need to put the app
    // that corresponds to the original store download to
    // the corresponding folder.
    this.apps.forEach((item) => {
      let categories = item.manifest && item.manifest.categories;
      let isDefaultApp = this.isDefaultApp(item);
      if (!categories || isDefaultApp) {
        return;
      }
      let folderName = categories
        .find((name) => folderNames
          .includes(this.toUppercase(name)));
      let folder = defaultFolderApps
        .find((app) => app.name === this.toUppercase(folderName));
      if (!folder) { return; }

      let isFolderApp = folder.items
        .find((app) => (app.manifestUrl && app.manifestUrl === item.manifestUrl) ||
          (app.origin && app.origin === item.manifest.origin));
      if (!isFolderApp) {
        folder.items.push({
          name: item.manifest.name,
          manifestUrl: item.manifestUrl
        });

        this.setLocalFolder();
      }
    });
  }

  /**
   * Query an app with given prop and its value
   */
  queryApp(prop, value) {
    return this.apps.find((app) => value === utils.getDeepProp(app, prop));
  }

  initVirtualAPP() {
    let virtual = defaultVirtualAPP;
    for (let i = 0; i < virtual.length; i++) {
      if (typeof virtual[i].basisname === 'string') {
        virtual[i].name = utils.toL10n(virtual[i].basisname);
      }
      this.addItem(ItemType.Virtual, { virtual: virtual[i] });
    }
  }

  getAppManifest(app) {
    return new Promise((res) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', app.manifestUrl);
      xhr.send();
      xhr.onload = () => {
        try {
          const { origin } = new URL(app.manifestUrl);
          app.origin = origin;
          app.manifest = JSON.parse(xhr.response);
          if (app.manifest.b2g_features) {
            let member = '';
            for (member in app.manifest.b2g_features) {
              app.manifest[member] = app.manifest.b2g_features[member];
            }
          }
          app.manifestUrl = app.manifestUrl;
          const appListItem = this.addItem(ItemType.App, { app });
          res({ app, appListItem });
        } catch (e) {
          res();
        }
      };
      xhr.onerror = () => {
        res();
      };
    });
  }

  /**
   * Generate all of the items for the store.
   */
  generateAllItems() {
    return Promise.resolve()
      .then(() => this.generateAllAppItems())
      .then(() => this.generateAllBookmarkItems())
      .then(() => this.generateAllFolderItems())
      .then(() => {
        this.initVirtualAPP();
        if (!this.isInitEnd) {
          AppNotices.initNoticesData();
        }
        this.isInitEnd = true;
        this.notifyChange();
      });
  }

  /**
   * Generate all of the app items that come from the apps API.
   */
  generateAllAppItems() {
    return new Promise((resolve, reject) => {
      AppsManager.getAll().then((apps) => {
        const promises = [];
        const filterExt = /^https:\/\/api/;
        apps.forEach((app) => {
          if (!app.manifestUrl.search(filterExt)) return;

          const promise = this.getAppManifest(app);
          promises.push(promise);
          // TODO Followup for retrieving homescreen & comms app
        });
        Promise.all(promises).then(() => {
          // When there is no GVA app on the phone, need to hide it in the tutorial.
          this.hideGVAApp();
          this.notifyGetAllEnd(apps);
          resolve();
        }, () => {
          reject();
        });
      });
    });
  }

  /**
   * Generate all of the bookmark items that come from the BookmarkDB
   */
  generateAllBookmarkItems() {
    return new Promise((resolve) => {
      BookmarkDB.getAll()
        .then((bookmarks) => {
          bookmarks.forEach((bookmark) =>
            this.addItem(ItemType.Bookmark, { bookmark }));
          resolve();
        })
        .catch(() => resolve());
    });
  }

  /**
   * Generate all of the folder items that come from various data sources.
   */
  generateAllFolderItems() {
    return new Promise((res) => {
      let isFirstOpenLauncher = !localStorage.getItem('tutorial-has-viewed');
      let isUsedFolder = !!localStorage.getItem('hasFolder');
      if (isFirstOpenLauncher || isUsedFolder || defaultFlags.forcedOpenFolder) {
        this.initFolderConfig().then(() => {
          if (!isUsedFolder) {
            utils.setLocalStorage('hasFolder', 'v1.0');
            // If you enable the forced open folder switch,
            // need to put the corresponding label app in the folder.
            if (!isFirstOpenLauncher && defaultFlags.forcedOpenFolder) {
              this.upgradeToForder();
            }
          }

          let folders = this.apps
            .filter((item) => item.source === 'localfolder');
          // Switch language to update folder
          if (folders.length) {
            folders.forEach((item) => {
              let index = this.apps.indexOf(item);
              this.apps.splice(index, 1);
            });
          }

          defaultFolderApps.forEach((folder) => {
            const newName = utils.toL10n(folder.showname.toLowerCase());
            if (folder.source !== 'customization') {
              folder.name = newName;
            }
            this.addItem(ItemType.Folder, { folder });
          });
          res();
        });
      }
    });
  }

  /**
   * Add a new item into the store.
   */
  addItem(itemType, options) {
    const itemList = Item.create(itemType, options);
    itemList.forEach((createdItem) => {
      this.pushToItemList(createdItem);
      mountItemIcon(createdItem, () => {
        this.notifyChange();
      });
    });
    this.notifyChange();
    return itemList;
  }

  isDefaultApp(app) {
    for (let i = 0; i < defaultAppsOrder.length; i++) {
      if (app.manifest.origin && defaultAppsOrder[i].origin ===
        app.manifest.origin) {
        return true;
      }
      if (app.manifestUrl && defaultAppsOrder[i].manifestUrl ===
        app.manifestUrl) {
        return true;
      }
    }
    return false;
  }

  checkSameApp(item, app) {
    return (item.manifestUrl && item.manifestUrl === app.manifestUrl) ||
      (item.origin && item.origin === app.manifest.origin);
  }

  installAppIntoFolder(app, appName) {
    let isDefaultApp = this.isDefaultApp(app);
    let categories = this.getCategories(app.manifest.categories);
    let appConfig = {
      name: app.manifest.name,
      manifestUrl: app.manifestUrl
    };

    if (!isDefaultApp) {
      categories.find((name) => {
        name = name.toLowerCase(name);
        if (name === customizaedFolder.showname) {
          Service.request(`addFolderIndicator${customizaedFolder.showname}`, app);
          this.updateFolderList(customizaedFolder.basisname);
          return true;
        }
        let currentFolder = this.getFolder(name);
        if (currentFolder) {
          Service.request(`addFolderIndicator${name}`, app);
          currentFolder.items.push(appConfig);
          this.updateFolder(name);
          // Pop up toast through service worker.
          const l10nMessage = {
            messageL10nId: 'toast-app-downloaded-to-folder',
            messageL10nArgs: {
              appName,
              folderName: utils.toL10n(name)
            }
          };
          navigator.serviceWorker.controller &&
            navigator.serviceWorker.controller.postMessage({
              isWebActivity: true,
              name: 'show-toast',
              detail: {
                text: window.api.l10n.get(
                  l10nMessage.messageL10nId,
                  l10nMessage.messageL10nArgs
                )
              }
            });
          return true;
        }
        return false;
      });
    }
  }

  uninstallAppIntoFolder(app) {
    let isDefaultApp = this.isDefaultApp(app);
    let categories = this.getCategories(app.manifest.categories);

    if (!isDefaultApp) {
      categories.find((name) => {
        name = name.toLowerCase(name);
        if (name === customizaedFolder.basisname) {
          Service.request(`deleteFolderIndicator${name}`, app);
          this.updateFolderList(name);
          return true;
        }
        let currentFolder = this.getFolder(name);
        if (currentFolder) {
          Service.request(`deleteFolderIndicator${name}`, app);
          let findIndex = currentFolder.items
            .findIndex((item) => this.checkSameApp(item, app));
          if (findIndex !== -1) {
            currentFolder.items.splice(findIndex, 1);
            this.updateFolder(name);
          }
          return true;
        }
        return false;
      });
    }
  }

  /**
   * Remove an item from the store by its manifestUrl.
   */
  removeItemByManifestURL(manifestUrl) {
    const matchedIndex = ItemUtils
      .findItemIndexByManifestURL(this.apps, manifestUrl);

    if (matchedIndex >= 0) {
      const removedItem = this.apps.splice(matchedIndex, 1).shift();
      this.notifyChange();
      return removedItem;
    } else {
      return null;
    }
  }
}

export default AppStore;
