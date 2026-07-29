'use strict';

(function (exports) {

  const config = {
    // Record account login type into asyncstorage
    LOGIN_TYPE_KEY: 'kaiaccount.loginType',
    LOGIN_TYPE: {
      EMAIL: 'EMAIL',
      PHONE: 'PHONE'
    },

    /**
     * Get API prefix from settings or prefs, use default value if we get "",
     * undefined, or null
     **/
    API_PREFIX: {
    'identity.kaiaccounts.api.uri': 'https://api.kaiostech.com',
    'identity.kaiaccounts.api.resources.core': '/core/v3.0',
    'identity.kaiaccounts.auth.uri': 'https://auth.kaiostech.com',
    'identity.kaiaccounts.auth.resources.oauth2': '/oauth2/v1.0'
    },

    SERVICE_ID: 'lr9Cts0RhbaNRJ5i_gKf',
    PARTNER_ID: 'ddsMreKpOJixSvYF5cvz'
  };

  exports.KaiAccountConfig = config;
}(window));
