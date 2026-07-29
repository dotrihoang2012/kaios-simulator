/* global KaiAccountConfig, KaiAccountDeviceInfoHelper,
   KaiAccountSettingsHelper, Requester */
'use strict';

(function (exports) {

  var KaiAccountServerRequestHelper = function KaiAccountServerRequestHelper() {
    const _hawkRequester = new Requester();
    let DEBUG = true;

    const dump = function (...args) {
      DEBUG && console.log('[DEBUG][KaiAccountServerRequestHelper]', ...args);
    };

    const sendHawkRueqest = async function (
      url, method, params, successCb, errorCb, token = null
    ) {
      const payload = { url, method, params };
      const deviceInfo = await getDeviceInfo();

      if (token) {
        _hawkRequester.setHawkCredentials(token.kid, token.mac_key);
      } else {
        _hawkRequester._hawkCredentials = null;
      }

      _hawkRequester.setDeviceInfo(deviceInfo);
      _hawkRequester.send(payload).then(
        response => {
          let obj = null;

          try {
            obj = response && JSON.parse(response);
          } catch (e) {
            console.warn(e);
          }
          dump(`[${method}]${url}: ${JSON.stringify(obj)}`);
          successCb && successCb(obj);
        },
        error => {
          console.error(`[${method}]${url}: ${JSON.stringify(error)}`);
          errorCb && errorCb(error);
        }
      );
    };

    const getHostConfig = async function () {
      const config = await KaiAccountSettingsHelper
        .getValues(KaiAccountConfig.API_PREFIX);
      let result = {
        API_HOST: 'identity.kaiaccounts.api.uri',
        AUTH_HOST: 'identity.kaiaccounts.auth.uri',
        API_RES: 'identity.kaiaccounts.api.resources.core',
        AUTH_RES: 'identity.kaiaccounts.auth.resources.oauth2'
      };

      for (let key in result) {
        result[key] = config[result[key]];
      }
      return result;
    }

    const getDeviceInfo = async function() {
      const buildInfo = await Promise.all([
        KaiAccountSettingsHelper.getValue('deviceinfo.platform_build_id'),
        KaiAccountSettingsHelper.getValue('deviceinfo.build_number')
      ]);

      return {
        ct: KaiAccountDeviceInfoHelper.getConnectionType(),
        utc: KaiAccountDeviceInfoHelper.getTimeStamp(),
        utcOff: KaiAccountDeviceInfoHelper.getTimeZoneOffset(),
        buildID: buildInfo[0],
        buildNumber: buildInfo[1],
      };
    };

    return {
      'getHostConfig': getHostConfig,
      'send': sendHawkRueqest
    };
  }();

  exports.KaiAccountServerRequestHelper = KaiAccountServerRequestHelper;
}(window));
