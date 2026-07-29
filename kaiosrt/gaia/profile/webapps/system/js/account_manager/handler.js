/* exported AccountManagerHandler */

/* global AccountManagerConstants AccountManagerCryptoHelper
  AccountManagerDBHelper GoogleAuthenticator ActiveSyncAuthenticator
  KaiAccountAuthenticator */

'use strict';

(function (exports) {
  function log() {
    console.log('[system][AccountManagerHandler]', ...arguments);
  }

  function getAccounts(activityData) {
    const {
      activityHandlerId,
      source: { data },
    } = activityData;
    AccountManagerDBHelper.getAll((accounts) => {
      log('getAccounts accounts: ', accounts);
      const accountList = accounts || [];
      const postData = accountList.map((account) => {
        let packedData = {};
        for (const item of AccountManagerConstants.ACCOUNT_LIST_VISIBILITY[
          account.authenticatorId
        ]) {
          packedData = {
            ...packedData,
            [item]: account[item],
          };
        }
        return packedData;
      });
      const result = {
        activityHandlerId,
        activityResult: postData,
        publicKey: data.publicKey,
      };
      log('getAccounts result: ', result);
      AccountManagerCryptoHelper.postActivityResult(result);
    });
  }

  function getCredential(activityData) {
    const {
      activityHandlerId,
      source: { data },
    } = activityData;
    AccountManagerDBHelper.get(data.account, (selectedAccount) => {
      log('getCredential selectedAccount: ', selectedAccount);
      let result = {};
      if (selectedAccount) {
        const { credential, authenticatorId } = selectedAccount;
        let postData = {};
        for (const item of AccountManagerConstants.CREDENTIAL_VISIBILITY[
          authenticatorId
        ]) {
          postData = {
            ...postData,
            [item]: credential[item],
          };
        }
        result = {
          activityHandlerId,
          activityResult: postData,
          publicKey: data.publicKey,
        };
      } else {
        result = {
          activityHandlerId,
          activityResult:
            AccountManagerConstants.RETURN_MESSAGES.INVALID_ACCOUNT,
          isError: true,
        };
      }
      log('getCredential result: ', result);
      AccountManagerCryptoHelper.postActivityResult(result);
    });
  }

  function generalHandler(methodName, activityData) {
    const {
      activityHandlerId,
      source: { data },
    } = activityData;
    const authenticatorId =
      data.authenticatorId || data.account.authenticatorId;
    const authenticator = getAuthenticator(authenticatorId);
    if (authenticator) {
      if (authenticator[methodName]) {
        authenticator[methodName](activityData);
      } else {
        const result = {
          activityHandlerId,
          activityResult:
            AccountManagerConstants.RETURN_MESSAGES.METHOD_NOT_FOUND,
          isError: true,
        };
        AccountManagerCryptoHelper.postActivityResult(result);
      }
    } else {
      const result = {
        activityHandlerId,
        activityResult:
          AccountManagerConstants.RETURN_MESSAGES.UNKNOWN_AUTHENTICATOR_ID,
        isError: true,
      };
      AccountManagerCryptoHelper.postActivityResult(result);
    }
  }

  function getAuthenticator(authenticatorId) {
    let authenticator;
    switch (authenticatorId) {
      case 'google':
        authenticator = GoogleAuthenticator;
        break;
      case 'activesync':
        authenticator = ActiveSyncAuthenticator;
        break;
      case 'kaiaccount':
        authenticator = KaiAccountAuthenticator;
        break;
      default:
        break;
    }
    return authenticator;
  }

  function showLoginPage(activityData) {
    generalHandler('login', activityData);
  }

  function refreshCredential(activityData) {
    generalHandler('refresh', activityData);
  }

  function revokeCredential(activityData) {
    generalHandler('logout', activityData);
  }

  function showOtherPage(activityData) {
    generalHandler('openFlow', activityData);
  }

  function sendRequest(activityData) {
    generalHandler('requestServer', activityData);
  }

  function AccountManagerHandler(activityData) {
    log('activityData: ', activityData);
    const {
      activityHandlerId,
      source: { data },
    } = activityData;

    if (!data.publicKey) {
      const result = {
        activityHandlerId,
        activityResult: AccountManagerConstants.RETURN_MESSAGES.ACCESS_DENIED,
        isError: true,
      };
      AccountManagerCryptoHelper.postActivityResult(result);
      return;
    }

    switch (data.action) {
      case AccountManagerConstants.ACTIONS.GET_ACCOUNTS:
        getAccounts(activityData);
        break;
      case AccountManagerConstants.ACTIONS.SHOW_LOGIN_PAGE:
        showLoginPage(activityData);
        break;
      case AccountManagerConstants.ACTIONS.SHOW_OTHER_PAGE:
        showOtherPage(activityData);
        break;
      case AccountManagerConstants.ACTIONS.GET_CREDENTIAL:
        getCredential(activityData);
        break;
      case AccountManagerConstants.ACTIONS.REFRESH_CREDENTIAL:
        refreshCredential(activityData);
        break;
      case AccountManagerConstants.ACTIONS.REVOKE_CREDENTIAL:
        revokeCredential(activityData);
        break;
      case AccountManagerConstants.ACTIONS.SEND_REQUEST:
        sendRequest(activityData);
        break;
      default:
        break;
    }
  }

  exports.AccountManagerHandler = AccountManagerHandler;
})(window);
