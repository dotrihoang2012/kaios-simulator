/* global AccountHelper */

define(['require','modules/settings_panel'],function (require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createChangeAccountPanel() {
    let elements = null;
    let accountInfo = null;
    let saved = false;

    function updateSoftKey() {
      const softkeyParams = {
        menuClassName: 'menu-button',
        header: {
          l10nId: 'message'
        },
        items: [
          {
            name: 'Cancel',
            l10nId: 'cancel',
            priority: 1,
            method() {
              updateUI();
              Settings.setCurrentPanel('add_account_settings', {
                account: accountInfo
              });
            }
          },
          {
            name: 'Save',
            l10nId: 'save',
            priority: 3,
            method() {
              changePassword(accountInfo, elements.passwordInput.value);
            }
          }
        ]
      };
      SettingsSoftkey.init(softkeyParams);
      SettingsSoftkey.show();
    }

    function changePassword(account, passcode) {
      if (!navigator.onLine) {
        AccountHelper.showErrorDialog('no network');
      } else {
        if (saved) {
          return;
        }
        elements.progressBar.classList.remove('hidden');
        elements.changePwdPage.classList.add('hidden');
        SettingsSoftkey.hide();
        saved = true;
        ActivityHelper.start({
          name: 'account-manager',
          data: {
            action: 'refreshCredential',
            publicKey: AccountHelper.publicKey,
            account: {
              authenticatorId: 'activesync', // 'google' or 'activesync'
              accountId: account.accountId
            },
            credential: {
              password: passcode
            }
          }
        }).then(
          result => {
            DebugHelper.debug(
              `reauthenticate resolved${JSON.stringify(result)}`
            );
            ToastHelper.showToast('password-saved');
            elements.progressBar.classList.add('hidden');
            elements.changePwdPage.classList.remove('hidden');
            updateUI();
            saved = false;
            Settings.setCurrentPanel('add_account_settings', {
              account
            });
          },
          reason => {
            DebugHelper.debug(`reauthenticate rejected: ${reason}`);
            AccountHelper.showErrorDialog(reason);
            elements.progressBar.classList.add('hidden');
            elements.changePwdPage.classList.remove('hidden');
            SettingsSoftkey.show();
            updateChangeAccountInfoDisplay();
            saved = false;
          }
        );
      }
    }

    function updateChangeAccountInfoDisplay() {
      elements.header.setAttribute('data-l10n-id', 'incorrect-password');
      elements.userNameItem.classList.add('hidden');
      elements.incorrectPwdDesc.classList.remove('hidden');
      updateUI();
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    function updateShowPasswordDisplay() {
      elements.showPasswordItem.classList.remove('hidden');
      window.dispatchEvent(new CustomEvent('refresh'));
    }

    function clickHandler() {
      if (elements.showPasswordIpunt.checked) {
        elements.passwordInput.type = 'text';
      } else {
        elements.passwordInput.type = 'password';
      }
    }

    function updateUI() {
      elements.passwordInput.value = '';
      elements.passwordInput.type = 'password';
      elements.showPasswordIpunt.checked = false;
      elements.showPasswordItem.classList.add('hidden');
    }

    function keydownHandler(evt) {
      if (evt.key === 'Backspace') {
        updateUI();
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          header: panel.querySelector('#account-header'),
          userNameItem: panel.querySelector('#user-name-item'),
          usernameDesc: panel.querySelector('#user-name-item small'),
          passwordItem: panel.querySelector('#password-item'),
          passwordInput: panel.querySelector('#password-item input'),
          showPasswordItem: panel.querySelector('#show-password-item'),
          showPasswordIpunt: panel.querySelector('#show-password-item input'),
          incorrectPwdDesc: panel.querySelector('#incorrect-name-desc'),
          progressBar: panel.querySelector('#save-password-progress'),
          changePwdPage: panel.querySelector('#change-password-page')
        };

        elements.passwordItem.onfocus = () => {
          elements.passwordInput.focus();
          elements.passwordInput.selectionStart =
            elements.passwordInput.value.length;
        };
      },

      onBeforeShow(panel, options) {
        elements.header.textContent = options.account.accountId;
        elements.usernameDesc.textContent = options.account.accountId;
        elements.progressBar.classList.add('hidden');
        elements.changePwdPage.classList.remove('hidden');
        elements.userNameItem.classList.remove('hidden');
        elements.incorrectPwdDesc.classList.add('hidden');
        accountInfo = options.account;

        updateSoftKey();
        elements.passwordInput.addEventListener(
          'input',
          updateShowPasswordDisplay
        );
        elements.showPasswordIpunt.addEventListener('click', clickHandler);
        window.addEventListener('keydown', keydownHandler);
      },

      onBeforeHide() {
        elements.passwordInput.removeEventListener(
          'input',
          updateShowPasswordDisplay
        );
        elements.showPasswordIpunt.removeEventListener('click', clickHandler);
        window.removeEventListener('keydown', keydownHandler);
      }
    });
  };
});
