/* global AppsManager, ManifestHelper */

define(function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createAppPermissionsDetailPanel() {
    const DEBUG_VERBOSE_PERMISSIONS = 'debug.verbose_app_permissions';
    let elements = null;
    let currentApp = null;
    let composedPermissions = null;
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

    function checkAndBack(evt) {
      const { app } = evt.detail;
      if (app.manifestURL === currentApp.manifestUrl) {
        NavigationMap.navigateBack();
      }
    }

    function getPermissions(perm, origin) {
      return new Promise(resolve => {
        ApiManager.permissions.get(perm, origin).then(value => {
          resolve(value);
        });
      });
    }

    function killApp() {
      AppsManager.getApp();
      /*
       *IAC can't support
       * navigator.mozApps.getSelf().onsuccess = (evt) => {
       *   var app = evt.target.result;
       *   var info = {};
       *   info.killAppOrigin = this._app.origin;
       *   app.connect('application-data-comms').then(function onAccepted(ports) {
       *     ports.forEach((port) => {
       *       port.postMessage(info);
       *       port.onmessage = function(evt) {
       *         console.log('evt '+ JSON.stringify(evt.data));
       *       }
       *     });
       *   });
       * }
       */
    }

    function changePermission(perm, value) {
      if (composedPermTable.indexOf(perm) !== -1) {
        composedPermissions.forEach(composedPerm => {
          if (composedPerm.indexOf(perm) !== -1) {
            try {
              ApiManager.permissions.set(
                composedPerm,
                value,
                currentApp.origin
              );
            } catch (e) {
              DebugHelper.debug(`Failed to set the ${perm}permission.`);
            }
          }
        });
      } else {
        try {
          ApiManager.permissions.set(perm, value, currentApp.origin);
        } catch (e) {
          DebugHelper.debug(`Failed to set the ${perm}permission.`);
        }
      }
      killApp();
    }

    function selectValueChanged(evt) {
      const select = evt.target;
      select.setAttribute('value', select.value);
      changePermission(select.dataset.perm, select.value);
      ToastHelper.showToast('permission-changed');
    }

    function unInstallApp(manifestUrl, appName) {
      AppsManager.uninstall(manifestUrl).then(
        () => {
          DebugHelper.debug('uninstall success');
          new Notification(
            l10n.get('uninstall-notification', { appName })
          ).close();
          NavigationMap.navigateBack();
        },
        err => {
          DebugHelper.debug(`uninstall :${JSON.stringify(err)}`);
        }
      );
    }

    function showConfirmDialog(app) {
      const manifest = new ManifestHelper(
        app.manifest ? app.manifest : app.updateManifest
      );
      const dialogConfig = {
        title: { id: 'uninstall', args: {} },
        body: { id: 'uninstall-app-body', args: { appName: manifest.name } },
        desc: { id: 'uninstall-app-body-2', args: {} },
        cancel: {
          l10nId: 'cancel',
          priority: 1,
          callback() {
            DialogHelper.destroy();
          }
        },
        confirm: {
          l10nId: 'uninstall',
          priority: 3,
          callback() {
            DialogHelper.destroy();
            unInstallApp(app.manifestUrl, manifest.name);
          }
        }
      };
      DialogHelper.show(dialogConfig);
    }

    function updateSoftKey(app) {
      let params = null;
      if (!app.removable) {
        params = SoftParams.defaultSelect;
      } else {
        params = {
          menuClassName: 'menu-button',
          header: { l10nId: 'message' },
          items: [
            {
              name: 'Select',
              l10nId: 'select',
              priority: 2
            },
            {
              name: 'Uninstall',
              l10nId: 'uninstall',
              priority: 3,
              method() {
                showConfirmDialog(app);
              }
            }
          ]
        };
      }
      SettingsSoftkey.init(params);
      SettingsSoftkey.show();
    }

    async function isExplicitPerm(app, perm, value) {
      const isExplicit = await ApiManager.permissions.isExplicit(
        perm,
        app.origin
      );
      return isExplicit && value !== 'unknown';
    }

    async function isValidVerbosePerm(app, perm, value) {
      if (app.manifest.type !== 'certified') {
        return value !== 'unknown';
      }
      // eslint-disable-next-line
      return await isExplicitPerm(app, perm, value);
    }

    function insertPermissionSelect(perm, value) {
      const item = document.createElement('li');
      const content = document.createElement('span');
      const contentL10nId = `perm-${perm.replace(':', '-')}`;
      content.setAttribute('data-l10n-id', contentL10nId);
      content.classList.add(contentL10nId);

      const fakeSelect = document.createElement('span');
      fakeSelect.classList.add('button', 'icon', 'icon-dialog');

      const select = document.createElement('select');
      select.dataset.perm = perm;
      select.setAttribute('data-track-class', contentL10nId);

      const askOpt = document.createElement('option');
      askOpt.value = 'prompt';
      askOpt.setAttribute('data-l10n-id', 'ask');
      select.add(askOpt);

      const denyOpt = document.createElement('option');
      denyOpt.value = 'deny';
      denyOpt.setAttribute('data-l10n-id', 'deny');
      select.add(denyOpt);

      const allowOpt = document.createElement('option');
      allowOpt.value = 'allow';
      allowOpt.setAttribute('data-l10n-id', 'allow');
      select.add(allowOpt);

      const opt = select.querySelector(`[value="${value}"]`);
      opt.setAttribute('selected', true);

      select.onchange = selectValueChanged;

      item.setAttribute('role', 'menuitem');
      item.onclick = () => {
        select.focus();
      };

      fakeSelect.appendChild(select);
      item.appendChild(content);
      item.appendChild(fakeSelect);
      elements.list.appendChild(item);
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    // eslint-disable-next-line
    async function showAppDetails(app, verbose) {
      const isValidPerm = verbose
        ? await isValidVerbosePerm
        : await isExplicitPerm;
      const manifest = new ManifestHelper(
        app.manifest ? app.manifest : app.updateManifest
      );
      elements.detailTitle.textContent = manifest.short_name || manifest.name;
      elements.list.innerHTML = '';

      if (manifest.permissions) {
        composedPermissions = [];
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
            await composedPermissions.some(composedPerm => {
              getPermissions(composedPerm, app.origin).then(async value => {
                if (await isValidPerm(app, composedPerm, value)) {
                  insertPermissionSelect(perm, value);
                  return true;
                }
                return false;
              });
            });
          } else {
            // eslint-disable-next-line
            await getPermissions(perm, app.origin).then(async value => {
              if (
                perm !== 'desktop-notification' &&
                (await isValidPerm(app, perm, value))
              ) {
                insertPermissionSelect(perm, value);
              }
            });
          }
        }
      }
      elements.header.classList.toggle(
        'hidden',
        !elements.list.children.length
      );
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    return SettingsPanel({
      onInit(panel, options) {
        currentApp = options.app || currentApp;
        elements = {
          list: panel.querySelector('.permissionsListHeader + ul'),
          header: panel.querySelector('.permissionsListHeader'),
          detailTitle: panel.querySelector('.detail-title')
        };
      },

      onBeforeShow(panel, options) {
        currentApp = options.app || currentApp;
        SettingsDBCache.getSetting(DEBUG_VERBOSE_PERMISSIONS).then(value => {
          showAppDetails(currentApp, value);
          window.dispatchEvent(new CustomEvent('refresh'));
          updateSoftKey(currentApp);
        });
        window.addEventListener('APPs-appUninstalled', checkAndBack);
      },

      onBeforeHide() {
        window.removeEventListener('APPs-appUninstalled', checkAndBack);
      }
    });
  };
});
