/* global AccountHelper ConnectionHelper */

define(['require','modules/settings_panel'],function (require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createAddAcountPanel() {
    let elements = null;

    function showGoogleLoginPage(evt) {
      if (evt.key === 'Enter') {
        showLoginPage('google');
      }
    }

    function showActiveSyncLoginPage(evt) {
      if (evt.key === 'Enter') {
        showLoginPage('activesync');
      }
    }

    function showLoginPage(accountType) {
      DebugHelper.debug(`showLoginPage() - accountType=${accountType}`);
      if (ConnectionHelper.isOffline()) {
        AccountHelper.showErrorDialog('no network');
        return;
      }
      elements.progressBar.classList.remove('hidden');
      elements.accountList.classList.add('hidden');
      ActivityHelper.start({
        name: 'account-manager',
        data: {
          authenticatorId: accountType,
          action: 'showLoginPage',
          publicKey: AccountHelper.publicKey
        }
      }).then(
        result => {
          DebugHelper.debug(`showLoginPage resolved${result}`);
          AccountHelper.refreshAccount();
          NavigationMap.navigateBack();
          elements.progressBar.classList.add('hidden');
          elements.accountList.classList.remove('hidden');
        },
        reason => {
          DebugHelper.log(`showLoginPage rejected: ${reason}`);
          AccountHelper.showErrorDialog(reason);
          elements.progressBar.classList.add('hidden');
          elements.accountList.classList.remove('hidden');
        }
      );
    }

    return SettingsPanel({
      onInit(panel, options) {
        elements = {
          gaiaHeader: panel.querySelector('gaia-header'),
          googleItem: panel.querySelector('#li-google'),
          activeSyncItem: panel.querySelector('#li-activesync'),
          progressBar: panel.querySelector('#login-progress'),
          accountList: panel.querySelector('#account-list')
        };

        if (options.originHref) {
          elements.gaiaHeader.setAttribute('data-href', options.originHref);
        }
      },
      onBeforeShow() {
        elements.progressBar.classList.add('hidden');
        elements.accountList.classList.remove('hidden');
        elements.googleItem.addEventListener('keydown', showGoogleLoginPage);
        elements.activeSyncItem.addEventListener(
          'keydown',
          showActiveSyncLoginPage
        );
      },
      onBeforeHide() {
        elements.googleItem.removeEventListener('keydown', showGoogleLoginPage);
        elements.activeSyncItem.removeEventListener(
          'keydown',
          showActiveSyncLoginPage
        );
      }
    });
  };
});
