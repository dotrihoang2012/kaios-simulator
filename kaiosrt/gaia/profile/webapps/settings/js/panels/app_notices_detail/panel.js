/* global ManifestHelper */

define(function(require) { // eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createNoticesDetailPanel() {
    let elements = {};
    let currentApp = null;

    async function isExplicitPerm(app, perm, value) {
      const isExplicit = await ApiManager.permissions.isExplicit(
        perm,
        app.origin
      );
      return isExplicit && value !== 'unknown';
    }

    function changeNotice(perm, value) {
      try {
        ApiManager.permissions.set(perm, value, currentApp.origin);
      } catch (e) {
        console.warn(`Failed to set the ${perm}notice.`);
      }
    }

    function insertNoticeSelect(perm, value) {
      const item = document.createElement('li');
      const content = document.createElement('span');
      const contentL10nId = 'allow-notices';
      content.setAttribute('data-l10n-id', contentL10nId);
      content.classList.add(contentL10nId);

      const fakeSelect = document.createElement('span');
      fakeSelect.classList.add('button', 'icon', 'icon-dialog');

      const select = document.createElement('select');
      select.dataset.perm = perm;
      select.setAttribute('data-track-class', contentL10nId);

      const allowOpt = document.createElement('option');
      allowOpt.value = 'allow';
      allowOpt.setAttribute('data-l10n-id', 'on');
      select.add(allowOpt);

      const denyOpt = document.createElement('option');
      denyOpt.value = 'deny';
      denyOpt.setAttribute('data-l10n-id', 'off');
      select.add(denyOpt);

      const val = value === 'ask' ? 'deny' : value;
      const opt = select.querySelector(`[value="${val}"]`);
      opt.setAttribute('selected', true);

      select.onchange = evt => {
        evt.stopPropagation();
        const { target } = evt;
        select.setAttribute('value', target.value);
        changeNotice(select.dataset.perm, target.value);
        ToastHelper.showToast('notice-changed');
      };

      item.setAttribute('role', 'menuitem');

      fakeSelect.appendChild(select);
      item.appendChild(content);
      item.appendChild(fakeSelect);
      elements.listContainer.appendChild(item);
    }

    function getPermissions(perm, app) {
      return new Promise(resolve => {
        ApiManager.permissions.get(perm, app.origin).then(value => {
          resolve(value);
        });
      });
    }

    function showAppDetails(app) {
      const manifest = new ManifestHelper(
        app.manifest ? app.manifest : app.updateManifest
      );

      elements.detailTitle.textContent = manifest.short_name || manifest.name;

      getPermissions('desktop-notification', app).then(async value => {
        if (manifest.core) {
          insertNoticeSelect('desktop-notification', value);
          elements.header.classList.toggle(
            'hidden',
            !elements.listContainer.children.length
          );
          window.dispatchEvent(new CustomEvent('refresh'));
        } else {
          if (await isExplicitPerm(app, 'desktop-notification', value)) {
            insertNoticeSelect('desktop-notification', value);
          }
          elements.header.classList.toggle(
            'hidden',
            !elements.listContainer.children.length
          );
          window.dispatchEvent(new CustomEvent('refresh'));
        }
      });
    }

    function checkAndBack(evt) {
      if (evt.detail.app.manifestURL === currentApp.manifestUrl) {
        NavigationMap.navigateBack();
      }
    }

    return SettingsPanel({
      onInit(panel, options) {
        currentApp = options.app || currentApp;
        elements = {
          listContainer: panel.querySelector('.notices-list-header + ul'),
          header: panel.querySelector('.notices-list-header'),
          detailTitle: panel.querySelector('.detail-title')
        };
      },

      onBeforeShow(panel, options) {
        currentApp = options.app || currentApp;
        elements.listContainer.innerHTML = '';
        showAppDetails(currentApp);
        SettingsSoftkey.init(SoftParams.defaultSelect);
        SettingsSoftkey.show();
        window.addEventListener('APPs-appUninstalled', checkAndBack);
      },

      onBeforeHide() {
        SettingsSoftkey.hide();
        window.removeEventListener('APPs-appUninstalled', checkAndBack);
      }
    });
  };
});
