/* global AppOrigin AccountHelper */

define(['require','modules/settings_panel','modules/apps_cache'],function (require) { //eslint-disable-line
  const SettingsPanel = require('modules/settings_panel');
  const AppsCache = require('modules/apps_cache');

  return function createAccountSettings() {
    const CALENDAR_SYNC_KEY = 'calendarSyncEnable';
    const CONTACTS_SYNC_KEY = 'contactsSyncEnable';
    const EMAIL_SYNC_KEY = 'emailSyncEnable';
    let elements = null;
    let listElements = null;
    let accountInfo = null;
    let accountKey = null;

    const skSelect = {
      name: 'Select',
      l10nId: 'select',
      priority: 2,
      method() {
        const focusItem = elements.currentPanel.querySelector('.focus');
        if (focusItem.id === 'account-info') {
          Settings.setCurrentPanel('change_account_info', {
            account: accountInfo
          });
        } else {
          updateSyncInfo(true);
        }
      }
    };

    const skDeSelect = {
      name: 'Deselect',
      l10nId: 'deselect',
      priority: 2,
      method() {
        showDeselectDialog();
      }
    };

    const skDeleteAccount = {
      name: 'DeleteAccount',
      l10nId: 'deleteaccount',
      priority: 1,
      method() {
        showDeleteDialog(accountInfo);
      }
    };

    const softkeyDeselParams = {
      menuClassName: 'menu-button',
      header: { l10nId: 'message' },
      items: [skDeleteAccount, skDeSelect]
    };

    const softkeySelParams = {
      menuClassName: 'menu-button',
      header: { l10nId: 'message' },
      items: [skDeleteAccount, skSelect]
    };

    function updateSyncInfo(checked) {
      const focusItem = elements.currentPanel.querySelector('.focus');
      switch (focusItem.id) {
        case 'sync-calendar':
          updateSettingsSyncInfo(
            CALENDAR_SYNC_KEY,
            elements.calendarSyncSwitch,
            checked
          );
          break;
        case 'sync-contacts':
          updateSettingsSyncInfo(
            CONTACTS_SYNC_KEY,
            elements.contactsSyncSwitch,
            checked
          );
          break;
        case 'sync-email':
          updateSettingsSyncInfo(
            EMAIL_SYNC_KEY,
            elements.emailSyncSwitch,
            checked
          );
          break;
        default:
          break;
      }
    }

    function updateSettingsSyncInfo(key, element, checked) {
      DebugHelper.debug(`updateSettingsSyncInfo() - checked=${checked}`);
      SettingsDBCache.getSetting(key).then(value => {
        if (value) {
          const syncValue = value;
          syncValue[accountKey] = checked;
          const syncInfo = {};
          syncInfo[key] = syncValue;
          SettingsDBCache.saveSettings(syncInfo);
        }
        element.checked = checked;
        updateSoftKey();
      });
    }

    function updateSoftKey() {
      const focusItem = elements.currentPanel.querySelector('.focus input');
      const focusChecked = focusItem ? focusItem.checked : false;
      SettingsSoftkey.init(
        focusChecked ? softkeyDeselParams : softkeySelParams
      );
      SettingsSoftkey.show();
    }

    function showDeselectDialog() {
      const dialogConfig = {
        title: {
          id: 'turn-off-sync',
          args: {}
        },
        body: {
          id: 'turn-off-sync-description',
          args: {}
        },
        cancel: {
          name: 'No',
          l10nId: 'no',
          priority: 1,
          callback() {
            DebugHelper.debug('Turn off sync, No');
            elements.currentPanel.querySelector('.focus input').checked = true;
          }
        },
        confirm: {
          name: 'Yes',
          l10nId: 'yes',
          priority: 3,
          callback() {
            updateSyncInfo(false);
          }
        }
      };
      DialogHelper.show(dialogConfig);
    }

    function showDeleteDialog(account) {
      const dialogConfig = {
        title: {
          id: 'delete-account',
          args: {}
        },
        body: {
          id: 'delete-account-description',
          args: {}
        },
        cancel: {
          name: 'Cancel',
          l10nId: 'cancel',
          priority: 1,
          callback() {
            DebugHelper.debug('Delete account cancel');
          }
        },
        confirm: {
          name: 'Delete',
          l10nId: 'delete',
          priority: 3,
          callback() {
            ActivityHelper.start({
              name: 'account-manager',
              data: {
                account: {
                  authenticatorId: account.authenticatorId,
                  accountId: account.accountId
                },
                action: 'revokeCredential',
                publicKey: AccountHelper.publicKey
              }
            }).then(
              response => {
                AccountHelper.decryptKey(response).then(result => {
                  DebugHelper.log(
                    `Account revokeCredential success:${JSON.stringify(result)}`
                  );
                  AccountHelper.refreshAccount();
                  NavigationMap.navigateBack();
                });
              },
              err => {
                DebugHelper.log(
                  `Account revokeCredential err:${JSON.stringify(err)}`
                );
              }
            );
          }
        }
      };
      DialogHelper.show(dialogConfig);
    }

    function getSyncInfo() {
      SettingsDBCache.getSettings(
        [CALENDAR_SYNC_KEY, CONTACTS_SYNC_KEY, EMAIL_SYNC_KEY],
        results => {
          const calendarValues = results[CALENDAR_SYNC_KEY];
          const contactsValues = results[CONTACTS_SYNC_KEY];
          const emailValues = results[EMAIL_SYNC_KEY];
          // eslint-disable-next-line
          for (let key in calendarValues) {
            DebugHelper.debug(`result[${key}]=${calendarValues[key]}`);
            if (key === accountKey) {
              elements.calendarSyncSwitch.checked = calendarValues[key];
              break;
            }
          }
          // eslint-disable-next-line
          for (let key in contactsValues) {
            DebugHelper.debug(`result[${key}]=${contactsValues[key]}`);
            if (key === accountKey) {
              elements.contactsSyncSwitch.checked = contactsValues[key];
              break;
            }
          }
          // eslint-disable-next-line
          for (let key in emailValues) {
            DebugHelper.debug(`result[${key}]=${emailValues[key]}`);
            if (key === accountKey) {
              elements.emailSyncSwitch.checked = emailValues[key];
              break;
            }
          }
          updateSoftKey();
        }
      );
    }

    return SettingsPanel({
      onInit(panel, options) {
        elements = {
          currentPanel: panel,
          gaiaHeader: panel.querySelector('gaia-header'),
          header: panel.querySelector('#account-header'),
          calendarSyncItem: panel.querySelector('#sync-calendar'),
          calendarSyncSwitch: panel.querySelector('#sync-calendar input'),
          contactsSyncItem: panel.querySelector('#sync-contacts'),
          contactsSyncSwitch: panel.querySelector('#sync-contacts input'),
          emailSyncItem: panel.querySelector('#sync-email'),
          emailSyncSwitch: panel.querySelector('#sync-email input'),
          accountInfo: panel.querySelector('#account-info'),
          accountInfoHeader: panel.querySelector('#account-info-header')
        };

        AppsCache.apps().then(apps => {
          let emailExit = false;
          let calendarExit = false;
          for (let i = 0; i < apps.length; i++) {
            if (apps[i].origin === AppOrigin.getOrigin('email')) {
              emailExit = true;
            } else if (apps[i].origin === AppOrigin.getOrigin('calendar')) {
              calendarExit = true;
            }
            if (emailExit && calendarExit) {
              break;
            }
          }
          if (!emailExit) {
            elements.emailSyncItem.classList.add('hidden');
          }
          if (!calendarExit) {
            elements.calendarSyncItem.classList.add('hidden');
          }
        });

        if (options.originHref) {
          elements.gaiaHeader.setAttribute('data-href', options.originHref);
        }
        listElements = panel.querySelectorAll('li');
      },
      onBeforeShow(panel, options) {
        elements.header.textContent = options.account.accountId;
        if (options.account.authenticatorId === 'activesync') {
          elements.accountInfoHeader.classList.remove('hidden');
          elements.accountInfo.classList.remove('hidden');
        } else {
          elements.accountInfoHeader.classList.add('hidden');
          elements.accountInfo.classList.add('hidden');
        }
        accountInfo = options.account;
        accountKey = `${accountInfo.authenticatorId}:${accountInfo.accountId}`;
        getSyncInfo();
        ListFocusHelper.addEventListener(listElements, updateSoftKey);
      },

      onBeforeHide() {
        ListFocusHelper.removeEventListener(listElements, updateSoftKey);
      }
    });
  };
});
