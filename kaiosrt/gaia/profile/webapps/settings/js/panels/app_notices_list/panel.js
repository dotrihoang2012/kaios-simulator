/* global ManifestHelper */


define('panels/app_notices_list/panel',['require','modules/settings_panel','modules/apps_cache'],function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  const AppsCache = require('modules/apps_cache');

  return function createAppNoticesListPanel() {
    let elements = {};
    let appsList = [];
    let oldAppsList = [];

    function onAppChoose(evt) {
      if (evt.target.dataset && evt.target.dataset.appIndex) {
        Settings.setCurrentPanel('app_notices_details', {
          app: appsList[evt.target.dataset.appIndex]
        });
      }
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
    function genAppItemTemplate(itemData) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      const span = document.createElement('span');
      span.textContent = itemData.name;
      link.dataset.appIndex = itemData.index;
      link.href = '#';
      link.classList.add('menu-item');
      link.appendChild(span);
      item.appendChild(link);
      return item;
    }

    function renderList() {
      DeviceFeature.ready(() => {
        elements.listContainer.innerHTML = '';
        const listFragment = document.createDocumentFragment();
        const isLowMemoryDevice = DeviceFeature.getValue('lowMemory');
        appsList.forEach(function appIterator(app, index) {
          const manifest = new ManifestHelper(
            app.manifest ? app.manifest : app.updateManifest
          );
          const name = manifest.short_name || manifest.name;
          const li = genAppItemTemplate({
            name,
            index
          });

          if (
            (name === 'E-Mail' || name === 'Calendar') &&
            isLowMemoryDevice === 'true'
          ) {
            return;
          }
          listFragment.appendChild(li);
        });
        elements.listContainer.appendChild(listFragment);
      });
    }

    function compareAppsList() {
      return (
        appsList.length === oldAppsList.length &&
        oldAppsList.every(
          (app, i) => app.manifestURL === appsList[i].manifestURL
        )
      );
    }

    function getPermissions(perm, app) {
      return new Promise(resolve => {
        ApiManager.permissions.get(perm, app.origin).then(value => {
          if (value !== 'unknown') {
            appsList.push(app);
          }
          resolve(value);
        });
      });
    }

    function updateAppList() {
      return AppsCache.apps().then(apps => {
        DebugHelper.debug(`notices apps.length:${apps.length}`);
        const promiseList = [];
        appsList = [];
        apps.forEach(app => {
          const manifest = app.manifest ? app.manifest : app.updateManifest;

          if (
            manifest.name === 'System' ||
            manifest.role === 'invisible' ||
            app.status === Constants.AppsStatus.DISABLED
          ) {
            return;
          }
          promiseList.push(getPermissions('desktop-notification', app));
        });

        Promise.all(promiseList).then(() => {
          sortApps();
          if (compareAppsList()) {
            return;
          }
          oldAppsList = [];
          for (let i = 0; i < appsList.length; i++) {
            oldAppsList.push(appsList[i]);
          }
          renderList();
          window.dispatchEvent(new CustomEvent('refresh'));
        });
      });
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          listContainer: panel.querySelector('.app-list')
        };
      },

      onBeforeShow() {
        updateAppList();
        elements.listContainer.addEventListener('click', onAppChoose);
        window.addEventListener('APPs-appInstalled', updateAppList);
        window.addEventListener('APPs-appUninstalled', updateAppList);

        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
      },

      onBeforeHide() {
        window.removeEventListener('APPs-appInstalled', updateAppList);
        window.removeEventListener('APPs-appUninstalled', updateAppList);
        SettingsSoftkey.hide();
      }
    });
  };
});

