/* exported AccountManagerConstants */

'use strict';

(function (exports) {
  const AccountManagerConstants = {
    ACTIONS: {
      GET_ACCOUNTS: 'getAccounts',
      SHOW_LOGIN_PAGE: 'showLoginPage',
      SHOW_OTHER_PAGE: 'showOtherPage',
      GET_CREDENTIAL: 'getCredential',
      REFRESH_CREDENTIAL: 'refreshCredential',
      REVOKE_CREDENTIAL: 'revokeCredential',
      SEND_REQUEST: 'sendRequest',
    },

    RETURN_MESSAGES: {
      NO_NETWORK: 'no network',

      UNKNOWN_AUTHENTICATOR_ID: 'unknown authenticator id',

      LOGIN_INTERRUPTED: 'login interrupted',
      MISMATCH_STATE: 'mismatch state',
      ACCESS_DENIED: 'access denied',
      INVALID_GRANT: 'invalid grant',
      OAUTH2_DEFAULT_ERROR: 'oauth2 default error',
      TIMEOUT: 'timeout',
      TOKEN_REDEMPTION_FAILED: 'token redemption failed',
      BADLY_FORMED_JSON_RESPONSE: 'badly formed JSON response',
      GET_ACCOUNT_INFO_FAILED: 'get account info failed',

      INVALID_ACCOUNT: 'invalid account',

      SUCCESSFUL_RESPONSE: 'OK',

      INVALID_CREDENTIAL: 'invalid credential',
      INCORRECT_PASSWORD: 'incorrect password',
      SERVER_ERROR: 'server error',
      REFRESH_CREDENTIAL_FAILED: 'refresh credential failed',

      REVOKE_CREDENTIAL_FAILED: 'revoke credential failed',

      METHOD_NOT_FOUND: 'method not found',
      OPEN_PAGE_FAILED: 'flow not supported',
      SEND_REQUEST_FAILED: 'command not supported',
    },

    ACCOUNT_LIST_VISIBILITY: {
      google: ['authenticatorId', 'accountId', 'userData'],
      activesync: ['authenticatorId', 'accountId', 'userData'],
      kaiaccount: ['authenticatorId', 'accountId', 'userData'],
    },

    CREDENTIAL_VISIBILITY: {
      google: ['access_token', 'token_type', 'expire_timestamp'],
      activesync: ['username', 'password', 'configInfo'],
      kaiaccount: ['kid', 'mac_key', 'token_type', 'expire_timestamp'],
    },

    CRYPTO_ALGORITHM: {
      SYMMETRIC_ALGORITHM_NAME: 'AES-GCM',
      ASYMMETRIC_ALGORITHM_NAME: 'RSA-OAEP',
    },
  };

  exports.AccountManagerConstants = AccountManagerConstants;
})(window);
