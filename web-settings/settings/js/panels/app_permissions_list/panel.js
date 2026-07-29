/* global ManifestHelper */


define(function (require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  const AppsCache = require('modules/apps_cache');

  return function createAppPermissionsListPanel() {
    const composedPermTable = [
      'contacts',
      'device-storage:apps',
      'device-storage:pictures',
      'device-storage:videos',
      'device-storage:music',
      'device-storage:sdcard',
      'settings',
      'indexedDB-chrome-settings'
    ];
    let elements = {};
    let appsList = [];
    let oldAppsList = null;

    function isExplicitPerm(perm, app) {
      return new Promise(resolve => {
        ApiManager.permissions.isExplicit(perm, app.origin).then(value => {
          resolve(value);
        });
      });
    }

    function getPermissions(perm, origin) {
      return new Promise(resolve => {
        ApiManager.permissions.get(perm, origin).then(value => {
          resolve(value);
        });
      });
    }

    async function checkPermissions(perm, composedPermissions, app) {
      await composedPermissions.some(async function check(composedPerm) {
        if (await isExplicitPerm(composedPerm, app)) {
          // eslint-disable-next-line
          const permInfo = await getPermissions(perm, app.origin);
          return permInfo !== 'unknown';
        }
        return false;
      });
    }

    // eslint-disable-next-line
    async function getAppPermissions(app, manifest) {
      const composedPermissions = [];
      let display = null;
      // eslint-disable-next-line
      for (let perm in manifest.permissions) {
        if (composedPermTable.indexOf(perm) !== -1) {
          const mode = manifest.permissions[perm].access;

          switch (mode) {
            case 'readonly':
              composedPermissions.push(`${perm}-read`);
              break;
            case 'createonly':
              composedPermissions.push(`${perm}-create`);
              break;
            case 'readcreate':
              composedPermissions.push(`${perm}-read`);
              composedPermissions.push(`${perm}-create`);
              break;
            case 'readwrite':
              composedPermissions.push(`${perm}-read`);
              composedPermissions.push(`${perm}-create`);
              composedPermissions.push(`${perm}-write`);
              break;
            default:
              break;
          }

          // eslint-disable-next-line
          display = await checkPermissions(perm, composedPermissions, app);
        } else if (
          perm !== 'desktop-notification' &&
          (await isExplicitPerm(perm, app)) //eslint-disable-line
        ) {
          // eslint-disable-next-line
          const permInfo = await getPermissions(perm, app.origin);
          display = permInfo !== 'unknown';
        }
        if (display) {
          appsList.push(app);
          break;
        }
      }
    }

    function loadApps(apps) {
      const promiseList = [];
      apps.forEach(app => {
        const manifest = app.manifest ? app.manifest : app.updateManifest;
        if (
          manifest.role === 'system' ||
          manifest.role === 'invisible' ||
          app.status === Constants.AppsStatus.DISABLED
        ) {
          return;
        }
        if (manifest.permissions) {
          promiseList.push(getAppPermissions(app, manifest));
        }
      });

      Promise.all(promiseList).then(() => {
        sortApps();
        if (JSON.stringify(oldAppsList) === JSON.stringify(appsList)) {
          return;
        }
        oldAppsList = [];
        for (let i = 0; i < appsList.length; i++) {
          oldAppsList.push(appsList[i]);
        }
        renderList();
      });
    }

    function genAppItemTemplate(itemData) {
      const icon = document.createElement('img');
      const item = document.createElement('li');
      const link = document.createElement('a');
      const span = document.createElement('span');
      span.textContent = itemData.name;
      icon.src = itemData.iconSrc;
      link.dataset.appIndex = itemData.index;
      link.href = '#';
      link.classList.add('menu-item');
      link.appendChild(icon);
      link.appendChild(span);
      item.appendChild(link);
      return item;
    }

    function renderList() {
      elements.listContainer.innerHTML = '';
      const listFragment = document.createDocumentFragment();
      let index = 0;
      appsList.forEach(app => {
        const manifest = new ManifestHelper(
          app.manifest ? app.manifest : app.updateManifest
        );
        const li = genAppItemTemplate({
          name: manifest.short_name || manifest.name,
          index,
          iconSrc: manifest.iconUrl
        });
        index++;
        listFragment.appendChild(li);
      });
      elements.listContainer.appendChild(listFragment);
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    function sortApps() {
      appsList.sort(function alphabeticalSort(app, otherApp) {
        const manifest = new ManifestHelper(
          app.manifest ? app.manifest : app.updateManifest
        );
        const otherManifest = new ManifestHelper(
          otherApp.manifest ? otherApp.manifest : otherApp.updateManifest
        );
        return manifest.name > otherManifest.name;
      });
    }

    function onAppChoose(evt) {
      evt.stopPropagation();
      if (evt.target.dataset && evt.target.dataset.appIndex) {
        Settings.setCurrentPanel('app_permissions_details', {
          app: appsList[evt.target.dataset.appIndex]
        });
      }
    }

    function onApplicationInstall(evt) {
      evt.stopPropagation();
      const app = evt.application;
      appsList.push(app);
      sortApps();
      renderList();
    }

    function onApplicationUninstall(evt) {
      let app = null;
      let appIndex = null;
      appsList.some(function findApp(anApp, index) {
        if (anApp.origin === evt.application.origin) {
          app = anApp;
          appIndex = index;
          return true;
        }
        return false;
      });

      if (!app) {
        return;
      }
      Settings.setCurrentPanel('app_permissions');
      appsList.splice(appIndex, 1);
      renderList();
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          listContainer: panel.querySelector('.app-list')
        };
      },

      onBeforeShow() {
        appsList = [];
        AppsCache.apps().then(apps => {
          loadApps(apps);
        });

        elements.listContainer.addEventListener('click', onAppChoose);
        window.addEventListener('APPs-appInstalled', onApplicationInstall);
        window.addEventListener('APPs-appUninstalled', onApplicationUninstall);
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        elements.listContainer.removeEventListener('click', onAppChoose);
        window.removeEventListener('APPs-appInstalled', onApplicationInstall);
        window.removeEventListener(
          'APPs-appUninstalled',
          onApplicationUninstall
        );
      }
    });
  };
});
