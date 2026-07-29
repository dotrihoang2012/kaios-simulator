/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global AccountManagerDBHelper, KaiAccountConfig, KaiAccountCryptoHelper,
   KaiAccountDeviceInfoHelper, KaiAccountErrorTable,
   KaiAccountServerRequestHelper, Service,
   asyncStorage, FxAccountsManager, FMDManager
 */
/* exported FxAccountsClient */

'use strict';

/**
 * KaiOS Account Interfaces to Communicate with Server directly.
 */
(function (exports) {
  var KaiAccountsClient = function KaiAccountsClient() {

    const KAIACCOUNT_AUTH_ID = 'kaiaccount';
    const deviceInfoHelper = KaiAccountDeviceInfoHelper;
    const requestHelper = KaiAccountServerRequestHelper;
    const refetchTokenInterval = 24 * 60 * 60 * 1000;
    let restrictedTokenFetchTime = null;
    let restrictedTokenPromise = null;

    /**
     * ACCOUNT_NOT_FOUND error when in a singed in state means that the
     * account has been deleted on Web portal.
     *
     * @param {Object} errorObj - Error message
     * @return {Boolean} Account has been deleted or not.
     */
    var checkAccountDeleted = (errorObj) => {
      const ERROR_LIST = ['ACCOUNT_NOT_FOUND', 'JWT_BLACKLISTED'];

      if (errorObj && errorObj.error && ERROR_LIST.includes(errorObj.error)) {
        errorObj.error = 'ACCOUNT_DELETED';
        Service.request('SystemToaster:show', { textL10n: 'account-deleted' });
        // If an account has been deleted, we must trigger local force sign out.
        localSignOut();
        return true;
      }
      return false;
    };

    /**
     * Local force sign out, destroy the credential and account info from
     * Account DB (asyncStorage), and fire onlogout event to apps.
     *
     * Dispatch "kaiaccount:onlogout" event to notify ones who need to change
     * status that KaiOS account has been signed out.
     **/
    var localSignOut = (onsuccess = null) => {
      const accountData = {
        authenticatorId: KAIACCOUNT_AUTH_ID
      };
      const callback = (msg) => {
        emit('kaiaccount:onlogout');
        FxAccountsManager.disableAlarm();
        onsuccess && onsuccess(msg);
      };

      AccountManagerDBHelper.remove(accountData, callback);
    };

    /**
     * We record the login type into asyncStorage to know account is signed in
     * with phone or email.
     *
     * @param {String} accountId - Account username would be phone number or
     *                             email address.
     */
    var setLoginType = (accountId) => {
      return new Promise(resolve => {
        // sign in with phone number
        let type = KaiAccountConfig.LOGIN_TYPE.PHONE;

        if (accountId.indexOf('@') > 0) {
          // sign in with email
          type = KaiAccountConfig.LOGIN_TYPE.EMAIL;
        }
        asyncStorage.setItem(
          KaiAccountConfig.LOGIN_TYPE_KEY,
          type,
          () => resolve()
        );
      });
    };

    var getLoginType = () => {
      return new Promise(resolve => {
        asyncStorage.getItem(KaiAccountConfig.LOGIN_TYPE_KEY, value => {
          let result = null;
          Object.keys(KaiAccountConfig.LOGIN_TYPE).every(key => {
            if (value === KaiAccountConfig.LOGIN_TYPE[key]) {
              result = key;
              return false;
            }
            return true;
          });
          resolve(result);
        });
      });
    };

    /**
     * Get restricted token and keep it for 1 day.
     */
    var getRestrictedToken = async () => {
      // Check if token exists or expires.
      const needRefetch = () => {
        if (
          restrictedTokenPromise === null ||
          restrictedTokenFetchTime === null ||
          Date.now() - restrictedTokenFetchTime > refetchTokenInterval
        ) {
          return true;
        }
        return false;
      };
      let assertion = null;

      try {
        if (needRefetch()) {
          restrictedTokenPromise = navigator.b2g.authorizationManager
            .getRestrictedToken('service');
          restrictedTokenFetchTime = Date.now();
        }

        const credential = await restrictedTokenPromise;

        assertion = {
          kid: credential.kid,
          mac_key: credential.macKey
        };
      } catch (e) {
        console.error("getRestrictedToken failed with status: " + e);
      }
      return assertion;
    };

    /**
     * Get KaiOS account API prefix by type
     *
     * @param {String} apiType - Should be "api" or "auth".
     * @param {String} action - Action you'd like to run, for example, signIn,
     *                          getAccount, logout, and so on.
     * @return Object - including url and method
     */
    var getURL = async (apiType, action) => {
      const endpoints = {
        signIn: {
          method: 'POST',
          route: '/tokens'
        },
        getAccounts: {
          method: 'GET',
          route: '/accounts/me'
        },
        logout: {
          method: 'DELETE',
          route: '/tokens'
        },
        verifyPassword: {
          method: 'POST',
          route: '/tokens/head'
        },
        changePassword: {
          method: 'PATCH',
          route: '/accounts/me'
        },
        updateAccount: {
          method: 'PATCH',
          route: '/accounts/me'
        },
        checkPhoneExistence: {
          method: 'HEAD',
          route: '/accounts'
        },
        checkEmailExistence: {
          method: 'HEAD',
          route: '/accounts'
        },
        requestEmailVerification: {
          method: 'POST',
          route: '/contact_checks'
        },
        requestPhoneVerification: {
          method: 'POST',
          route: '/contact_checks'
        },
        resolvePhoneVerification: {
          method: 'PUT',
          route: '/contact_checks/'
        },
        signUp: {
          method: 'POST',
          route: '/accounts'
        },
        deleteAccount: {
          method: 'DELETE',
          route: '/accounts/me'
        },
        refreshToken: {
          method: 'PUT',
          route: '/tokens'
        }
      };
      const hostConfig = await requestHelper.getHostConfig();
      const host = hostConfig[`${apiType.toUpperCase()}_HOST`];
      const resource = hostConfig[`${apiType.toUpperCase()}_RES`];

      return {
        method: endpoints[action].method,
        url: host + resource + endpoints[action].route
      };
    };

    /**
     * Convert an error number to an error message. If an errno is undefined
     * then return "SERVER_ERROR" as default.
     *
     * @param {Object} response - Response from server.
     * @param {Boolean} returnObj - Return object format or string.
     * @return Object | String - Error message.
     */
    var getServerErrorMsg = (response, returnObj = true) => {
      let defaultErrorMsg = response && response.status ? 'SERVER_ERROR' : 'OFFLINE';
      let errorObj = { error: defaultErrorMsg };
      let errorResult = returnObj ? errorObj : defaultErrorMsg;
      let errorMsg = '';
      let serverResp = null;

      // Check response format
      if (!response || !response.responseText) {
        return errorResult;
      }

      try {
        serverResp = JSON.parse(response.responseText);
        if (!serverResp.code) {
          return errorResult;
        }
      } catch (e) {
        return errorResult;
      }

      // Convert errno to error message
      errorMsg = KaiAccountErrorTable[serverResp.errno];
      errorMsg = errorMsg ? errorMsg : defaultErrorMsg;
      errorObj.error = errorMsg;
      errorResult = returnObj ? errorObj : errorMsg;
      return errorResult;
    };

    /**
     * Wrapping the user information format for applications.
     *
     * @param {Object} response - User information responded by server.
     * @return Object - User information
     */
    var accountInfoWrapper = async (response) => {
      const loginType = await getLoginType();
      let data = {};

      data.uid = response.id;
      data.phone = response.mobile_phone;
      data.email = response.email;
      data.altPhone = response.second_mobile_phone;
      data.altEmail = response.second_email,
      data.pending = response.pending ? {
        phone: response.pending.mobile_phone,
        email: response.pending.email,
        altPhone: response.pending.second_mobile_phone,
        altEmail: response.pending.second_email
      } : {};
      data.yob = response.yob;
      data.birthday = response.birthday;
      data.gender = response.gender;
      data.accountId = data[loginType.toLowerCase()];

      return data;
    };

    /**
     * Get KaiOS account data from DB and convert callback to promise.
     */
    var getKaiAccountFromDB = () => {
      return new Promise(resolve => {
        AccountManagerDBHelper.get(
          { authenticatorId: KAIACCOUNT_AUTH_ID },
          account => resolve(account)
        );
      });
    };

    /**
     * Check credential saved in account DB if exists, and return account
     * data what you want.
     *
     * @param {String} returnType -
     * - all: Return both credential and account information.
     * - token: Only return credential.
     * - info: Only return account information.
     * @return Object
     */
    var verifyCredential = async (returnType = 'token') => {
      let account = await getKaiAccountFromDB();
      let result = null;

      if (!account) {
        return Promise.reject({ error: 'HAVE_NOT_SIGNED_IN' });
      }

      const { credential } = account;

      if (!credential || !credential.kid || !credential.mac_key) {
        return Promise.reject({ error: 'INVALID_CREDENTIAL' });
      }

      // return data by type
      switch (returnType) {
        case 'all':
          result = account;
          break;
        case 'info':
          result = account.userData;
          break;
        case 'token':
        default:
          result = {
            kid: account.credential.kid,
            mac_key: account.credential.mac_key
          };
          break;
      }

      return Promise.resolve(result);
    };

    /**
     * Broadcast an event.
     * @param {String} type - Event Type
     * @param {Object} data - Event Data
     */
    var emit = (type, data = {}) => {
      const evt = new CustomEvent(type, {
        detail: data,
        bubbles: true,
        cancelable: false
      });
      window.dispatchEvent(evt);
    };

    // === API ===

    /**
     * Sign in with an account registered, acquire a credential if succeeds
     *
     * @param {String} accountId - The email address or phone number as
     *                             account's id.
     * @param {String} password - The password used for user authentication.
     * @param {Function} onsuccess - Success callback function
     * @param {Function} onerror - Error callback function
     */
    var signIn = async (accountId, password, onsuccess, onerror) => {
      if (!accountId) {
        onerror && onerror({ error: 'INVALID_ACCOUNTID' });
        return;
      }
      if (!password) {
        onerror && onerror({ error: 'INVALID_PASSWORD' });
        return;
      }

      const { url, method } = await getURL('auth', 'signIn');
      const successCb = async (response) => {
        let authenticated = true;

        if (
          !response || !response.kid || !response.mac_key ||
          !response.refresh_token
        ) {
          authenticated = false;
        }

        if (authenticated) {
          setLoginType(accountId);
          FxAccountsManager.signInTriggered = true;
          response.expire_timestamp = Date.now() + response.expires_in * 1000;
          AccountManagerDBHelper.set({
            authenticatorId: KAIACCOUNT_AUTH_ID,
            accountId,
            credential: response,
            userData: null
          }, () => {
            getAccounts(
              resp => {
                console.warn(
                  '[KaiOS Account] Refresh Account Successfully.',
                  resp
                );
                onsuccess && onsuccess({ authenticated: authenticated });
              },
              err => {
                onerror && onerror(err);
              },
              true
            );
          });
        }
        emit('kaiaccount:onlogin', {
          kid: response.kid,
          mac_key: response.mac_key
        });
      };

      const errorCb = response => {
        let errorObj = getServerErrorMsg(response);
        let deleted = checkAccountDeleted(errorObj);

        if (!deleted) {
          if (response.status === 404) {
            errorObj.error = 'ACCOUNT_DOES_NOT_EXIST';
          } else if (response.status === 401) {
            errorObj.error = 'INVALID_PASSWORD';
          } else if (response.status === 424) {
            errorObj.error = 'UNVERIFIED_ACCOUNT';
          }
        }
        onerror && onerror(errorObj);
      };

      Promise.all([
        KaiAccountCryptoHelper.encryption(accountId, password),
        deviceInfoHelper.getDeviceInfo()
      ]).then(async values => {
        const token = await getRestrictedToken();
        let data = {
          grant_type: 'password',
          user_name: accountId,
          password: values[0],
          scope: "core",
          device: values[1],
          service: {
            id: KaiAccountConfig.SERVICE_ID
          },
          partner: {
            id: KaiAccountConfig.PARTNER_ID
          }
        };

        requestHelper.send(url, method, data, successCb, errorCb, token);
      });
    };

    /**
     * Obtain account information from backend
     *
     * @param {Function} onsuccess - Success callback function.
     * @param {Function} onerror - Error callback function.
     * @param {Boolean} forceFetch - Get account info from server not cache.
     */
    // eslint-disable-next-line no-unused-vars
    var getAccounts = (onsuccess, onerror, forceFetch = false) => {
      let local_onsuccess = (data) => {
        if (data && data.pending && data.pending.altPhone) {
          FxAccountsManager.checkAndNewAlarm(FxAccountsManager.nextDate());
          if (FxAccountsManager.signInTriggered) {
            FxAccountsManager.showNotification();
            FxAccountsManager.signInTriggered = false;
          }
        } else {
          FxAccountsManager.disableAlarm();
          FxAccountsManager.signInTriggered = false;
        }

        onsuccess && onsuccess(data);
      };
      verifyCredential('all').then(
        async (account) => {
          const { credential, userData } = account;
          const { url, method } = await getURL('api', 'getAccounts');
          const token = { kid: credential.kid, mac_key: credential.mac_key };

          /**
           * If user set "forceFetch" to true, we would fetch account info from
           * the server, otherwise get it from the indexed DB if it exists.
           */
          if (forceFetch || !userData) {
            const successCb = async (response) => {
              let data = await accountInfoWrapper(response);

              account.userData = data;
              AccountManagerDBHelper.set(account, () => {
                local_onsuccess(data);
              });
            };

            const errorCb = (response) => {
              if (userData) {
                console.warn('Failed to fetch from server, so get from cache.');
                local_onsuccess(userData);
              } else {
                let errorObj = getServerErrorMsg(response);
                onerror && onerror(errorObj);
              }
            };

            requestHelper.send(url, method, null, successCb, errorCb, token);
          } else {
            local_onsuccess(userData);
          }
        },
        error => {
          onerror && onerror(error);
        }
      );
    };

    /**
     * Sign out to server, destroy the validity of the credential.
     *
     * @param {Function} onsuccess - Success callback function.
     * @param {Function} onerror - Error callback function.
     */
    var logout = (onsuccess, onerror) => {
      verifyCredential().then(
        async (token) => {
          const { url, method } = await getURL('auth', 'logout');
          const successCb = () => localSignOut(onsuccess);
          const errorCb = () => {
            console.warn(
              `[KaiOS Account] Force sign out: failed to logout from server!`
            );
            localSignOut(onsuccess);
          };

          requestHelper.send(url, method, null, successCb, errorCb, token);
        },
        error => {
          onerror && onerror(error);
        }
      );
    };

    /**
     * Verify if it's the correct password of current signed in account
     *
     * @param {String} password - The password used for user authentication.
     * @param {Function} onsuccess - Success callback function.
     * @param {Function} onerror - Error callback function.
     */
    var verifyPassword = (password, onsuccess, onerror) => {
      if (!password) {
        onerror && onerror({ error: 'INVALID_PASSWORD' });
        return;
      }

      verifyCredential('info').then(
        async (user) => {
          const { accountId } = user;
          const { url, method } = await getURL('auth', 'verifyPassword');
          const token = await getRestrictedToken();

          const errorCb = (response) => {
            let errorObj = getServerErrorMsg(response);
            let deleted = checkAccountDeleted(errorObj);

            if (!deleted) {
              if (response.status === 401) {
                errorObj.error = 'INVALID_PASSWORD';
              }
            }
            onerror && onerror(errorObj);
          };

          Promise.all([
            KaiAccountCryptoHelper.encryption(accountId, password),
            deviceInfoHelper.getDeviceInfo()
          ]).then(values => {
            let data = {
              grant_type: 'password',
              user_name: accountId,
              password: values[0],
              scope: "core",
              device: values[1],
              service: {
                id: KaiAccountConfig.SERVICE_ID
              },
              partner: {
                id: KaiAccountConfig.PARTNER_ID
              }
            };

            requestHelper.send(url, method, data, onsuccess, errorCb, token);
          });
        },
        error => {
          onerror && onerror(error);
        }
      );
    };

    /**
     * Change the account password from an old one to a new one
     *
     * @param {String} oldPassword - The password at present.
     * @param {String} newPassword - The new password.
     * @param {Function} onsuccess - Success callback function.
     * @param {Function} onerror - Error callback function.
     */
    var changePassword = (oldPassword, newPassword, onsuccess, onerror) => {
      if (!oldPassword || !newPassword || oldPassword === newPassword) {
        onerror && onerror({ error: 'INVALID_PASSWORD' });
        return;
      }

      verifyCredential('all').then(
        async (account) => {
          const { credential, userData } = account;
          const { url, method } = await getURL('api', 'changePassword');
          const token = { kid: credential.kid, mac_key: credential.mac_key };
          const encrypt = KaiAccountCryptoHelper.encryption;
          let payload = {};

          if (!userData) {
            onerror && onerror({ error: 'NO_USER_DATA' });
            return;
          }

          const errorCb = response => {
            let errorObj = getServerErrorMsg(response);
            let deleted = checkAccountDeleted(errorObj);

            if (!deleted) {
              if (response.status === 401) {
                errorObj.error =  'INVALID_PASSWORD';
              }
            }
            onerror(errorObj);
          };

          return Promise.resolve().then(
            () => {
              if (userData.phone && newPassword) {
                return encrypt(userData.phone, newPassword).then(
                  phoneCredential => {
                    payload.password_phone = phoneCredential;
                  }
                );
              }
            }
          ).then(
            () => {
              if (userData.email && newPassword) {
                return encrypt(userData.email, newPassword).then(
                  emailCredential => {
                    payload.password = emailCredential;
                  }
                );
              }
            }
          ).then(
            () => {
              if (userData.phone && oldPassword) {
                return encrypt(userData.phone, oldPassword).then(
                  oldPhoneCredential => {
                    payload.old_password_phone = oldPhoneCredential;
                  }
                );
              }
            }
          ).then(
            () => {
              if (userData.email && oldPassword) {
                return encrypt(userData.email, oldPassword).then(
                  oldEmailCredential => {
                    payload.old_password = oldEmailCredential;
                  }
                );
              }
            }
          ).then(
            () => {
              requestHelper.send(
                url, method, payload, onsuccess, errorCb, token
              );
            }
          );
        },
        error => {
          onerror && onerror(error);
        }
      );
    };

    /**
     * Provide user to update their account information, including phone account,
     * email account, alternative phone number, year of birth, and gender.
     *
     * Note: No need to provide password while changing yob or gender.
     *
     * @param {String} phone - New phone number with region code.
     * @param {String} email - New email address
     * @param {String} password - Current user password
     * @param {Object} info - Including altPhone, altEmail, yob, birthday, gender
     * @param {Function} onsuccess - Success callback function
     * @param {Function} onerror - Error callback function
     */
    var updateAccount = (phone, email, password, info, onsuccess, onerror) => {
      /**
       * Password is necessary while updating phone, email, altPhone,
       * or altEmail.
       */
      if (!password &&
        (phone || email || (info && info.altPhone) || (info && info.altEmail))
      ) {
        onerror && onerror({ error: 'INVALID_OPERATION' });
        return;
      }

      verifyCredential('all').then(
        async (account) => {
          const { credential, userData } = account;
          const { url, method } = await getURL('api', 'updateAccount');
          const token = { kid: credential.kid, mac_key: credential.mac_key };
          const encrypt = KaiAccountCryptoHelper.encryption;
          let payload = {};

          const successCb = async (response) => {
            let userInfo = await accountInfoWrapper(response);
            account.userData = userInfo;
            AccountManagerDBHelper.set(account, () => {
              onsuccess && onsuccess(userInfo);
            });
          };

          const errorCb = response => {
            let errorObj = getServerErrorMsg(response);
            let deleted = checkAccountDeleted(errorObj);

            if (!deleted) {
              if (response.status === 401) {
                errorObj.error =  'INVALID_PASSWORD';
              }
            }
            onerror(errorObj);
          };

          if (phone) {
            payload.mobile_phone = phone;
          }
          if (email) {
            payload.email = email;
          }

          if (info) {
            if (info.altPhone) {
              payload.second_mobile_phone = info.altPhone;
            }
            if (info.altEmail) {
              payload.second_email = info.altEmail;
            }
            if (info.yob) {
              payload.yob = info.yob;
            }
            if (info.birthday) {
              payload.birthday = info.birthday;
            }
            if (info.gender) {
              payload.gender = info.gender;
            }
          }

          return Promise.resolve().then(
            () => {
              if (phone && password) {
                return encrypt(phone, password).then(
                  phoneCredential => {
                    payload.password_phone = phoneCredential;
                  }
                );
              }
            }
          ).then(
            () => {
              if (email && password) {
                return encrypt(email, password).then(
                  emailCredential => {
                    payload.password = emailCredential;
                  }
                );
              }
            }
          ).then(
            () => {
              if (userData.phone && password) {
                return encrypt(userData.phone, password).then(
                  oldPhoneCredential => {
                    payload.old_password_phone = oldPhoneCredential;
                  }
                );
              }
            }
          ).then(
            () => {
              if (userData.email && password) {
                return encrypt(userData.email, password).then(
                  oldEmailCredential => {
                    payload.old_password = oldEmailCredential;
                  }
                );
              }
            }
          ).then(
            () => {
              requestHelper.send(
                url, method, payload, successCb, errorCb, token
              );
            }
          );
        },
        error => {
          onerror && onerror(error);
        }
      );
    };

    /**
     * Check if the given phone number exists
     *
     * @param {String} phone - The phone number to be check.
     * @param {Function} onsuccess - Success callback function.
     * @param {Function} onerror - Error callback function.
     */
    var checkPhoneExistence = async (phone, onsuccess, onerror) => {
      if (!phone) {
        onerror && onerror({ error: 'INVALID_ACCOUNTID' });
        return;
      }
      const { url, method } = await getURL('api', 'checkPhoneExistence');
      const token = await getRestrictedToken();
      let urlWithParams = new URL(url);

      const successCb = () => {
        onsuccess && onsuccess({ registered: true });
      };
      const errorCb = (response) => {
        if (response.status == 404) {
          onsuccess && onsuccess({ registered: false });
        } else {
          let errorObj = getServerErrorMsg(response);
          onerror && onerror(errorObj);
        }
      };

      urlWithParams.searchParams.set('phone', phone);
      requestHelper.send(
        urlWithParams.href , method, null, successCb, errorCb, token
      );
    };

    /**
     * Check if the given email address exists
     *
     * @param {String} email - The email address to be check.
     * @param {Function} onsuccess - Success callback function.
     * @param {Function} onerror - Error callback function.
     */
    var checkEmailExistence = async (email, onsuccess, onerror) => {
      if (!email) {
        onerror && onerror({ error: 'INVALID_ACCOUNTID' });
        return;
      }

      const { url, method } = await getURL('api', 'checkEmailExistence');
      const token = await getRestrictedToken();
      let urlWithParams = new URL(url);

      const successCb = () => {
        onsuccess && onsuccess({ registered: true });
      };
      const errorCb = (response) => {
        if (response.status === 404) {
          onsuccess && onsuccess({ registered: false });
        } else {
          let errorObj = getServerErrorMsg(response);
          onerror && onerror(errorObj);
        }
      };

      urlWithParams.searchParams.set('email', email);
      requestHelper.send(
        urlWithParams.href , method, null, successCb, errorCb, token
      );
    };

    /**
     * Request server for email verification that sending activation link
     * by email.
     *
     * @param {String} email - The email address to be sent.
     * @param {String} uid - The unique id of account.
     * @param {Function} onsuccess - Success callback function.
     * @param {Function} onerror - Error callback function.
     */
    var requestEmailVerification = async (email, uid, onsuccess, onerror) => {
      const { url, method } = await getURL('api', 'requestEmailVerification');
      const token = await getRestrictedToken();
      const payload = { uid, target: email };
      let urlWithParams = new URL(url);

      if (!email) {
        onerror && onerror({ error: 'INVALID_ACCOUNTID' });
        return;
      }

      const successCb = (response) => {
        if (!response || !response.id) {
          onerror && onerror({ error: 'INTERNAL_ERROR_INVALID_USER' });
        }
        onsuccess && onsuccess({ verificationId: response.id });
      };
      const errorCb = (response) => {
        let errorObj = getServerErrorMsg(response);

        if (response.status === 404) {
          errorObj.error = 'ACCOUNT_DOES_NOT_EXIST';
        } else if (response.status === 409) {
          errorObj.error = 'ALREADY_VERIFIED';
        }
        onerror && onerror(errorObj);
      };

      urlWithParams.searchParams.set('otp', false);
      urlWithParams.searchParams.set('link', true);
      requestHelper.send(
        urlWithParams.href, method, payload, successCb, errorCb, token
      );
    };

    /**
     * Request server for phone verification that sending OTP by SMS.
     *
     * @param {String} phone - The phone number to be sent.
     * @param {String} uid - The unique id of account.
     * @param {Function} onsuccess - Success callback function.
     * @param {Function} onerror - Error callback function.
     */
    var requestPhoneVerification = async (phone, uid, onsuccess, onerror) => {
      const { url, method } = await getURL('api', 'requestPhoneVerification');
      const token = await getRestrictedToken();
      const payload = { uid, target: phone };
      let urlWithParams = new URL(url);

      if (!phone) {
        onerror && onerror({ error: 'INVALID_ACCOUNTID' });
        return;
      }

      const successCb = (response) => {
        if (!response || !response.id) {
          onerror && onerror({ error: 'INTERNAL_ERROR_INVALID_USER' });
        }
        onsuccess && onsuccess({ verificationId: response.id });
      };
      const errorCb = (response) => {
        let errorObj = getServerErrorMsg(response);

        if (response.status === 404) {
          errorObj.error = 'ACCOUNT_DOES_NOT_EXIST';
        } else if (response.status === 409) {
          errorObj.error = 'ALREADY_VERIFIED';
        }
        onerror && onerror(errorObj);
      };

      urlWithParams.searchParams.set('otp', true);
      urlWithParams.searchParams.set('link', false);
      requestHelper.send(
        urlWithParams.href, method, payload, successCb, errorCb, token
      );
    };

    /**
     * Resolve the phone verification by OTP code
     *
     * @param {String} phone - The phone number to be sent.
     * @param {String} uid - The unique ID of account.
     * @param {String} verificationId - The verification ID given by server
     * @param {String} code - The 4 digital OTP code.
     * @param {Function} onsuccess - Success callback function.
     * @param {Function} onerror - Error callback function.
     */
    var resolvePhoneVerification = async (
      phone, uid, verificationId, code, onsuccess, onerror
    ) => {
      const { url, method } = await getURL('api', 'resolvePhoneVerification');
      const token = await getRestrictedToken();
      const payload = { uid, id: verificationId, target: phone, code };

      if (!phone) {
        onerror && onerror({ error: 'INVALID_ACCOUNTID' });
        return;
      }

      const successCb = (response) => {
        // We update account info only when it's signed in.
        if (FMDManager.isAntitheftLoggedIn) {
          getAccounts(
            resp => {
              console.warn(
                '[KaiOS Account] Refresh Account Successfully.',
                resp
              );
              onsuccess && onsuccess(response);
            },
            () => {
              onsuccess && onsuccess(response);
            },
            true
          );
        } else {
          onsuccess && onsuccess(response);
        }
      };

      const errorCb = (response) => {
        let errorObj = getServerErrorMsg(response);

        if (response.status === 403) {
          errorObj.error = 'INVALID_VERIFICATION_CODE';
        }
        onerror && onerror(errorObj);
      };

      requestHelper.send(
        url + verificationId, method, payload, successCb, errorCb, token
      );
    };

    /**
     * Register an account with phone number, email address, password and info.
     *
     * @param {String} phone - The phone number as account's ID.
     * @param {String} email - The email address as account's ID.
     * @param {String} password - The password used for user authentication.
     * @param {Object} info - The account information.
     * @param {Function} onsuccess - Success callback function.
     * @param {Function} onerror - Error callback function.
     */
    var signUp = async (phone, email, password, info, onsuccess, onerror) => {
      if (!phone) {
        onerror && onerror({ error: 'INVALID_ACCOUNTID' });
        return;
      }
      if (!password) {
        onerror && onerror({ error: 'INVALID_PASSWORD' });
        return;
      }

      const { url, method } = await getURL('api', 'signUp');
      const token = await getRestrictedToken();
      const encrypt = KaiAccountCryptoHelper.encryption;
      let payload = {};

      const successCb = (response) => {
        if (!response || !response.id) {
          onerror && onerror({ error: 'INTERNAL_ERROR_INVALID_USER' });
        }
        onsuccess && onsuccess({
          accountCreated: true,
          uid: response.id
        });
      };
      const errorCb = (response) => {
        let errorObj = getServerErrorMsg(response);
        onerror && onerror(errorObj);
      };

      if (info) {
        if (info.altPhone) {
          payload.second_mobile_phone = info.altPhone;
        }
        if (info.altEmail) {
          payload.second_email = info.altEmail;
        }
        if (info.yob) {
          payload.yob = info.yob;
        }
        if (info.birthday) {
          payload.birthday = info.birthday;
        }
        if (info.gender) {
          payload.gender = info.gender;
        }
      }

      return Promise.resolve().then(
        () => {
          if (phone) {
            return encrypt(phone, password).then(
              phoneCredential => {
                payload.mobile_phone = phone;
                payload.password_phone = phoneCredential;
              }
            );
          }
        }
      ).then(
        () => {
          if (email) {
            return encrypt(email, password).then(
              emailCredential => {
                payload.email = email;
                payload.password = emailCredential;
              }
            );
          }
        }
      ).then(
        () => {
          requestHelper.send(
            url, method, payload, successCb, errorCb, token
          );
        }
      );
    };

    /**
     * Delete the account from server.
     * Note: UX spec has removed this feature from device-side.
     *
     * @param {Function} onsuccess - Success callback function.
     * @param {Function} onerror - Error callback function.
     */
    var deleteAccount = (onsuccess, onerror) => {
      verifyCredential().then(
        async (token) => {
          const { url, method } = await getURL('api', 'deleteAccount');
          const successCb = () => localSignOut(onsuccess);
          const errorCb = (response) => {
            let errorObj = getServerErrorMsg(response);
            onerror && onerror(errorObj);
          };

          requestHelper.send(
            url, method, null, successCb, errorCb, token
          );
        },
        error => {
          onerror && onerror(error);
        }
      );
    };

    /**
     * Refresh credential by exchanging an expired one
     *
     */
    var refreshToken = async () => {
      const account = await getKaiAccountFromDB();
      const { credential } = account;
      const { url, method } = await getURL('auth', 'refreshToken');
      const token = { kid: credential.kid, mac_key: credential.mac_key };
      const payload = {
        grant_type: "refresh_token",
        scope: "core",
        refresh_token: credential.refresh_token
      };

      return new Promise((resolve, reject) => {
        const successCb = (newCred) => {
          newCred.expire_timestamp = Date.now() + newCred.expires_in * 1000;
          account.credential = newCred;
          AccountManagerDBHelper.set(account, () => { resolve(account); });
        };
        const errorCb = (response) => {
          console.error('[KaiOS Account] Failed to refresh token: ', response);

          let errorObj = getServerErrorMsg(response);

          switch (response.status) {
            case 401:
            case 403:
              if (errorObj.error === 'SERVER_ERROR') {
                errorObj.error = 'INVALID_AUTH_TOKEN';
              }
              localSignOut();
              break;
            case 404:
              if (errorObj.error === 'SERVER_ERROR') {
                errorObj.error = 'ACCOUNT_DOES_NOT_EXIST';
              }
              localSignOut();
              break;
            default:
              break;
          }
          reject(errorObj);
        };

        requestHelper.send(url, method, payload, successCb, errorCb, token);
      });
    };

    return {
      'changePassword': changePassword,
      'checkEmailExistence': checkEmailExistence,
      'checkPhoneExistence': checkPhoneExistence,
      'deleteAccount': deleteAccount,
      'getAccounts': getAccounts,
      'logout': logout,
      'requestEmailVerification': requestEmailVerification,
      'requestPhoneVerification': requestPhoneVerification,
      'resolvePhoneVerification': resolvePhoneVerification,
      'signIn': signIn,
      'signUp': signUp,
      'updateAccount': updateAccount,
      'verifyPassword': verifyPassword,
      'refreshToken': refreshToken,
      'getRestrictedToken': getRestrictedToken,
      'verifyCredential': verifyCredential,
    };
  }();

  // XXX: Would change the exporting name to KaiAccountsClients in the future.
  exports.FxAccountsClient = KaiAccountsClient;
}(window));
