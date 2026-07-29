/* eslint-disable max-depth */
/* global DeviceStorageHelper enumerateAll */

define(['require','modules/apps_cache','modules/app_storage'],function(require) { // eslint-disable-line
  const AppsCache = require('modules/apps_cache');
  const AppStorage = require('modules/app_storage');

  const IDB_NAME_MAP = {
    contact: 'contacts'
  };

  // This Write-Ahead Log should ignore when  calculating app size. https://www.sqlite.org/wal.html
  const IGNORE_SUFFIX = ['-wal', '-shm'];

  const APP_INTERVAL_TIME = 2000;
  const APP_DEFAULT_SIZE = 1024;
  const PROTOCOL = window.AppOrigin.getProtocol();
  const ROOT_DOMAIN = window.AppOrigin.getRootDomain();

  const APP_COLOR = [
    '#ff8329',
    '#f53d16',
    '#644237',
    '#8c8c8c',
    '#4f6a79',
    '#e82928',
    '#da0051',
    '#af0779',
    '#840fa2',
    '#5026aa',
    '#2f3da7',
    '#2383f2',
    '#1e98f2',
    '#25afca',
    '#1e8675',
    '#47a13a',
    '#7eb832',
    '#c3d51c',
    '#fde61b',
    '#fab200'
  ];

  const StackedBar = function StackedBar(div) {
    const container = div;
    let items = [];
    let totalSize = 0;
    const { clientWidth } = container;

    return {
      add: function add(item) {
        totalSize += item.value;
        items.push(item);
      },

      refreshUI: function refreshUI() {
        container.parentNode.setAttribute('aria-disabled', false);
        container.classList.remove('hidden');
        let totalWidths = 100;
        items.forEach(item => {
          let width = 0;
          if (
            item.value > 0 &&
            (item.value * 100) / totalSize < (1 * 100) / clientWidth
          ) {
            width = (1 * 100) / clientWidth;
          } else {
            width = (item.value * 100) / totalSize;
          }
          if (width < totalWidths) {
            totalWidths -= width;
          } else {
            width = totalWidths;
            totalWidths = 0;
          }
          item.width = width;
        });

        items.forEach(item => {
          let ele = container.querySelector(`#color-app-${item.index}`);
          if (!ele) {
            ele = document.createElement('span');
            if (item.index === 'other' || item.index === 'free') {
              ele.classList.add(`color-app-${item.index}`);
            } else {
              ele.style.backgroundColor =
                APP_COLOR[item.index % APP_COLOR.length];
            }
            ele.classList.add('stackedbar-item');
            container.appendChild(ele);
          }
          ele.style.width = `${item.width}%`;
        });
      },

      reset: function reset() {
        items = [];
        totalSize = 0;
        container.parentNode.setAttribute('aria-disabled', true);
        container.parentNode.classList.add('none-select');
        container.classList.add('hidden');
      }
    };
  };

  const AppStorageList = function AppStorageList() {
    this.container = null;
    this.appList = null;
    this.fileList = null;
    this.getAppDone = null;
    this.getFileDone = null;
    this.getFileTimes = null;
    this.getFirstSize = null;
    this.appsUsed = null;
    this.stkConfig = {
      isSupport: true,
      stkTitle: ''
    };
  };

  AppStorageList.prototype = {
    init: function init(elements) {
      this.container = elements;
      this.appList = [];
      this.fileList = [];
      this.getAppDone = false;
      this.getFileDone = false;
      this.getFileTimes = 0;
      this.appListUsed = 0;
      this.loadApps();
      this.getFileList();
    },

    loadApps: function loadApps() {
      this.getAppDone = false;
      AppsCache.apps().then(apps => {
        for (let i = 0; i < apps.length; i++) {
          const app = apps[i];
          const { manifest } = app;
          if (
            app.origin === window.AppOrigin.getOrigin('settings') ||
            manifest.role === 'system' ||
            manifest.role === 'input' ||
            manifest.role === 'theme' ||
            manifest.role === 'homescreen' ||
            manifest.role === 'invisible' ||
            app.role === 'invisible'
          ) {
            continue;
          }
          this.size = 0;
          this.appList.push(app);
        }
        this.getAppDone = true;
        DebugHelper.debug('getAppDone done');
        this.renderList();
      });
    },

    renderList: function renderList() {
      if (!(this.getFileDone && this.getAppDone)) {
        return;
      }

      this.appList.forEach(app => {
        this.fileList.forEach(file => {
          if (app.origin.indexOf(file.name) >= 0) {
            app.size = file.size;
            this.appsUsed = this.appsUsed + file.size;
          }
        });
        app.size += APP_DEFAULT_SIZE;
        this.appsUsed = this.appsUsed + APP_DEFAULT_SIZE;
      });

      this.appList.sort(function alphabeticalSort(app, otherApp) {
        return (app.size ? app.size : 0) < (otherApp.size ? otherApp.size : 0);
      });

      this.renderAppList();
    },

    renderAppList: function renderAppList() {
      this.container.applicationList.classList.remove('hidden');
      this.container.applicationList.innerHTML = '';
      const rootElement = document.createElement('ul');
      this.container.applicationList.appendChild(rootElement);

      const stackedbarDiv = document.createElement('div');
      stackedbarDiv.classList.add('space-stackedbar');
      stackedbarDiv.id = 'sdcard-space-stackedbar';
      const li = document.createElement('li');
      li.id = 'stacked-bar';
      li.classList.add('non-focus');
      li.appendChild(stackedbarDiv);
      rootElement.appendChild(li);
      this.stackedbar = StackedBar(stackedbarDiv);
      this.stackedbar.reset();
      const listFragment = document.createDocumentFragment();

      this.appList.forEach((app, index) => {
        const { manifest } = app;
        let liItem = null;
        if (app.origin === window.AppOrigin.getOrigin('stk')) {
          if (!this.stkConfig.isSupport) {
            return;
          }
          const title =
            this.stkConfig.stkTitle !== ''
              ? this.stkConfig.stkTitle
              : manifest.short_name || manifest.name;

          liItem = this.genAppItemTemplate({
            name: title,
            index,
            size: app.size
          });
        } else {
          liItem = this.genAppItemTemplate({
            name: manifest.short_name || manifest.name,
            index,
            size: app.size
          });
        }
        index++;
        listFragment.appendChild(liItem);
      });
      listFragment.appendChild(this.renderOther());
      listFragment.appendChild(this.renderFree());
      listFragment.appendChild(this.renderTotal());
      rootElement.appendChild(listFragment);
      this.stackedbar.refreshUI();

      const listElements = document.querySelectorAll('#application_storage li');
      ListFocusHelper.addEventListener(listElements);
      this.container.applicationProgress.classList.add('hidden');
      window.dispatchEvent(new CustomEvent('refresh'));
    },

    renderOther() {
      const li = document.createElement('li');
      li.classList.add('none-select');
      li.id = 'color-app-other';
      li.classList.add('color-app-other');
      li.classList.add('none-select');
      const label = document.createElement('span');
      label.classList.add('stackedbar-color-label');
      const anchor = document.createElement('a');
      const size = document.createElement('span');
      size.classList.add('size');
      const text = document.createElement('span');
      text.setAttribute('data-l10n-id', 'other-space');
      anchor.appendChild(text);
      anchor.appendChild(size);
      const otherSize = AppStorage.storage.usedSize - this.appsUsed;
      DeviceStorageHelper.showFormatedSize(size, 'storageSize', otherSize);
      this.stackedbar.add({ index: 'other', value: otherSize });
      li.appendChild(label);
      li.appendChild(anchor);
      return li;
    },

    renderFree() {
      const li = document.createElement('li');
      li.classList.add('none-select');
      li.id = 'color-app-free';
      li.classList.add('color-app-free');
      li.classList.add('none-select');
      const label = document.createElement('span');
      label.classList.add('stackedbar-color-label');
      const anchor = document.createElement('a');
      const size = document.createElement('span');
      size.classList.add('size');
      const text = document.createElement('span');
      text.setAttribute('data-l10n-id', 'free-space');
      anchor.appendChild(text);
      anchor.appendChild(size);
      const { freeSize } = AppStorage.storage;
      DeviceStorageHelper.showFormatedSize(size, 'storageSize', freeSize);
      this.stackedbar.add({ index: 'free', value: freeSize });
      li.appendChild(label);
      li.appendChild(anchor);
      return li;
    },

    renderTotal() {
      const li = document.createElement('li');
      li.classList.add('none-select');
      const anchor = document.createElement('a');
      const size = document.createElement('span');
      size.classList.add('size');
      const text = document.createElement('span');
      text.setAttribute('data-l10n-id', 'total-space');
      anchor.appendChild(text);
      anchor.appendChild(size);
      DeviceStorageHelper.showFormatedSize(
        size,
        'storageSize',
        AppStorage.storage.totalSize
      );
      li.appendChild(anchor);
      return li;
    },

    genAppItemTemplate: function genAppItemTemplate(itemData) {
      let li = document.createElement('li');
      const label = document.createElement('span');
      label.classList.add('stackedbar-color-label');
      label.style.backgroundColor =
        APP_COLOR[itemData.index % APP_COLOR.length];
      const anchor = document.createElement('a');
      const size = document.createElement('span');
      size.classList.add('size');
      size.classList.add('hidden');
      const text = document.createElement('span');
      text.textContent = itemData.name;
      anchor.appendChild(text);
      anchor.appendChild(size);
      li = document.createElement('li');
      li.id = `color-app-${itemData.index}`;
      li.index = itemData.index;

      const stackedbarSize = itemData.size ? itemData.size : 0;
      DeviceStorageHelper.showFormatedSize(size, 'storageSize', stackedbarSize);
      size.classList.remove('hidden');
      this.stackedbar.add({ index: itemData.index, value: stackedbarSize });
      li.appendChild(label);
      li.appendChild(anchor);
      return li;
    },

    renderAppSize: function renderAppSize(app, oldSize) {
      const releasedSize = oldSize - app.size;
      DeviceStorageHelper.showFormatedSizeOfReleased(releasedSize);
      this.appsUsed = this.appsUsed - oldSize + app.size;
      this.renderAppList();
    },

    isNormalFile: function isNormalFile(fileName) {
      if (
        fileName.endsWith(
          IGNORE_SUFFIX[0] || fileName.endsWith(IGNORE_SUFFIX[1])
        )
      ) {
        return false;
      }
      return true;
    },

    getAppSize(app) {
      this.getFileDone = false;
      const oldSize = app.size;
      const storage = ApiManager.getDeviceStorage('apps');
      let appSize = 0;
      enumerateAll([storage]).then(files => {
        DebugHelper.debug(`getFileList start`);
        files.forEach(file => {
          if (file.name && this.isNormalFile(file.name)) {
            DebugHelper.debug(
              `file size->${file.size}<-file name-->${file.name}`
            );
            if (file.name.indexOf('.default/storage') >= 0) {
              file.appName = file.name.substring(
                file.name.indexOf(`${PROTOCOL}+++`) + PROTOCOL.length + 3,
                file.name.indexOf(`.${ROOT_DOMAIN}`)
              );
              this.updateFileList(file);
            } else if (file.name.indexOf('local/service/api-daemon') >= 0) {
              // eslint-disable-next-line
              for (let key in IDB_NAME_MAP) {
                const idbName = IDB_NAME_MAP[key];
                if (file.name.indexOf(idbName) > 0) {
                  file.appName = key;
                  this.updateFileList(file);
                  break;
                }
              }
            }
            if (app.origin.indexOf(file.appName) >= 0) {
              appSize += file.size;
            }
          }
        });
        DebugHelper.debug(`getFileList end`);
        if (this.getFirstSize === appSize) {
          this.getFileDone = true;
          app.size = appSize;
          this.renderAppSize(app, oldSize);
        } else {
          setTimeout(() => {
            this.getFirstSize = appSize;
            this.getAppSize(app);
          }, APP_INTERVAL_TIME);
        }
      });
    },

    getFileList: function getFileList() {
      this.getFileDone = false;
      const storage = ApiManager.getDeviceStorage('apps');
      enumerateAll([storage]).then(files => {
        DebugHelper.debug(`getFileList start`);
        files.forEach(file => {
          DebugHelper.debug(
            `file size->${file.size}<-file name-->${file.name}`
          );
          if (file.name && this.isNormalFile(file.name)) {
            if (file.name.indexOf('.default/storage') >= 0) {
              file.appName = file.name.substring(
                file.name.indexOf(`${PROTOCOL}+++`) + PROTOCOL.length + 3,
                file.name.indexOf(`.${ROOT_DOMAIN}`)
              );
              this.updateFileList(file);
            } else if (file.name.indexOf('local/service/api-daemon') >= 0) {
              // eslint-disable-next-line
              for (let key in IDB_NAME_MAP) {
                const idbName = IDB_NAME_MAP[key];
                if (file.name.indexOf(idbName) > 0) {
                  file.appName = key;
                  this.updateFileList(file);
                  break;
                }
              }
            }
          }
        });
        this.getFileDone = true;
        DebugHelper.debug(`getFileList end`);
        this.renderList();
      });
    },

    updateAppSize: function updateAppSize(app) {
      this.getFileTimes = 0;
      this.getFirstSize = 0;
      this.getAppSize(app);
    },

    updateFileList: function updateFileList(file) {
      const fileArr = {};
      fileArr.name = file.appName;
      fileArr.size = file.size;
      if (this.fileList.length > 0) {
        for (let i = 0; i < this.fileList.length; i++) {
          if (this.fileList[i].name === file.appName) {
            this.fileList[i].size = this.fileList[i].size + file.size;
            return;
          }
        }
        this.fileList.push(fileArr);
      } else {
        this.fileList.push(fileArr);
      }
    }
  };

  return function appStorageList() {
    return new AppStorageList();
  };
});
/* eslint-enable max-depth */
