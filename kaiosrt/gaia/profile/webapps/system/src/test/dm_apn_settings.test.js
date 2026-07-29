/* eslint-disable no-undef */
import '../../test/mocks/SettingsObserver';
import '../../test/mocks/navigator/mobileConnections';

const apnNameMap = [
  'ril.data.apn.sim',
  'ril.supl.apn.sim',
  'ril.supl.protocol.sim',
  'ril.supl.roaming_protocol.sim',
  'ril.emergency.apn.sim',
  'ril.emergency.protocol.sim',
  'ril.emergency.roaming_protocol.sim',
  'ril.data.apnSettings.sim',
];
describe('dm_apn_setting.js test', () => {
  let instance;
  beforeEach(done => {
    window.DUMP = jest.fn();
    instance = require('../dm_apn_settings').default;
    done();
  });

  test('start function test', async done => {
    jest.spyOn(global.SettingsObserver, 'observe')
      .mockImplementation((name, defaultValue, callbackHandle) => {
        callbackHandle();
      });
    jest.spyOn(SettingsObserver, 'getValue')
      .mockResolvedValue(['apnSettings1']);
    const setValueSpy = jest.spyOn(SettingsObserver, 'setValue');
    const addEventSpy = jest.spyOn(window, 'addEventListener');
    await instance.start();
    expect(SettingsObserver.observe).toHaveBeenCalledTimes(3);
    expect(SettingsObserver.observe.mock.calls[0][0]).toEqual('dm.apnSettings.protocol');
    expect(SettingsObserver.observe.mock.calls[1][0]).toEqual('ril.data.dm.apnSettings.sim1');
    expect(SettingsObserver.observe.mock.calls[2][0]).toEqual('ril.data.dm.apnSettings.sim2');
    expect(addEventSpy).toHaveBeenCalledTimes(1);
    expect(window.DUMP).toHaveBeenCalledTimes(2);
    expect(SettingsObserver.getValue).toHaveBeenCalledTimes(3);
    expect(setValueSpy).toHaveBeenCalledTimes(2);
    apnNameMap.forEach((name, index) => {
      expect(setValueSpy.mock.calls[0][0][index].name).toEqual(name + '1');
      expect(setValueSpy.mock.calls[1][0][index].name).toEqual(name + '2');
    });
    done();
  });

  test('resetApnSettings function test', async done => {
    const setValueSpy = jest.spyOn(SettingsObserver, 'setValue');
    const getValueSpy = jest.spyOn(SettingsObserver, 'getValue');
    const evt = {
      detail: { cardIndex: '1' }
    };
    await window.dispatchEvent(new CustomEvent('reset-apn', evt));
    expect(getValueSpy).toHaveBeenCalled();
    expect(window.DUMP).toHaveBeenCalled();
    expect(setValueSpy).toHaveBeenCalled();
    done();
  });

  test('combineApn function test when getDMApnProtocol is false', async done => {
    const setValueSpy = jest.spyOn(SettingsObserver, 'setValue');
    const getValueSpy = jest.spyOn(SettingsObserver, 'getValue')
      .mockResolvedValue(false);

    await instance.getDMApnProtocol();
    await instance.combineApn(['test'], 'ril.data.dm.apnSettings.sim1');
    expect(getValueSpy).toHaveBeenCalledTimes(1);
    expect(window.DUMP).toHaveBeenCalledTimes(1);
    expect(setValueSpy).toHaveBeenCalledTimes(1);
    apnNameMap.forEach((name, index) => {
      expect(setValueSpy.mock.calls[0][0][index].name).toEqual(name + '1');
    });
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  afterAll(done => {
    window.DUMP = undefined;
    done();
  });
});
