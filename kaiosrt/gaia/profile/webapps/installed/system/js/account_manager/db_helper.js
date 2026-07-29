/* exported AccountManagerDBHelper */

/* global asyncStorage, AccountManager, AccountManagerConstants,
   SettingsObserver */

'use strict';

(function (exports) {
  const KEY = 'Accounts';

  function updateSyncSettings(account, isAdd) {
    const { authenticatorId, accountId } = account;
    if (authenticatorId && accountId) {
      // account key format: 'activesync:xxxxx@kaiostech.com'
      const accountKey = `${authenticatorId}:${accountId}`;

      const syncList = [
        'emailSyncEnable',
        'contactsSyncEnable',
        'calendarSyncEnable',
      ];

      syncList.forEach((key) => {
        SettingsObserver.getValue(key).then((value) => {
          let syncEnableObj = value ? { ...value } : {};
          if (isAdd) {
            syncEnableObj[accountKey] = true;
          } else {
            delete syncEnableObj[accountKey];
          }
          SettingsObserver.setValue([
            {
              name: key,
              value: syncEnableObj,
            },
          ]);
        });
      });
    }
  }

  const AccountManagerDBHelper = {
    set: (account, callback = () => {}) => {
      const { authenticatorId, accountId } = account;
      if (authenticatorId) {
        if (authenticatorId !== 'kaiaccount' && !accountId) {
          callback(AccountManagerConstants.RETURN_MESSAGES.INVALID_ACCOUNT);
          return;
        }
        asyncStorage.getItem(KEY, (data) => {
          const accounts = data || [];
          const selectedAccountIdx = accounts.findIndex((item) => {
            switch (authenticatorId) {
              case 'kaiaccount':
                return item.authenticatorId === authenticatorId;
              default:
                return (
                  item.authenticatorId === authenticatorId &&
                  item.accountId === accountId
                );
            }
          });
          const existsAccount = selectedAccountIdx > -1;
          const accountWithUpdateTime = {
            ...account,
            updateTime: +new Date(),
          };
          if (existsAccount) {
            accounts[selectedAccountIdx] = accountWithUpdateTime;
          } else {
            accounts.push(accountWithUpdateTime);
          }
          asyncStorage.setItem(KEY, accounts, () => {
            callback(
              AccountManagerConstants.RETURN_MESSAGES.SUCCESSFUL_RESPONSE
            );
            if (!existsAccount) {
              // Notify api-daemon that account has been signed in.
              AccountManager.notify({
                authenticatorId,
                accountId,
                state: AccountManager.state.LOGGED_IN,
              });
              // only new login account need to turn on
              if (authenticatorId !== 'kaiaccount') {
                updateSyncSettings(account, true);
              }
            } else {
              // Notify api-daemon that account has been refreshed.
              AccountManager.notify({
                authenticatorId,
                accountId,
                state: AccountManager.state.REFRESHED,
              });
            }
          });
        });
      } else {
        callback(AccountManagerConstants.RETURN_MESSAGES.INVALID_ACCOUNT);
      }
    },

    get: (account, callback = () => {}) => {
      let selectedAccount;
      if (account) {
        const { authenticatorId, accountId } = account;
        asyncStorage.getItem(KEY, (data) => {
          const accounts = data || [];
          selectedAccount = accounts.find((item) => {
            switch (authenticatorId) {
              case 'kaiaccount':
                return item.authenticatorId === authenticatorId;
              default:
                return (
                  item.authenticatorId === authenticatorId &&
                  item.accountId === accountId
                );
            }
          });
          callback(selectedAccount);
        });
      } else {
        callback(selectedAccount);
      }
    },

    getAll: (callback = () => {}) => {
      asyncStorage.getItem(KEY, (accounts) => {
        const accountList = accounts ? [...accounts] : [];
        accountList.sort((a, b) => a.updateTime - b.updateTime);
        callback(accountList);
      });
    },

    remove: (account, callback = () => {}) => {
      if (account) {
        const { authenticatorId, accountId } = account;
        asyncStorage.getItem(KEY, (data) => {
          const accounts = data || [];
          const selectedAccountIdx = accounts.findIndex((item) => {
            switch (authenticatorId) {
              case 'kaiaccount':
                return item.authenticatorId === authenticatorId;
              default:
                return (
                  item.authenticatorId === authenticatorId &&
                  item.accountId === accountId
                );
            }
          });
          const existsAccount = selectedAccountIdx > -1;
          if (existsAccount) {
            accounts.splice(selectedAccountIdx, 1);
            asyncStorage.setItem(KEY, accounts, () => {
              callback(
                AccountManagerConstants.RETURN_MESSAGES.SUCCESSFUL_RESPONSE
              );
              // Notify api-daemon that account has been signed out.
              AccountManager.notify({
                authenticatorId,
                accountId,
                state: AccountManager.state.LOGGED_OUT,
              });
              if (authenticatorId !== 'kaiaccount') {
                updateSyncSettings(account, false);
              }
            });
          } else {
            callback(AccountManagerConstants.RETURN_MESSAGES.INVALID_ACCOUNT);
          }
        });
      } else {
        callback(AccountManagerConstants.RETURN_MESSAGES.INVALID_ACCOUNT);
      }
    },
  };

  exports.AccountManagerDBHelper = AccountManagerDBHelper;
})(window);
