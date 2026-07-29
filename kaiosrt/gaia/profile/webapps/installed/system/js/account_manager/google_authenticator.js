/* exported GoogleAuthenticator */

/* global AccountManagerDBHelper AccountManagerConstants
  AccountManagerCryptoHelper Oauth2Config WebActivity Service */
'use strict';

(function (exports) {
  const OAUTH2_STATE = 'KaiOSAccountAuthenticator';
  const TIMEOUT = 30 * 1000;

  function log() {
    console.log('[system][GoogleAuthenticator]', ...arguments);
  }

  function formObject(object) {
    let result = '';
    Object.keys(object).forEach((key) => {
      result = `${result}${result ? '&' : ''}${encodeURIComponent(
        key
      )}=${encodeURIComponent(object[key])}`;
    });
    return result;
  }

  function getAuthUrl(authenticatorId, loginHint) {
    const authEndpointQuery = {
      client_id: Oauth2Config[authenticatorId].client_id,
      redirect_uri: Oauth2Config[authenticatorId].redirect_uri,
      response_type: 'code',
      scope: Oauth2Config[authenticatorId].scope,
      // to get the refresh token
      access_type: 'offline',
      state: OAUTH2_STATE,
      /**
       * use incremental authorization to request access
       * to additional scopes in context
       */
      include_granted_scopes: true,
      login_hint: loginHint ? loginHint : '',
      /**
       * 'consent' to always get a refresh_token
       * 'select_account' to allow login multiple accounts
       */
      prompt: 'select_account',
    };
    const url = `${Oauth2Config[authenticatorId].auth_uri}?${formObject(
      authEndpointQuery
    )}`;

    return url;
  }

  function handleOauth2AccessError(parameter) {
    const { error, activityHandlerId } = parameter;
    let errorMessage =
      AccountManagerConstants.RETURN_MESSAGES.OAUTH2_DEFAULT_ERROR;

    if ('access_denied' === error) {
      // The user denied the permission to the scopes required.
      errorMessage = AccountManagerConstants.RETURN_MESSAGES.INVALID_GRANT;
      // show access denied dialog
      const _ = window.api.l10n.get;
      Service.request('DialogService:show', {
        header: _('account-authenticator-invalid-grant-dialog-title'),
        content: _('account-authenticator-invalid-grant-dialog-text', {
          authenticatorId: 'Google',
        }),
        ok: _('ok'),
        type: 'alert',
        translated: true,
      });
    }

    if (activityHandlerId) {
      const result = {
        activityHandlerId,
        activityResult: errorMessage,
        isError: true,
      };
      AccountManagerCryptoHelper.postActivityResult(result);
    }
  }

  // exchange an authorization code for an access token
  function getAccessToken(authenticatorId, requestData) {
    return new Promise((xhrResolve, xhrReject) => {
      if (!window.isOnline()) {
        xhrReject(AccountManagerConstants.RETURN_MESSAGES.NO_NETWORK);
      }

      const xhr = new XMLHttpRequest({
        mozSystem: true,
      });
      const url = Oauth2Config[authenticatorId].token_uri;
      xhr.open('POST', url);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.timeout = TIMEOUT;

      xhr.onload = () => {
        try {
          if (xhr.status < 200 || xhr.status >= 300) {
            const responseText = JSON.parse(xhr.responseText);
            xhrReject(responseText && responseText.error);
          } else {
            const data = JSON.parse(xhr.responseText);
            xhrResolve(data);
          }
        } catch (ex) {
          xhrReject(
            AccountManagerConstants.RETURN_MESSAGES.BADLY_FORMED_JSON_RESPONSE
          );
        }
      };

      xhr.onerror = () => {
        xhrReject(
          AccountManagerConstants.RETURN_MESSAGES.TOKEN_REDEMPTION_FAILED
        );
      };

      xhr.ontimeout = () => {
        xhrReject(AccountManagerConstants.RETURN_MESSAGES.TIMEOUT);
      };

      xhr.send(formObject(requestData));
    });
  }

  // to get google account info
  function getGoogleAccountInfo(data) {
    return new Promise((xhrResolve, xhrReject) => {
      if (!window.isOnline()) {
        xhrReject(AccountManagerConstants.RETURN_MESSAGES.NO_NETWORK);
      }

      const xhr = new XMLHttpRequest({
        mozSystem: true,
      });
      const url = 'https://www.googleapis.com/userinfo/v2/me';
      xhr.open('GET', url);
      xhr.setRequestHeader(
        'Authorization',
        `${data.token_type} ${data.access_token}`
      );
      xhr.timeout = TIMEOUT;

      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          xhrReject(
            AccountManagerConstants.RETURN_MESSAGES.GET_ACCOUNT_INFO_FAILED
          );
        } else {
          try {
            const response = JSON.parse(xhr.responseText);
            xhrResolve(response);
          } catch (ex) {
            xhrReject(
              AccountManagerConstants.RETURN_MESSAGES.BADLY_FORMED_JSON_RESPONSE
            );
          }
        }
      };

      xhr.onerror = () => {
        xhrReject(
          AccountManagerConstants.RETURN_MESSAGES.GET_ACCOUNT_INFO_FAILED
        );
      };

      xhr.ontimeout = () => {
        xhrReject(AccountManagerConstants.RETURN_MESSAGES.TIMEOUT);
      };
      xhr.send();
    });
  }

  function handleOauth2AccessSuccess(parameter) {
    const { code, authenticatorId, activityHandlerId, publicKey } = parameter;
    /**
     * successfulResponse = {
     *  state: 'KaiOSAccountAuthenticator',
     *  code: 'xxxxxx',
     *  scope: 'scope....',
     *  authuser: '0',
     *  prompt: 'consent',
     * };
     */
    const requestData = {
      client_id: Oauth2Config[authenticatorId].client_id,
      client_secret: Oauth2Config[authenticatorId].client_secret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: Oauth2Config[authenticatorId].redirect_uri,
    };

    getAccessToken(authenticatorId, requestData).then(
      (accessToken) => {
        log('getAccessToken: ', accessToken);
        /**
         * accessToken = {
         *  access_token: 'xxxxx',
         *  expires_in: 3599,
         *  refresh_token: 'xxxxx',
         *  scope: 'scope....',
         *  token_type: 'Bearer',
         *  id_token: 'xxxx',
         * };
         */
        getGoogleAccountInfo(accessToken).then(
          (accountInfo) => {
            const accountId = accountInfo.email;
            const userData = {
              accountId,
            };
            const credential = {
              access_token: accessToken.access_token,
              token_type: accessToken.token_type,
              refresh_token: accessToken.refresh_token,
              expire_timestamp: +new Date() + accessToken.expires_in * 1000,
            };
            const dbData = {
              authenticatorId,
              accountId,
              credential,
              userData,
            };
            AccountManagerDBHelper.set(dbData, (msg) => {
              const isError =
                msg !==
                AccountManagerConstants.RETURN_MESSAGES.SUCCESSFUL_RESPONSE;
              const postData = {
                authenticatorId,
                accountId,
              };

              if (activityHandlerId) {
                const result = {
                  activityHandlerId,
                  activityResult: isError ? msg : postData,
                  publicKey: isError ? '' : publicKey,
                  isError,
                };
                AccountManagerCryptoHelper.postActivityResult(result);
              } else if (isError) {
                showErrorToast(msg);
              }
            });
          },
          (err) => {
            if (activityHandlerId) {
              const result = {
                activityHandlerId,
                activityResult: err,
                isError: true,
              };
              AccountManagerCryptoHelper.postActivityResult(result);
            } else {
              showErrorToast(err);
            }
          }
        );
      },
      (err) => {
        if (activityHandlerId) {
          const result = {
            activityHandlerId,
            activityResult: err,
            isError: true,
          };
          AccountManagerCryptoHelper.postActivityResult(result);
        } else {
          showErrorToast(err);
        }
      }
    );
  }

  function revokeOauth2Credential(authenticatorId, token) {
    return new Promise((xhrResolve, xhrReject) => {
      if (!window.isOnline()) {
        xhrReject(AccountManagerConstants.RETURN_MESSAGES.NO_NETWORK);
      }

      const xhr = new XMLHttpRequest({
        mozSystem: true,
      });
      const url = `${Oauth2Config[authenticatorId].revoke_uri}?token=${token}`;
      xhr.open('POST', url);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.timeout = TIMEOUT;

      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          try {
            const responseText = JSON.parse(xhr.responseText);
            if (responseText.error === 'invalid_token') {
              // if token expired or revoked, account manager also need to delete
              // account info from our device, so we return 'resolve' message
              xhrResolve();
            } else {
              xhrReject(
                AccountManagerConstants.RETURN_MESSAGES.REVOKE_CREDENTIAL_FAILED
              );
            }
          } catch (ex) {
            xhrReject(
              AccountManagerConstants.RETURN_MESSAGES.BADLY_FORMED_JSON_RESPONSE
            );
          }
        } else {
          xhrResolve();
        }
      };

      xhr.onerror = () => {
        xhrReject(
          AccountManagerConstants.RETURN_MESSAGES.REVOKE_CREDENTIAL_FAILED
        );
      };

      xhr.ontimeout = () => {
        xhrReject(AccountManagerConstants.RETURN_MESSAGES.TIMEOUT);
      };

      xhr.send();
    });
  }

  function showErrorToast(errorMsg) {
    if (AccountManagerConstants.RETURN_MESSAGES.NO_NETWORK === errorMsg) {
      Service.request('SystemToaster:show', {
        textL10n: 'account-authenticator-no-network-error',
      });
    } else {
      Service.request('SystemToaster:show', {
        textL10n: 'account-authenticator-default-error',
      });
    }
  }

  function addNotice(authenticatorId, accountId, accessToken) {
    const _ = window.api.l10n.get;
    const tag = accountId;
    const title = _('account-authenticator-invalid-grant-notice-title');
    const options = {
      body: _('account-authenticator-invalid-grant-notice-text'),
      icon: 'contacts',
      tag,
      type: 'account-authenticator-notification',
    };
    const notification = new Notification(title, options);
    notification.onclick = (evt) => {
      const tag = evt.target.tag;
      log('tag: ', tag);

      // logout account
      revokeOauth2Credential(authenticatorId, accessToken).then(
        () => {
          const account = { authenticatorId, accountId: tag };
          AccountManagerDBHelper.remove(account, () => {
            notification.close();

            const oauth2Activity = new WebActivity('account-login', {
              authenticatorId,
              url: getAuthUrl(authenticatorId, tag)
            });
            // and launch login UI
            oauth2Activity.start().then(
              (successResponse) => {
                const { state, code, error } = successResponse;
                if (state === OAUTH2_STATE) {
                  if (error) {
                    handleOauth2AccessError({ error });
                  } else if (code) {
                    handleOauth2AccessSuccess({ code, authenticatorId });
                  }
                } else {
                  showErrorToast();
                }
              },
              (err) => {
                log('login err: ', err);
                showErrorToast(err);
              }
            );
          });
        },
        (errorMsg) => {
          showErrorToast(errorMsg);
        }
      );
    };
  }

  const GoogleAuthenticator = {
    login: (activityData) => {
      log('login: ', activityData);
      const {
        activityHandlerId,
        source: { data },
      } = activityData;
      const { authenticatorId, extraInfo, publicKey } = data;

      const oauth2Activity = new WebActivity(
        // calling login activity created on loginpages app.
        'account-login',
        {
          authenticatorId,
          url: getAuthUrl(authenticatorId, extraInfo?.loginHint),
          extraInfo: extraInfo ? extraInfo : {},
        },
      );

      oauth2Activity.start().then(
        (successResponse) => {
          const { state, code, error } = successResponse;
          log('oauth2Activity onsuccess: ', successResponse);
          if (state === OAUTH2_STATE) {
            if (error) {
              handleOauth2AccessError({ error, activityHandlerId });
            } else if (code) {
              handleOauth2AccessSuccess({
                code,
                authenticatorId,
                activityHandlerId,
                publicKey,
              });
            }
          } else {
            const result = {
              activityHandlerId,
              activityResult:
                AccountManagerConstants.RETURN_MESSAGES.MISMATCH_STATE,
              isError: true,
            };
            AccountManagerCryptoHelper.postActivityResult(result);
          }
        },
        (error) => {
          const result = {
            activityHandlerId,
            activityResult:
              error ||
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
      const {
        account: { authenticatorId, accountId },
        publicKey,
      } = data;
      AccountManagerDBHelper.get(data.account, (selectedAccount) => {
        if (selectedAccount) {
          const requestData = {
            refresh_token: selectedAccount.credential.refresh_token,
            client_id: Oauth2Config[authenticatorId].client_id,
            client_secret: Oauth2Config[authenticatorId].client_secret,
            grant_type: 'refresh_token',
          };

          getAccessToken(authenticatorId, requestData).then(
            (accessToken) => {
              // accessToken = {
              //   access_token: 'xxxxx',
              //   expires_in: 3920,
              //   scope: 'scope....',
              //   token_type: 'Bearer',
              // };
              const dbData = {
                ...selectedAccount,
                credential: {
                  ...selectedAccount.credential,
                  access_token: accessToken.access_token,
                  expire_timestamp: +new Date() + accessToken.expires_in * 1000,
                },
              };

              AccountManagerDBHelper.set(dbData, (msg) => {
                const isError =
                  msg !==
                  AccountManagerConstants.RETURN_MESSAGES.SUCCESSFUL_RESPONSE;
                const postData = {
                  authenticatorId,
                  accountId,
                };
                const result = {
                  activityHandlerId,
                  activityResult: isError ? msg : postData,
                  publicKey: isError ? '' : publicKey,
                  isError,
                };
                AccountManagerCryptoHelper.postActivityResult(result);
              });
            },
            (errorMessage) => {
              log('errorMessage: ', errorMessage);
              // Bug 115485, user revoke permission from:
              // https://myaccount.google.com/permissions
              if (errorMessage === 'invalid_grant') {
                const accessToken = selectedAccount.credential.access_token;
                addNotice(authenticatorId, accountId, accessToken);
              }
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
    },

    logout: (activityData) => {
      log('logout: ', activityData);
      const {
        activityHandlerId,
        source: { data },
      } = activityData;
      AccountManagerDBHelper.get(data.account, (selectedAccount) => {
        if (selectedAccount) {
          const { authenticatorId, credential } = selectedAccount;
          revokeOauth2Credential(authenticatorId, credential.access_token).then(
            () => {
              AccountManagerDBHelper.remove(data.account, (msg) => {
                log('logout msg: ', msg);
                const isError =
                  msg !==
                  AccountManagerConstants.RETURN_MESSAGES.SUCCESSFUL_RESPONSE;
                const result = {
                  activityHandlerId,
                  activityResult: msg,
                  publicKey: isError ? '' : data.publicKey,
                  isError,
                };
                AccountManagerCryptoHelper.postActivityResult(result);
              });
            },
            (errorMsg) => {
              const result = {
                activityHandlerId,
                activityResult: errorMsg,
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
    },
  };

  exports.GoogleAuthenticator = GoogleAuthenticator;
})(window);
