import './mocks/SettingsObserver.js';
import './mocks/asyncStorage.js';
import './mocks/navigator/authorizationManager.js';

require('../js/browser_utils.js');

describe('Browser_utils', () => {
  test('getDeviceInfo', () => {
    const results = {
      'cu': '',
      'platform_build_id': '',
      'build_number': '',
      'os': 'unknown',
      'hardware': 'unknown',
      'software': 'unknown',
      'product_model': '',
      'platform_version': '',
    }

    return BrowserUtils.getDeviceInfo().then((_results) => {
      expect(_results).toEqual(results);
    });
  });

  test('getRestrictedToken', () => {
    return BrowserUtils.getRestrictedToken().then((token) => {
      expect(token.tokenExpirationDate).not.toBeUndefined();
    })
  });

  test('generateURL', () => {
    const url = 'https://www.test.com';
    const apiName = '/apps';
    const params = { 'os': '3.0_{d244613}' };
    expect(BrowserUtils.generateURL(url, apiName, params)).toBe('https://www.test.com/apps?os=3.0_{d244613}');
  });
})
