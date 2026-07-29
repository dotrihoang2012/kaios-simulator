/* global AccountHelper, ConnectionHelper */

define(['require','modules/settings_panel'],function (require) {//eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');

  return function createAccountsPanel() {
    const ANTI_THEFT_KEY = 'antitheft.enabled';
    let elements = null;
    let listElements = null;
    let antiTheftValue = true;
    let otherAccountInfo = [];

    function newListItem(account) {
      const name = document.createElement('span');
      name.textContent = account.accountId;
      name.classList.add('full-string');

      const a = document.createElement('a');
      a.appendChild(name);
      a.classList.add('menu-item');

      // Create list item
      const li = document.createElement('li');
      li.appendChild(a);

      // Bind connection callback
      li.onclick = () => {
        Settings.setCurrentPanel('add_account_settings', {
          originHref: '#accounts',
          account
        });
      };
      return li;
    }

    function checkObjectArray(arr1, arr2) {
      if (arr1.length !== arr2.length) {
        return false;
      }
      // eslint-disable-next-line
      for (let i = 0; i < arr1.length; i++) {
        if (typeof arr1[i] !== typeof arr2[i]) {
          return false;
        } else if (JSON.stringify(arr1[i]) !== JSON.stringify(arr2[i])) {
          return false;
        }
      }
      return true;
    }

    const updateAccountInfo = function updateAccountInfo() {
      // This function will update kai account relate UI
      AccountHelper.getAccountInfo(['kaiaccount']).then(result => {
        if (result.length > 0) {
          const kaiInfo = result[0].userData;
          elements.kaiAccountDesc.textContent = kaiInfo.phone
            ? kaiInfo.phone
            : kaiInfo.email;
          elements.antiTheftItem.removeAttribute('aria-disabled');
          elements.antiTheftItem.classList.remove('none-select');
          elements.antiTheftNote1.classList.remove('hidden');
          elements.antiTheftNote2.classList.remove('hidden');
        } else {
          elements.kaiAccountDesc.textContent = l10n.get(
            'kaios-account-not-sign-in'
          );
          elements.antiTheftItem.setAttribute('aria-disabled', true);
          elements.antiTheftItem.classList.add('none-select');
          elements.antiTheftNote1.classList.add('hidden');
          elements.antiTheftNote2.classList.add('hidden');
        }
      });
      AccountHelper.getAccountInfo(['activesync', 'google']).then(result => {
        if (checkObjectArray(otherAccountInfo, result)) {
          return;
        }
        otherAccountInfo = result;
        const list = elements.otherAccounts.querySelectorAll('li');
        const len = list.length;
        // eslint-disable-next-line
        for (let i = len - 2; i >= 0; i--) {
          elements.otherAccounts.removeChild(list[i]);
        }
        for (const account of result) {
          DebugHelper.debug(`getAccounts: ${JSON.stringify(account)}`);
          const listItem = newListItem(account);
          elements.otherAccounts.insertBefore(
            listItem,
            elements.addAccountButton
          );
        }
        window.dispatchEvent(new CustomEvent('refresh'));
      });
    };

    function updateAntiTheft() {
      const enabled = elements.antiTheftSelect.value === 'true' || false;
      if (!enabled) {
        ActivityHelper.start({
          name: 'account-manager',
          data: {
            authenticatorId: 'kaiaccount',
            action: 'showOtherPage',
            publicKey: AccountHelper.publicKey,
            flow: 'checkPassword',
            args: [AccountHelper.kaiAccountInfo.userData, 'disableAntitheft']
          }
        }).then(
          response => {
            AccountHelper.decryptKey(response).then(result => {
              if (result && result.result === 'success') {
                SettingsDBCache.saveSettings({ [ANTI_THEFT_KEY]: enabled });
                ToastHelper.showToast('changessaved');
              } else {
                elements.antiTheftSelect.value = true;
              }
            });
          },
          err => {
            DebugHelper.log(`disableAntitheft error${JSON.stringify(err)}`);
            elements.antiTheftSelect.value = !enabled;
          }
        );
      } else {
        ToastHelper.showToast('changessaved');
        SettingsDBCache.saveSettings({ [ANTI_THEFT_KEY]: true });
      }
    }

    return SettingsPanel({
      onInit(panel) {
        elements = {
          kaiAccountItem: panel.querySelector('#kai-account-item'),
          kaiAccountDesc: panel.querySelector('#kai-account-item small'),
          antiTheftItem: panel.querySelector('#anti-theft-item'),
          antiTheftSelect: panel.querySelector('#anti-theft-select'),
          antiTheftNote1: panel.querySelector('#anti-theft-note1'),
          antiTheftNote2: panel.querySelector('#anti-theft-note2'),
          otherAccounts: panel.querySelector('#other-accounts'),
          addAccountButton: panel.querySelector('#add-account-button')
        };

        elements.kaiAccountItem.onclick = () => {
          if (ConnectionHelper.isOffline()) {
            ActivityHelper.start({ name: 'offline-dialog' });
          }
          if (AccountHelper.kaiAccountLogin) {
            Settings.setCurrentPanel('kaios_account_login', {
              originHref: '#accounts'
            });
          } else {
            Settings.setCurrentPanel('kaios_account', {
              originHref: '#accounts'
            });
          }
        };

        SettingsDBCache.observe(ANTI_THEFT_KEY, false, value => {
          antiTheftValue = value || true;
          elements.antiTheftSelect.value = value;
        });
        elements.antiTheftItem.onclick = evt => {
          const { target } = evt;
          if (target.id === 'anti-theft-item') {
            if (!target.hasAttribute('aria-disabled')) {
              if (ConnectionHelper.isOffline()) {
                ActivityHelper.start({ name: 'offline-dialog' });
              } else {
                elements.antiTheftSelect.focus();
              }
            }
          }
        };
        elements.antiTheftSelect.addEventListener('change', () => {
          // eslint-disable-next-line
          if (antiTheftValue == elements.antiTheftSelect.value) {
            return;
          }
          updateAntiTheft();
        });
        elements.addAccountButton.onclick = () => {
          Settings.setCurrentPanel('add_account_list', {
            originHref: '#accounts'
          });
        };
      },
      onBeforeShow(panel) {
        SettingsSoftkey.init(SoftParams.defaultSelect);
        ListFocusHelper.updateSoftkey(panel);
        listElements = panel.querySelectorAll('li:not(.hidden)');
        ListFocusHelper.addEventListener(listElements);
        updateAccountInfo();
      },

      onBeforeHide() {
        ListFocusHelper.removeEventListener(listElements);
      }
    });
  };
});
