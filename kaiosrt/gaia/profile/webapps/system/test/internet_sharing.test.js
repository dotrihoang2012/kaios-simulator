describe('<js/internet_sharing.js> test', () => {
  beforeAll((done) => {
    window.DUMP = jest.fn();
    require('./mocks/service');
    require('./mocks/SettingsObserver');
    require('./mocks/simslot_manager');
    done();
  });

  let subject;
  beforeEach((done) => {
    require('../js/internet_sharing');
    subject = new InternetSharing();
    done();
  });

  test('Instance test', (done) => {
    expect(subject.startTimestamp).toBe(0);
    expect(subject.tetheringWifiEnabled).toBe(false);
    done();
  });

  test('wifiInternetSharingSettingsChangeHandler function test', (done) => {
    jest
      .spyOn(Service, 'query')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    jest
      .spyOn(Service, 'request')
      .mockImplementation((name, obj) => {
        if (typeof obj.onOk === 'function') {
          obj.onOk();
        }
      });

    jest.spyOn(SettingsObserver, 'setValue');
    subject.wifiInternetSharingSettingsChangeHandler('test value');
    expect(SettingsObserver.setValue).toBeCalledTimes(1);
    expect(Service.query).toBeCalledTimes(2);
    expect(Service.request).toBeCalledTimes(2);
    expect(Service.query.mock.calls[0][0]).toEqual('AirplaneMode.isActive');
    expect(Service.query.mock.calls[1][0]).toEqual('isWifiCertified');
    expect(Service.request.mock.calls[0][0]).toEqual('DialogService:show');
    expect(Service.request.mock.calls[1][0]).toEqual('DialogService:hide');
    done();
  });

  test('usbInternetSharingSettingsChangeHandler function test', (done) => {
    global.navigator.b2g = {
      tetheringManager: {
        setTetheringEnabled: jest.fn(() => Promise.resolve())
      }
    };
    subject.taskScheduler = subject._taskScheduler();
    subject.usbInternetSharingSettingsChangeHandler('test value');
    expect(navigator.b2g.tetheringManager.setTetheringEnabled).toBeCalledTimes(1);
    done();
  });

  test('clearAutoTimeoutHandle function test', (done) => {
    subject.autoTurnoffHandle = 2;
    subject.clearAutoTimeoutHandle();
    expect(subject.autoTurnoffHandle).toBe(null);
    done();
  });

  test('wifiTetheringTimeoutChanged function test', (done) => {
    expect(subject.autoTurnoffInterval).toBe(0);
    subject.wifiTetheringTimeoutChanged(300);
    expect(subject.autoTurnoffInterval).toBe(300);
    done();
  });

  test('resetAutoTimeoutHandle function test', (done) => {
    jest.useFakeTimers();
    subject.tetheringWifiEnabled = true;
    subject.autoTurnoffInterval = 2;
    subject.resetAutoTimeoutHandle();
    jest.runAllTimers();
    expect(setTimeout).toBeCalledTimes(1);
    expect(setTimeout).toBeCalledWith(expect.any(Function), 2000);
    done();
  });

  test('wifiStationchange function test', (done) => {
    expect(subject.lastConnectedClients).toBe(0);

    jest
      .spyOn(Service, 'query')
      .mockReturnValueOnce(3);
    subject.wifiStationchange();
    expect(subject.lastConnectedClients).toBe(3);
    done();
  });

  test('turnOffInternetSharing & turnOffInternetSharingByWifi & turnOffUsbTethering functions test', (done) => {
    jest
      .spyOn(SIMSlotManager, 'noSIMCardOnDevice')
      .mockReturnValue(true);
    const setValueSpy = jest.spyOn(SettingsObserver, 'setValue');

    //1, turnOffInternetSharing test
    subject.turnOffInternetSharing(true);
    expect(setValueSpy).toBeCalledTimes(1);
    expect(setValueSpy.mock.calls[0][0]).toEqual([{
      name: 'tethering.wifi.enabled',
      value: false
    }, {
      name: 'tethering.usb.enabled',
      value: false
    }]);

    //2, turnOffInternetSharingByWifi test
    subject.turnOffInternetSharingByWifi(false);
    expect(setValueSpy).toBeCalledTimes(2);

    //3, turnOffUsbTethering test
    subject.turnOffUsbTethering();
    expect(setValueSpy).toBeCalledTimes(3);
    expect(setValueSpy.mock.calls[2][0]).toEqual([{
      name: 'tethering.usb.enabled',
      value: false
    }]);
    done();
  });

  test('start function test', (done) => {
    global.navigator.b2g = {
      tetheringManager: {
        setTetheringEnabled: jest.fn(() => Promise.resolve())
      },
      powerSupplyManager: {
        powerSupplyOnline: true,
        powerSupplyType: 'WIFI'
      },
      usbManager: {
        onusbstatuschange: jest.fn()
      }
    };
    const observeSpy = jest.spyOn(SettingsObserver, 'observe');

    subject.start();
    navigator.b2g.usbManager.onusbstatuschange({
      deviceAttached: false
    })
    expect(observeSpy).toBeCalledTimes(5);
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  afterAll((done) => {
    window.DUMP = undefined;
    done();
  });
});
