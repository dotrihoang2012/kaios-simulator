describe('<airplane_mode.js> test', () => {
  let airplaneMode;
  beforeEach((done) => {
    require('./mocks/service');
    require('../js/base_module');
    require('../js/airplane_mode');
    airplaneMode = new AirplaneMode();

    airplaneMode.airplaneModeServiceHelper = {
      isSuspended: (param) => {
        return param;
      },
      updateStatus: (param) => {
        return param;
      },
      isEnabled: (param) => {
        return param;
      }
    };
    done();
  });

  test('isActive function test', (done) => {
    const value = airplaneMode.isActive();
    expect(value).toBe(undefined);
    done();
  });

  test('_observe_airplaneMode.enabled function test', (done) => {
    airplaneMode._watchList = {
      radio: {
        enabled: 'radio-enabled'
      }
    };
    expect(airplaneMode.enabled).toBe(undefined);
    airplaneMode['_observe_airplaneMode.enabled'](false);
    expect(airplaneMode.enabled).toBe(false);
    done();
  });

  test('_handle_radiostatechange function test', (done) => {
    airplaneMode._enabled = true;
    const evt = {
      detail: {
        state: 'enabled'
      }
    };
    airplaneMode._handle_radiostatechange(evt);
    expect(Service.request).toHaveBeenCalledTimes(1);
    done();
  });

  test('_handle_request-airplane-mode-enable function test', (done) => {
    airplaneMode._watchList = {
      wifi: {
        enabled: 'wifi-enabled'
      }
    };
    airplaneMode._enabled = false;
    airplaneMode['_handle_request-airplane-mode-enable']();
    expect(airplaneMode._enabled).toBe(true);
    done();
  });

  test('_handle_request-airplane-mode-disable function test', (done) => {
    airplaneMode._watchList = {
      bluetooth: {
        enabled: 'bluetooth-adapter-added'
      }
    };
    airplaneMode._enabled = true;
    airplaneMode['_handle_request-airplane-mode-disable']();
    expect(airplaneMode._enabled).toBe(false);
    done();
  });

  test('_start & _stop function test', (done) => {
    expect(airplaneMode._watchList).toBe(undefined);
    airplaneMode._start();
    airplaneMode._stop();
    expect(airplaneMode._watchList).toEqual({});
    done();
  });

  test('registerNetwork & unregisterNetwork function test', (done) => {
    airplaneMode._watchList = {
      wifi: {
        enabled: 'wifi-enabled',
        disabled: 'wifi-disabled'
      }
    };
    const handler = jest.fn();

    airplaneMode.registerNetwork('wifi', handler);
    expect('wifi' in airplaneMode._watchList).toBe(true);
    expect(typeof airplaneMode._watchList.wifi).toBe('object');

    airplaneMode.registerNetwork('radio', handler);
    expect('radio' in airplaneMode._watchList).toBe(true);
    expect(typeof airplaneMode._watchList.radio).toBe('function');

    //!this._watchList[network] == true  --> return
    airplaneMode.unregisterNetwork('test');

    //!this._watchList[network] == false
    airplaneMode.unregisterNetwork('wifi');
    expect('wifi' in airplaneMode._watchList).toBe(false);
    airplaneMode.unregisterNetwork('radio');
    expect('radio' in airplaneMode._watchList).toBe(false);
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});