import Requester from 'hawk-requester';
global.Requester = Requester;

describe('<server_request_helper.js> test', () => {
  beforeAll((done) => {
    require('../mocks/SettingsObserver');
    require('../../js/kaiaccount/constant');
    require('../../js/kaiaccount/settings_helper');
    require('../../js/kaiaccount/device_info_helper');
    require('../../js/kaiaccount/server_request_helper');
    done();
  });

  test('KaiAccountServerRequestHelper test', (done) => {
    expect(typeof KaiAccountServerRequestHelper).toBe('object');
    done();
  });

  test('getHostConfig function test', async (done) => {
    const {
      getHostConfig
    } = KaiAccountServerRequestHelper;

    jest
      .spyOn(KaiAccountSettingsHelper, 'getValues')
      .mockResolvedValue({
        'identity.kaiaccounts.api.uri': 'https://api.kaiostech.com',
        'identity.kaiaccounts.api.resources.core': '/core/v3.0',
        'identity.kaiaccounts.auth.uri': 'https://auth.kaiostech.com',
        'identity.kaiaccounts.auth.resources.oauth2': '/oauth2/v1.0'
      });

    const value = await getHostConfig();

    expect(value).toEqual({
      "API_HOST": "https://api.kaiostech.com",
      "API_RES": "/core/v3.0",
      "AUTH_HOST": "https://auth.kaiostech.com",
      "AUTH_RES": "/oauth2/v1.0"
    });
    done();
  });

  test('send function test', async (done) => {
    const {
      send
    } = KaiAccountServerRequestHelper;

    jest
      .spyOn(KaiAccountSettingsHelper, 'getValue')
      .mockResolvedValueOnce('20200819223308')
      .mockResolvedValueOnce('58')
      .mockResolvedValue('xxxxx');

    jest
      .spyOn(KaiAccountDeviceInfoHelper, 'getTimeStamp')
      .mockResolvedValue('2020-12-22T00:00:00:+00:00');

    jest
      .spyOn(KaiAccountDeviceInfoHelper, 'getTimeZoneOffset')
      .mockResolvedValue(8);

    jest
      .spyOn(KaiAccountDeviceInfoHelper, 'getConnectionType')
      .mockResolvedValue('wifi');

    jest
      .spyOn(Requester.prototype, 'send')
      .mockResolvedValueOnce(
        '{"test":"kaios"}'
      );

    const successCb = jest.fn();
    const errorCb = jest.fn();

    //resolved
    await send('https://api.kaiostech.com', 'GET', {
      a: 'test'
    }, successCb, errorCb);

    expect(successCb).toBeCalledTimes(1);
    expect(errorCb).toBeCalledTimes(0);
    expect(successCb.mock.calls[0][0]).toEqual({
      'test': 'kaios'
    });

    //rejected
    const errorSpy = jest.spyOn(console, 'error');
    jest
      .spyOn(Requester.prototype, 'send')
      .mockRejectedValueOnce(
        'error'
      );

    await send('https://api.kaiostech.com', 'GET', {
      a: 'test'
    }, successCb, errorCb);

    expect(errorCb).toBeCalledTimes(1);
    expect(errorSpy).toBeCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toEqual(
      '[GET]https://api.kaiostech.com: \"error\"'
    );
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});