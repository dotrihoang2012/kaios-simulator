describe('<airplane_mode_service_helper.js> test', () => {
  const {
    mockB2gNavigator
  } = require('./mocks/navigator/b2g_navigator_mock');
  beforeAll((done) => {
    window.navigator.b2g = {};
    require('./mocks/navigator/bluetooth');
    require('./mocks/service');
    require('./mocks/SettingsObserver');
    require('./mocks/DeviceCapabilityManager');
    require('../js/base_module');
    done();
  });

  let airplaneModeServiceHelper;
  beforeEach((done) => {
    require('../js/airplane_mode_service_helper');
    airplaneModeServiceHelper = new AirplaneModeServiceHelper();
    done();
  });

  test('_observe_ril.ims.enabled function test', (done) => {
    airplaneModeServiceHelper['_observe_ril.ims.enabled']('test');
    expect(Service.request).toHaveBeenCalledTimes(1);
    expect(Service.request.mock.calls[0][1]).toEqual({
      'ril.ims.suspended': false
    });
    done();
  });

  test('_observe_bluetooth.enabled function test', (done) => {
    airplaneModeServiceHelper['_observe_bluetooth.enabled']('test');
    expect(Service.request).toHaveBeenCalledTimes(1);
    expect(Service.request.mock.calls[0][1]).toEqual({
      'bluetooth.suspended': false
    });
    done();
  });

  test('_observe_wifi.enabled function test', (done) => {
    airplaneModeServiceHelper['_observe_wifi.enabled']('test');
    expect(Service.request).toHaveBeenCalledTimes(1);
    expect(Service.request.mock.calls[0][1]).toEqual({
      'wifi.suspended': false
    });
    done();
  });

  test('_observe_nfc.enabled function test', (done) => {
    airplaneModeServiceHelper['_observe_nfc.enabled']('test');
    expect(Service.request).toHaveBeenCalledTimes(1);
    expect(Service.request.mock.calls[0][1]).toEqual({
      'nfc.suspended': false
    });
    done();
  });

  test('isEnabled function test', (done) => {
    airplaneModeServiceHelper._observeSettings();
    airplaneModeServiceHelper.observe('wifi.enabled', true);

    const value = airplaneModeServiceHelper.isEnabled('wifi');
    expect(value).toBe(true);
    done();
  });

  test('isSuspended function test', (done) => {
    airplaneModeServiceHelper._observeSettings();
    airplaneModeServiceHelper.observe('bluetooth.suspended', true);

    const value = airplaneModeServiceHelper.isSuspended('bluetooth');
    expect(value).toBe(true);
    done();
  });

  test(" if  'ril.dsds.ims' === key', test _suspend function ", (done) => {
    airplaneModeServiceHelper._settings = {};
    airplaneModeServiceHelper.observe('ril.dsds.ims.enabled', true);

    airplaneModeServiceHelper._suspend('ril.dsds.ims');
    expect(Service.request).toHaveBeenCalledTimes(2);
    expect(Service.request.mock.calls[0][1]).toEqual({
      'ril.dsds.ims.suspended': true
    });
    expect(Service.request.mock.calls[1][1]).toEqual({
      'ril.dsds.ims.enabled': [false, false]
    });
    done();
  });

  test('if values[i] == true,  _observe_ril.dsds.ims.enabled function test', (done) => {
    airplaneModeServiceHelper._settings = {};
    airplaneModeServiceHelper.observe('ril.dsds.ims.suspended', true);

    airplaneModeServiceHelper['_observe_ril.dsds.ims.enabled'](['test1', 'test2']);
    expect(Service.request).toHaveBeenCalledTimes(1);
    expect(Service.request.mock.calls[0][1]).toEqual({
      'ril.dsds.ims.suspended': [false, false]
    });
    done();
  });

  test('if values[i] == false,  _observe_ril.dsds.ims.enabled function test', (done) => {
    airplaneModeServiceHelper._settings = {};
    airplaneModeServiceHelper.observe('ril.dsds.ims.suspended', {
      0: 'test1',
      1: 'test2'
    });

    airplaneModeServiceHelper['_observe_ril.dsds.ims.enabled'](['', '']);
    expect(Service.request).toHaveBeenCalledTimes(1);
    expect(Service.request.mock.calls[0][1]).toEqual({
      'ril.dsds.ims.suspended': ['test1', 'test2']
    });
    done();
  });

  test(" if  'ril.dsds.ims' === key',  _restore function test", (done) => {
    const spy = jest.spyOn(airplaneModeServiceHelper, 'writeSetting').mockImplementation();
    airplaneModeServiceHelper._settings = {};
    airplaneModeServiceHelper.observe('ril.dsds.ims.enabled', ['testEnabled1', 'testEnabled2']);
    airplaneModeServiceHelper.observe('ril.dsds.ims.suspended', ['testSuspended1', 'testSuspended2']);

    airplaneModeServiceHelper._restore('ril.dsds.ims');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0]).toEqual({
      'ril.dsds.ims.suspended': [false, false]
    });
    expect(spy.mock.calls[1][0]).toEqual({
      'ril.dsds.ims.enabled': [true, true]
    });
    done();
  });

  test(" if  'ril.dsds.ims' !== key',  _restore function test", (done) => {
    const spy = jest.spyOn(airplaneModeServiceHelper, 'writeSetting').mockImplementation();
    airplaneModeServiceHelper._settings = {};
    airplaneModeServiceHelper.observe('ril.ims.enabled', ['testEnabled1', 'testEnabled2']);
    airplaneModeServiceHelper.observe('ril.ims.suspended', ['testSuspended1', 'testSuspended2']);

    airplaneModeServiceHelper._restore('ril.ims');
    expect(spy).toHaveBeenCalledTimes(3);
    done();
  });

  test(' if value == true,  updateStatus function test', (done) => {
    const spy = jest.spyOn(airplaneModeServiceHelper, '_suspend').mockImplementation();
    navigator.b2g.nfc = {
      nfc: 'test'
    };

    airplaneModeServiceHelper.updateStatus('nfc');
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy.mock.calls[0][0]).toBe('ril.ims');
    expect(spy.mock.calls[1][0]).toBe('bluetooth');
    expect(spy.mock.calls[2][0]).toBe('nfc');
    done();
  });

  test(' if value !=true ,  updateStatus function test', (done) => {
    airplaneModeServiceHelper._settings = {};
    const spy = jest.spyOn(airplaneModeServiceHelper, '_restore').mockImplementation();
    navigator.b2g.nfc = {
      nfc: 'test'
    };

    airplaneModeServiceHelper.updateStatus('');
    expect(spy).toHaveBeenCalledTimes(3);
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});
