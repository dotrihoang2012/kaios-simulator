/* global lib_apps, FxAccountsClient */

'use strict';

(function (exports) {
  const { TokenProviderBase, TokenType } = lib_apps;

  class TokenProvider extends TokenProviderBase {
    constructor(service, session) {
      super(service.id, session);
    }

    display() {
      return "TokenProvider";
    }

    async getToken(tokenTypeObj) {
      const { tokenType } = tokenTypeObj;
      let token = null;

      if (tokenType === TokenType.ACCOUNT) {
        try {
          token = await FxAccountsClient.verifyCredential();
          console.warn('system::apps_service::getAccountToken', token);
        } catch (err) {
          console.error('system::apps_service::Fail to get account token', err);
          token = await FxAccountsClient.getRestrictedToken();
          console.warn('system::apps_service::getRestrictedToken', token);
        }
      } else if (tokenType === TokenType.RESTRICTED) {
        token = await FxAccountsClient.getRestrictedToken();
        console.warn('system::apps_service::getRestrictedToken', token);
      }

      if (token) {
        return Promise.resolve({
          keyId: token.kid,
          macKey: token.mac_key,
          tokenType: tokenTypeObj,
        });
      } else {
        return Promise.reject();
      }
    }
  }

  exports.TokenProvider = TokenProvider;
}(window));