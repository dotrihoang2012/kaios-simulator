/* global AccountManagerConstants, AccountManagerCryptoHelper,
   AccountManagerDBHelper, FxAccountsClient, FxAccountsUI*/
'use strict';

(function (exports) {

  /**
   * KaiAccount data format saved in DB.
   *
   * {
   *   authenticatorId: "kaiaccount",
   *   accountId: "xxx.oo@kaiostech.com",
   *   credential: {
   *     refresh_token: "...",
   *     token_type: "hawk",
   *     scope: "...",
   *     expires_in: 604800,
   *     expire_timestamp: 1601017563965,
   *     kid: "XXXXXLLSqtvzdSpnEpwamCXXXXX=",
   *     mac_key: "XXXXX4gsZYrxM4cggWI6jMzoqPY+FA0cPoOgcnxxxxx=",
   *     mac_algorithm: "hmac-sha-256",
   *     email_is_valid: true
   *   },
   *   userData: {
   *     uid: "xxxxxi4lN9e3W_JtLjhDYfiXp1K0So6mqAOxxxxx",
   *     phone: "+886915200987",
   *     email: "xxx.oo@kaiostech.com",
   *     altPhone: null,
   *     altEmail: null,
   *     pending: {
   *       phone: null,
   *       email: null,
   *       altPhone: "+886912345678",
   *       altEmail: null
   *     },
   *     yob: 1984,
   *     birthday: null,
   *     gender: "male",
   *     accountId: "xxx.oo@kaiostech.com"
   *   }
   * }
   */
  const getKaiAccountFromDB = () => {
    return new Promise(resolve => {
      AccountManagerDBHelper.get(
        { authenticatorId: 'kaiaccount' },
        account => resolve(account)
      );
    });
  };

  const KaiAccountAuthenticator = {
    /**
     * new WebActivity('account-manager', {
     *   authenticatorId: 'kaiaccount',
     *   action: 'showLoginPage',
     *   extraInfo: {
     *     loginType: 'email',
     *   },
     *   publicKey: exportedKey,
     * });
     */
    login: (activityData) => {
      const {
        activityHandlerId,
        source: {
          data: { extraInfo, publicKey }
        },
      } = activityData;
      let method = 'phoneNumberLogin';

      // Callback Functions
      const successCb = (activityResult) => {
        const result = { activityHandlerId, activityResult, publicKey };
        AccountManagerCryptoHelper.postActivityResult(result);
      };
      const errorCb = (activityResult) => {
        const isError = true;
        const result = { activityHandlerId, activityResult, isError };

        AccountManagerCryptoHelper.postActivityResult(result);
      };

      if (extraInfo.loginType === 'email') {
        method = 'login';
      }

      FxAccountsUI[method](successCb, errorCb);
    },

    /**
     * new WebActivity('account-manager', {
     *   account: { authenticatorId: 'kaiaccount' },
     *   action: 'revokeCredential',
     *   publicKey: exportedKey,
     * });
     */
    logout: async (activityData) => {
      const {
        activityHandlerId,
        source: {
          data: { publicKey }
        }
      } = activityData;
      const account = await getKaiAccountFromDB();
      const accountInfo = {};

      // Callback Functions
      const successCb = (activityResult) => {
        const result = { activityHandlerId, activityResult, publicKey };

        AccountManagerCryptoHelper.postActivityResult(result);
      };
      const errorCb = (activityResult) => {
        const isError = true;
        const result = { activityHandlerId, activityResult, isError };

        AccountManagerCryptoHelper.postActivityResult(result);
      };

      if (account.accountId.indexOf('@') > 0) {
        accountInfo.email = account.accountId;
      } else {
        accountInfo.phone = account.accountId;
      }

      FxAccountsUI.signOut(accountInfo, successCb, errorCb);
    },

    /**
     * new WebActivity('account-manager', {
     *   authenticatorId: 'kaiaccount',
     *   action: 'showOtherPage',
     *   flow: 'changePassword|checkPassword|createAccount|editPersonalInfo|
     *          verifyAltPhone',
     *   args: [ argv1, argv2, ... ],
     *   publicKey: exportedKey,
     * });
     *
     * - Change Password
     * data: {
     *   authenticatorId: 'kaiaccount',
     *   action: 'showOtherPage',
     *   flow: 'changePassword',
     *   publicKey: exportedKey,
     * }
     *
     * - Check Password and Update Account Information
     * data: {
     *   authenticatorId: 'kaiaccount',
     *   action: 'showOtherPage',
     *   flow: 'checkPassword',
     *   args: [ ${accountData}, 'email|phone|altPhone|deleteAccount' ],
     *   publicKey: exportedKey,
     * }
     *
     * - Create Account
     * data: {
     *   authenticatorId: 'kaiaccount',
     *   action: 'showOtherPage',
     *   flow: 'createAccount',
     *   publicKey: exportedKey,
     * }
     *
     * - Edit Personal Information (year of birth / gender)
     * data: {
     *   authenticatorId: 'kaiaccount',
     *   action: 'showOtherPage',
     *   flow: 'editPersonalInfo',
     *   args: [ ${accountData} ],
     *   publicKey: exportedKey,
     * }
     *
     * - Verify Alternative Phone
     * data: {
     *   authenticatorId: 'kaiaccount',
     *   action: 'showOtherPage',
     *   flow: 'verifyAltPhone',
     *   args: [ ${altPhone}, ${uid}, ${verificationId} ],
     *   publicKey: exportedKey,
     * }
     */
    openFlow: (activityData) => {
      const {
        activityHandlerId,
        source: {
          data: { flow, args, publicKey }
        },
      } = activityData;
      const supportedFlows = [
        'changePassword',
        'checkPassword',
        'createAccount',
        'editPersonalInfo',
        'verifyAltPhone'
      ];

      if (supportedFlows.includes(flow)) {
        const successCb = (activityResult) => {
          const result = { activityHandlerId, activityResult, publicKey };

          AccountManagerCryptoHelper.postActivityResult(result);
        };
        const errorCb = (activityResult) => {
          const isError = true;
          const result = { activityHandlerId, activityResult, isError };

          AccountManagerCryptoHelper.postActivityResult(result);
        };
        FxAccountsUI[flow](...(args||[]), successCb, errorCb);
      } else {
        const result = {
          activityHandlerId,
          activityResult:
            AccountManagerConstants.RETURN_MESSAGES.OPEN_PAGE_FAILED,
          isError: true,
        };
        AccountManagerCryptoHelper.postActivityResult(result);
      }
    },

    /**
     * new WebActivity('account-manager', {
     *   authenticatorId: 'kaiaccount',
     *   action: 'sendRequest',
     *   command: 'requestPhoneVerification|requestEmailVerification',
     *   args: [ 'phone|email', 'userData.uid' ],
     *   publicKey: exportedKey,
     * });
     */
    requestServer: (activityData) => {
      const {
        activityHandlerId,
        source: {
          data: { command, args, publicKey }
        },
      } = activityData;

      const supportedCommands = [
        'requestPhoneVerification',
        'requestEmailVerification',
      ];

      if (supportedCommands.includes(command)) {
        const successCb = (activityResult) => {
          const result = { activityHandlerId, activityResult, publicKey };

          AccountManagerCryptoHelper.postActivityResult(result);
        };
        const errorCb = (resultObject) => {
          const activityResult =
            resultObject.error || JSON.stringify(resultObject);
          const isError = true;
          const result = { activityHandlerId, activityResult, isError };

          AccountManagerCryptoHelper.postActivityResult(result);
        };
        FxAccountsClient[command](...(args||[]), successCb, errorCb);
      } else {
        const result = {
          activityHandlerId,
          activityResult:
            AccountManagerConstants.RETURN_MESSAGES.SEND_REQUEST_FAILED,
          isError: true,
        };
        AccountManagerCryptoHelper.postActivityResult(result);
      }
    }
  };

  exports.KaiAccountAuthenticator = KaiAccountAuthenticator;
}(window));
