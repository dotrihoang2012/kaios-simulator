describe('<device_info_helper.js> test', () => {
  beforeAll((done) => {
    require('../mocks/SettingsObserver');
    require('../mocks/navigator/mock_connection');
    require('../mocks/navigator/mobileConnections');
    require('../mocks/DeviceCapabilityManager');
    require('../../js/kaiaccount/device_info_helper');
    done();
  });

  beforeEach((done) => {
    const DateReal = global.Date;
    const mockDate = new Date('2020-12-12T00:00:00.000Z');
    jest
      .spyOn(global, 'Date')
      .mockImplementation((...args) => {
        if (args.length) {
          return new DateReal(...args);
        }
        return mockDate;
      });
    done();
  });

  test('KaiAccountDeviceInfoHelper test', (done) => {
    expect(typeof KaiAccountDeviceInfoHelper).toBe('object');
    done();
  });

  test(' getConnectionType function test', (done) => {
    const {
      getConnectionType
    } = KaiAccountDeviceInfoHelper;

    expect(getConnectionType()).toBe('wifi');
    done();
  });

  test('getIMEI function test', (done) => {
    const {
      getIMEI
    } = KaiAccountDeviceInfoHelper;

    jest
      .spyOn(navigator.b2g.mobileConnections[0], 'getDeviceIdentities')
      .mockReturnValueOnce({
        imei: ''
      });

    expect(getIMEI()).toBe('365882355764838');
    done();
  });

  test('getDeviceInfo function test', async (done) => {
    const {
      getDeviceInfo
    } = KaiAccountDeviceInfoHelper;

    jest
      .spyOn(navigator.b2g.mobileConnections[0], 'getDeviceIdentities')
      .mockReturnValue({
        imei: ''
      });

    jest
      .spyOn(DeviceCapabilityManager, 'get')
      .mockResolvedValue('feature_phone, phone,  tablet');

    jest
      .spyOn(window.navigator, 'language', 'get')
      .mockReturnValue('zh-CN');

    const value = getDeviceInfo();

    await expect(value).resolves.toEqual({
      brand: 'feature_phone, phone,  tablet',
      build_id: '20200819223308',
      device_id: '365882355764838',
      device_type: 1000,
      lang: 'zh-CN',
      model: 'feature_phone, phone,  tablet',
      os: 'B2GOS',
      os_version: '3.0',
      reference: '4044O-2BAQUS1-R',
      uuid: 'e150504f-456a-4fac-8548-9d9eaf7c20d2'
    });
    done();
  });

  test('getSettingsValue function test', async (done) => {
    const {
      getSettingsValue
    } = KaiAccountDeviceInfoHelper;

    jest
      .spyOn(SettingsObserver, 'getValue')
      .mockResolvedValueOnce(undefined);

    const value = getSettingsValue('key', 'test');

    await expect(value).resolves.toEqual('test');
    done();
  });

  test('getTimeZoneOffset function test', (done) => {
    const {
      getTimeZoneOffset
    } = KaiAccountDeviceInfoHelper;

    const value = getTimeZoneOffset();

    expect(value).toBeLessThanOrEqual(12);
    done();
  });

  test('getTimeStamp function test', (done) => {
    const {
      getTimeStamp
    } = KaiAccountDeviceInfoHelper;

    const value = getTimeStamp();

    expect(value).toMatch(/2020-12-1/);
    expect(value.length).toBe(26);
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});
