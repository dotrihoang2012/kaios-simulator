/* global AccountHelper ConnectionHelper */

define(['require','modules/settings_panel'],function(require) { // eslint-disable-line
  const settingsPanel = require('modules/settings_panel');

  return function createKaiosAccountPanel() {
    let elements = null;
    let originHref = null;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const themeColor = themeMeta.content;

    function handleSelect() {
      const focusElement = elements.currentPanel.querySelector('.focus');
      switch (focusElement.id) {
        case 'create_account':
          Settings.setCurrentPanel('about_kaios_account');
          break;
        case 'login-phone':
          AccountHelper.showLoginPage('phone').then(value => {
            if (value) {
              DebugHelper.log('showLoginPage success');
              AccountHelper.refreshAccount();
              Settings.setCurrentPanel('kaios_account_login', { originHref });
            }
          });
          break;
        case 'login-email':
          AccountHelper.showLoginPage('email').then(value => {
            DebugHelper.log(`showLoginPage success${value}`);
            if (value) {
              DebugHelper.log('showLoginPage success');
              AccountHelper.refreshAccount();
              Settings.setCurrentPanel('kaios_account_login', { originHref });
            }
          });
          break;
        default:
          break;
      }
    }

    function initSoftKey() {
      const softkeyParams = {
        menuClassName: 'menu-button',
        header: { l10nId: 'options' },
        items: [
          {
            name: 'notNow',
            l10nId: 'notNow',
            priority: 1,
            method() {
              NavigationMap.navigateBack();
            }
          },
          {
            name: 'Select',
            l10nId: 'select',
            priority: 2,
            method() {
              handleSelect();
            }
          },
          {
            name: 'About',
            l10nId: 'about',
            priority: 3,
            method() {
              Settings.setCurrentPanel('kaios_account_about');
            }
          }
        ]
      };
      SettingsSoftkey.init(softkeyParams);
      SettingsSoftkey.show();
    }

    function checkNetworkStatus() {
      if (ConnectionHelper.isOffline()) {
        ActivityHelper.start({ name: 'offline-dialog' });
      }
    }

    return settingsPanel({
      onInit(panel, options) {
        elements = {
          currentPanel: panel,
          gaiaHeader: panel.querySelector('gaia-header'),
          createAccount: panel.querySelector('#create_account'),
          loginPhone: panel.querySelector('#login-phone'),
          loginEmail: panel.querySelector('#login-email')
        };
        if (options.originHref) {
          // eslint-disable-next-line prefer-destructuring
          originHref = options.originHref;
          elements.gaiaHeader.setAttribute('data-href', originHref);
        }
        checkNetworkStatus();
      },
      onBeforeShow() {
        themeMeta.setAttribute('content', 'transparent');
        initSoftKey();
      },
      onBeforeHide() {
        themeMeta.setAttribute('content', themeColor);
        SettingsSoftkey.hide();
      }
    });
  };
});
