describe('<js/usb_storage.js> test', () => {
  beforeAll((done) => {
    require('./mocks/service');
    require('./mocks/SettingsObserver');
    done();
  });

  let subject, addEventSpy;
  beforeEach((done) => {
    addEventSpy = jest.spyOn(window, 'addEventListener');
    require('../js/usb_storage');
    subject = new UsbStorage();
    done();
  });

  test('start & stop test', (done) => {
    expect(addEventSpy).toBeCalledTimes(2);
    const removeEventSpy = jest.spyOn(window, 'removeEventListener');
    subject.stop();
    expect(removeEventSpy).toBeCalledTimes(2);
    done();
  });

  test('_usbStorageChanged &  _getUsbProtocol functions test', (done) => {
    jest
      .spyOn(SettingsObserver, 'getValue')
      .mockResolvedValueOnce(undefined);

    const getValSpy = jest.spyOn(SettingsObserver, 'getValue');

    subject._usbStorageChanged(undefined);
    expect(getValSpy).toBeCalledTimes(1);
    expect(getValSpy.mock.calls[0][0]).toEqual('usb.transfer');
    done();
  });

  test('_keyMigration function test', (done) => {
    expect(subject._keyMigration('test')).toEqual('test');
    expect(subject._keyMigration(undefined)).toEqual('0');
    done();
  });

  test('_setMode function test', (done) => {
    expect(subject._mode).toBe(0);

    subject._setMode();
    expect(subject._mode).toBe(undefined);

    subject._setMode(2);
    expect(subject._mode).toBe(2);
    subject._setMode(2);
    done();
  });

  test('_protocolStr function test', (done) => {
    const value1 = subject._protocolStr(0);
    expect(value1).toEqual('UMS');
    const value2 = subject._protocolStr(1);
    expect(value2).toEqual('MTP');
    const value3 = subject._protocolStr(2);
    expect(value3).toEqual('???');
    done();
  });

  test('_modeStr function test', (done) => {
    const value1 = subject._modeStr(0);
    expect(value1).toEqual('Disabled');
    const value2 = subject._modeStr(1);
    expect(value2).toEqual('Enable-UMS');
    const value3 = subject._modeStr(2);
    expect(value3).toEqual('DisabledWhenUnplugged');
    const value4 = subject._modeStr(3);
    expect(value4).toEqual('Enable-MTP');
    const value5 = subject._modeStr();
    expect(value5).toEqual('???');
    done();
  });

  test('handleEvent function test', (done) => {
    const updateSpy = jest
      .spyOn(subject, '_updateMode')
      .mockImplementation(() => {});

    //return
    subject.handleEvent({
      type: 'lockscreen-appdiabled'
    });
    expect(updateSpy).toBeCalledTimes(0);

    subject.handleEvent({
      type: 'lockscreen-appopened'
    });
    expect(updateSpy).toBeCalledTimes(1);
    done();
  });

  test('_updateMode function test', (done) => {
    expect(subject._mode).toBe(0);

    //  subject._enabled === true
    subject._enabled = true;
    subject._updateMode();
    expect(subject._mode).toBe(1);

    subject._protocol = '1';
    subject._updateMode();
    expect(subject._mode).toBe(3);

    //  subject._enabled ===false
    subject._enabled = false;
    subject._mode = 1;
    subject._protocol = '0';

    subject._updateMode();
    expect(subject._mode).toBe(2);
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});