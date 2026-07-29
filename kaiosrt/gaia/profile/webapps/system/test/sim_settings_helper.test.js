require('./mocks/service')
require('./mocks/SettingsObserver')
require('./mocks/simslot_manager')
require('./mocks/l10n')
require('./mocks/Notification.js')
require('./mocks/navigator/mobileConnections')
require('./mocks/navigator/iccManager')

jest.useFakeTimers();

describe('sim_settings_helper test. init', () => {
  beforeAll(() => {
    Service.set('supportSwitchPrimarysim', true)
    global.tick = () => new Promise(res => setImmediate(res));
    SettingsObserver.keyMap = {
      'carrier.sim.match.info': {
        value: [{
          'mcc': '410',
          'mnc': '310',
          'mvno_type': 'gid',
          'mvno_match_data':'2AC9'
        }]
      },
      'ril.telephony.defaultServiceId': { value: -1 },
      'ril.voicemail.defaultServiceId': { value: -1 },
      'ril.telephony.defaultServiceId.iccId': { value: '001' },
      'ril.voicemail.defaultServiceId.iccId': { value: '001' },
      'ril.sms.defaultServiceId': { value: 1 },
      'ril.sms.defaultServiceId.iccId': { value: '001' },
 
      'ril.mms.defaultServiceId': { value: 2 },
      'ril.data.defaultServiceId': { value: 2 },
      'ril.mms.defaultServiceId.iccId': { value: '002' },
      'ril.data.defaultServiceId.iccId': { value: '002' },
      'ril.sim.iccIds': { value: ['', ''] }
    };
    require('../js/sim_settings_helper.js')
  });
  beforeEach(() => {
    jest.clearAllMocks()
  });

  test('sim_settings_helper start test', async () => {
    jest.spyOn(window, 'addEventListener');
    navigator.b2g.mobileConnections = [{ iccId: '001' }, { iccId: '002' }];
    SIMSlotManager.isMultiSIM = () => true;
    SIMSlotManager.ready = false;
    SimSettingsHelper.start();
    await tick();
    expect(SimSettingsHelper.initFromDB).toBe(true);
    expect(window.addEventListener.mock.calls[0][0]).toEqual('simslotready');
    expect(window.addEventListener.mock.calls[1][0]).toEqual('logohidden');
    expect(SimSettingsHelper.iccIds).toEqual([null, null]);
    window.dispatchEvent(new CustomEvent('simslotready'));
    expect(SimSettingsHelper.iccIds).toEqual(['001', '002']);
  });

  test('sim_settings_helper observerSimCardHotPlug test', () => {
    jest.spyOn(Service, 'request');
   
    expect(SimSettingsHelper.hotPlugHandler).toEqual(null);
    expect(SimSettingsHelper.skipIccCmd).toBe(false);
    window.dispatchEvent(new CustomEvent('logohidden'));
    expect(SimSettingsHelper.hotPlugHandler).not.toEqual(undefined);

    // not support supportSimHotswap
    SimSettingsHelper.hotPlugHandler({ type: 'iccdetected' });
    expect(Service.request).toBeCalledTimes(0);

    // support supportSimHotswap
    Service.set('supportSimHotswap', true);
    SimSettingsHelper.hotPlugHandler({ type: 'iccdetected' });
    expect(Service.request).toBeCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('DialogService:show');
    jest.advanceTimersByTime(SimSettingsHelper.AUTOREBOOT_TIME_INTERVAL);
    expect(Service.request.mock.calls[1][0]).toEqual('startPowerOff');
  });

  test('sim_settings_helper isCarrierSimCard test', async () => {
    const matchMvno = (mvno_type, mvno_match_data) => {
      return {
        result: true,
        test: 'test',
        set onsuccess(cb) {
          if (mvno_type === 'gid') {
            cb();
          }
        },
        set onerror(cb) {
          if (mvno_type !== 'gid') {
            cb();
          }
        }
      };
    };
    navigator.b2g.iccManager.getIccById = () => {
      return {
        iccInfo: { mcc: '410', mnc: '310' },
        matchMvno, 
      }
    };
    expect(await SimSettingsHelper.isCarrierSimCard(0)).toBe(true);

    navigator.b2g.iccManager.getIccById = () => {
      return {
        iccInfo: { mcc: '410', mnc: '320' },
        matchMvno, 
      }
    };
    expect(await SimSettingsHelper.isCarrierSimCard(0)).toBe(false);
  });

  test('sim_settings_helper updateDefaultServiceSettings test', async () => {
    SIMSlotManager.getSlots = () => {
      return [{
        simCard: {},
        getCardState() {
          return 'ready'
        }
      }, {}]
    };
    jest.spyOn(SimSettingsHelper, 'simslotUpdatedHandler');
    SimSettingsHelper.updateDefaultServiceSettings();
    await tick();
    expect(SimSettingsHelper.simslotUpdatedHandler).toBeCalledTimes(1);
  });

  test('sim_settings_helper setServiceOnCard test', async () => {
    jest.spyOn(SettingsObserver, 'setValue');
    SimSettingsHelper['ril.notFirst.sim.settings'] = false;
    SimSettingsHelper.setServiceOnCard('outgoingData');
    expect(SettingsObserver.setValue.mock.calls[1])
      .toEqual([[{ 'name': 'ril.data.defaultServiceId', 'value': 0 }]]);

    jest.clearAllMocks();
    SimSettingsHelper['ril.notFirst.sim.settings'] = true;

    SIMSlotManager.getSlots = () => {
      return [{
        isAbsent: () => true
      }, {
        isAbsent: () => false,
        simCard: {},
        getCardState() {
          return 'ready'
        }
      }]
    };
    SimSettingsHelper.iccIds[0] = '002';
    SimSettingsHelper.iccIds[1] = '001';
    SimSettingsHelper.setServiceOnCard('outgoingData');
    expect(SettingsObserver.setValue.mock.calls[1])
      .toEqual([[{ 'name': 'ril.data.defaultServiceId', 'value': 1 }]]);

  });
});
