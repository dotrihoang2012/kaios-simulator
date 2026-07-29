/* exported ActiveSyncAuthenticator */

/* global AccountManagerConstants AccountManagerCryptoHelper WebActivity
  AccountManagerDBHelper */
'use strict';

(function (exports) {
  function log() {
    console.log('[system][ActiveSyncAuthenticator]', ...arguments);
  }

  function saveExchangeCredential(response, activityData) {
    const {
      activityHandlerId,
      source: { data },
    } = activityData;
    const { publicKey } = data;
    if (response) {
      const userData = {
        accountId: response.username,
      };

      const dbData = {
        authenticatorId: data.authenticatorId || data.account.authenticatorId,
        accountId: response.username,
        userData: userData,
        credential: {
          username: response.username,
          password: response.password,
          configInfo: response.configInfo,
        },
      };

      AccountManagerDBHelper.set(dbData, (msg) => {
        const isError =
          msg !== AccountManagerConstants.RETURN_MESSAGES.SUCCESSFUL_RESPONSE;
        const postData = {
          authenticatorId: data.authenticatorId || data.account.authenticatorId,
          accountId: response.username,
        };
        const result = {
          activityHandlerId,
          activityResult: isError ? msg : postData,
          publicKey: isError ? null : publicKey,
          isError,
        };
        log(`saveExchangeCredential result: ${JSON.stringify(result)}`);
        AccountManagerCryptoHelper.postActivityResult(result);
      });
    }
  }

  function verifyPassword(credential) {
    const { username, password, configInfo } = credential;

    let baseUrl = configInfo.server;
    const servicePath = '/Microsoft-Server-ActiveSync';
    if (!baseUrl.endsWith(servicePath)) baseUrl += servicePath;

    return new Promise((xhrResolve, xhrReject) => {
      if (!window.isOnline()) {
        xhrReject(AccountManagerConstants.RETURN_MESSAGES.NO_NETWORK);
      }

      const xhr = new XMLHttpRequest({
        mozSystem: true,
        mozAnon: true,
      });
      const authorization = 'Basic ' + btoa(username + ':' + password);
      const USER_AGENT = 'KaiOS ActiveSync Client';

      xhr.open('OPTIONS', baseUrl, true);
      xhr.setRequestHeader('Authorization', authorization);
      xhr.setRequestHeader('User-Agent', USER_AGENT);
      xhr.timeout = 30 * 1000;

      xhr.upload.onprogress = xhr.upload.onload = () => {
        xhr.timeout = 0;
      };

      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          log('verifyPassword failed: ', xhr.status, xhr.responseText);
          const incorrectPasswordError =
            xhr.responseText &&
            xhr.responseText.includes(
              'Access is denied due to invalid credentials'
            );
          xhrReject(
            incorrectPasswordError
              ? AccountManagerConstants.RETURN_MESSAGES.INCORRECT_PASSWORD
              : AccountManagerConstants.RETURN_MESSAGES.SERVER_ERROR
          );
        } else {
          xhrResolve(credential);
        }
      };

      xhr.onerror = () => {
        xhrReject(
          AccountManagerConstants.RETURN_MESSAGES.REFRESH_CREDENTIAL_FAILED
        );
      };

      xhr.ontimeout = () => {
        xhrReject(AccountManagerConstants.RETURN_MESSAGES.TIMEOUT);
      };

      xhr.send();
    });
  }

  const ActiveSyncAuthenticator = {
    login: (activityData) => {
      log('login: ', activityData);
      const {
        activityHandlerId,
        source: { data },
      } = activityData;
      const { authenticatorId, extraInfo } = data;
      const activity = new WebActivity('account-login', {
        authenticatorId,
        extraInfo: extraInfo ? extraInfo : {},
      });

      activity.start().then(
        (successResponse) => {
          log('activity successResponse: ', successResponse);
          // {
          //   configInfo: {
          //     server:
          //       'https://outlook.office365.com/Microsoft-Server-ActiveSync',
          //     deviceId: 'zzzzzz',
          //   },
          //   password: 'xxxxxx',
          //   username: 'user_name@kaiostech.com',
          // }
          saveExchangeCredential(successResponse, activityData);
        },
        (error) => {
          const result = {
            activityHandlerId,
            activityResult:
              AccountManagerConstants.RETURN_MESSAGES.LOGIN_INTERRUPTED,
            isError: true,
          };
          log('login result: ', result, ' error: ', error);
          AccountManagerCryptoHelper.postActivityResult(result);
        }
      );
    },

    refresh: (activityData) => {
      log('refresh: ', activityData);
      const {
        activityHandlerId,
        source: { data },
      } = activityData;

      const { account, credential: credentialData } = data;
      if (credentialData?.password) {
        AccountManagerDBHelper.get(account, (selectedAccount) => {
          log('selectedAccount: ', selectedAccount);
          if (selectedAccount) {
            const { credential } = selectedAccount;
            const verifyCredential = {
              ...credential,
              password: credentialData.password,
            };
            verifyPassword(verifyCredential).then(
              (successResponse) => {
                log('resolve: ', successResponse);
                saveExchangeCredential(successResponse, activityData);
              },
              (errorMessage) => {
                log('errorMessage: ', errorMessage);
                const result = {
                  activityHandlerId,
                  activityResult: errorMessage,
                  isError: true,
                };
                AccountManagerCryptoHelper.postActivityResult(result);
              }
            );
          } else {
            const result = {
              activityHandlerId,
              activityResult:
                AccountManagerConstants.RETURN_MESSAGES.INVALID_ACCOUNT,
              isError: true,
            };
            AccountManagerCryptoHelper.postActivityResult(result);
          }
        });
      } else {
        const result = {
          activityHandlerId,
          activityResult:
            AccountManagerConstants.RETURN_MESSAGES.INVALID_CREDENTIAL,
          isError: true,
        };
        AccountManagerCryptoHelper.postActivityResult(result);
      }
    },

    logout: (activityData) => {
      log('logout: ', activityData);
      const {
        activityHandlerId,
        source: { data },
      } = activityData;

      AccountManagerDBHelper.remove(data.account, (msg) => {
        log('logout msg: ', msg);
        const isError =
          msg !== AccountManagerConstants.RETURN_MESSAGES.SUCCESSFUL_RESPONSE;
        const result = {
          activityHandlerId,
          activityResult: msg,
          publicKey: isError ? '' : data.publicKey,
          isError,
        };
        AccountManagerCryptoHelper.postActivityResult(result);
      });
    },
  };

  exports.ActiveSyncAuthenticator = ActiveSyncAuthenticator;
})(window);
