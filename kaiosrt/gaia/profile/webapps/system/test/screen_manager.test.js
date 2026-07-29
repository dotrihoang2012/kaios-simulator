/* eslint-disable no-undef, global-require */
require('./mocks/l10n.js')
require('./mocks/service')
require('./mocks/SettingsObserver')
require('./mocks/PowerManager')
require('./mocks/idletimer')
require('./mocks/external_screen_manager')
require('./mocks/navigator/telephony')

require('../js/wake_lock_manager.js')

function ScreenBrightnessTransition() {}
ScreenBrightnessTransition.prototype = {
  getState: jest.fn(),
  updateBrightness: jest.fn(),
  transitionTo: jest.fn(),
  abort: jest.fn()
};

window.DUMP = jest.fn();
if (!global.navigator.b2g) {
  global.navigator.b2g = {};
}

Object.assign(global.navigator.b2g, {
  addWakeLockListener: jest.fn(),
  getWakeLockState: jest.fn(),
  removeWakeLockListener: jest.fn(),
  requestWakeLock: jest.fn(() => {return { unlock: jest.fn }})
});

global.ScreenBrightnessTransition = ScreenBrightnessTransition;

global.window.secureWindowManager = { isActive: () => false };

describe('screen_manager test. init', () => {
  beforeAll(() => {
    require('../js/screen_manager.js')
    jest.useFakeTimers();
    expect(Service.register).toBeCalledTimes(2);
    expect(Service.register.mock.calls[0][0]).toEqual('turnScreenOn');
    expect(Service.register.mock.calls[1][0]).toEqual('turnScreenOff');
  });
  beforeEach(() => {
    jest.clearAllMocks()
  });

  test('screen_manager turnScreenOff test', () => {
    ScreenManager.screenEnabled = false;
    expect(ScreenManager.turnScreenOff()).toBe(false);

    ScreenManager.screenEnabled = true;
    jest.spyOn(window, 'removeEventListener');
    expect(ScreenManager.turnScreenOff(false, 'powerkey')).toBe(true);

    expect(ScreenManager._screenOffBy).toEqual('powerkey');
    expect(window.removeEventListener.mock.calls[0][0]).toEqual('userproximity');
    expect(ScreenManager.screenEnabled).toBe(true);
    jest.advanceTimersByTime(ScreenManager._dimNotice);
    expect(ScreenManager.screenEnabled).toBe(false);

    ScreenManager.screenEnabled = true;
    expect(ScreenManager.turnScreenOff(true, 'powerkey')).toBe(true);
    expect(ScreenManager.screenEnabled).toBe(false);
  });

  test('screen_manager turnScreenOn test', () => {
    jest.spyOn(window, 'addEventListener');

    ScreenManager._flipManager = { flipOpened: false };
    ScreenManager.wakeUpExtScreen = false;
    ScreenManager.turnScreenOn('test');
    expect(window.DUMP.mock.calls[0][0]).toEqual('turnScreenOn: test');
    expect(window.clearTimeout).toBeCalledTimes(0);

    ScreenManager._flipManager = { flipOpened: true };
    ScreenManager.screenEnabled = true;
    ScreenManager._inTransition = true;
    expect(ScreenManager.turnScreenOn('keydown')).toBe(false);
    expect(ScreenManager._inTransition).toBe(false);
    expect(PowerManager.setScreenEnabled).toBeCalledTimes(0);

    ScreenManager.screenEnabled = false;
    expect(ScreenManager.turnScreenOn('keydown')).toBe(true);
    expect(PowerManager.setScreenEnabled.mock.calls[0][0]).toEqual(true);
    expect(window.addEventListener.mock.calls[0][0]).toEqual('devicelight');

    ScreenManager.screenEnabled = false;
    navigator.b2g.telephony.calls[0] = { state: 'connected' };
    expect(ScreenManager.turnScreenOn('keydown')).toBe(true);
    expect(PowerManager.setScreenEnabled.mock.calls[0][0]).toEqual(true);
    expect(window.addEventListener.mock.calls[1][0]).toEqual('userproximity');
    expect(window.addEventListener.mock.calls[2][0]).toEqual('devicelight');
  });

  test('screen_manager handleEvent event', () => {
    jest.spyOn(ScreenManager, 'turnScreenOn');
    jest.spyOn(ScreenManager, 'turnScreenOff');
    ScreenManager._flipManager = { flipOpened: false };
    // handle flipchange
    ScreenManager.handleEvent({ type: 'flipchange'});
    expect(ScreenManager.turnScreenOn.mock.calls[0][0]).toEqual('flipchange');
    expect(ScreenManager.turnScreenOff.mock.calls[0]).toEqual([true, 'flip']);


    // handle notice-dialog-activated
    Service.set('locked', true)
    jest.spyOn(ScreenManager, '_setIdleTimeout');
    window.dispatchEvent(new CustomEvent('notice-dialog-activated'));
    expect(ScreenManager.turnScreenOn.mock.calls[1][0])
      .toEqual('notice-dialog-activated');
    expect(ScreenManager._setIdleTimeout.mock.calls[0])
      .toEqual([ScreenManager.NOTICE_DIALOG_TIMEOUT, true]);

    // handle notice-dialog-deactivated
    jest.spyOn(ScreenManager, '_reconfigScreenTimeout');
    window.dispatchEvent(new CustomEvent('notice-dialog-deactivated'));
    expect(ScreenManager._reconfigScreenTimeout).toBeCalledTimes(1);

    // handle unlocking-stop
    ScreenManager._unlocking = true;
    window.dispatchEvent(new CustomEvent('unlocking-stop'));
    expect(ScreenManager._unlocking).toBe(false);
    expect(ScreenManager._reconfigScreenTimeout).toBeCalledTimes(2);

    // handle userproximity
    jest.clearAllMocks()
    ScreenManager.handleEvent({ type: 'userproximity', near: true });
    expect(ScreenManager.turnScreenOff.mock.calls[0]).toEqual([true, 'proximity']);
    ScreenManager.handleEvent({ type: 'userproximity', near: false });
    expect(ScreenManager.turnScreenOn.mock.calls[0]).toEqual(['userproximity']);

    // handle 'attentionopening'/'attentionopened'/'dialog--activated':
    jest.clearAllMocks();
    ScreenManager.screenEnabled = false;
    ScreenManager._flipManager = { flipOpened: true };
    window.dispatchEvent(new CustomEvent('dialog--activated'));
    expect(ScreenManager.turnScreenOn.mock.calls[0][0])
      .toEqual('dialog--activated');

    jest.clearAllMocks();
    window.dispatchEvent(new CustomEvent('attentionopened'));
    expect(ScreenManager._reconfigScreenTimeout).toBeCalledTimes(1);

    // handle devicelight
    jest.spyOn(ScreenManager, 'autoAdjustBrightness');
    ScreenManager.handleEvent({ type: 'devicelight', value: 50 });
    expect(ScreenManager.autoAdjustBrightness.mock.calls[0]).toEqual([50]);

    // handle sleep
    ScreenManager.handleEvent({ type: 'sleep' });
    expect(ScreenManager.turnScreenOff.mock.calls[0])
      .toEqual([true, 'powerkey']);

    // handle wake
    global.FxAccountsUI = { dialog: { Hidden: () => false, focus: jest.fn() }}
    ScreenManager.handleEvent({ type: 'wake' });
    expect(ScreenManager.turnScreenOn.mock.calls[0]).toEqual(['wake']);
    expect(FxAccountsUI.dialog.focus).toBeCalledTimes(1);

    // handle accessibility-action
    jest.clearAllMocks();
    window.dispatchEvent(new CustomEvent('accessibility-action'));
    expect(ScreenManager._reconfigScreenTimeout).toBeCalledTimes(1);

    // handle nfc-tech-discovered/nfc-tech-lost
    jest.clearAllMocks();
    ScreenManager.handleEvent({ type: 'nfc-tech-discovered' });
    expect(ScreenManager._reconfigScreenTimeout).toBeCalledTimes(1);

    ScreenManager._inTransition = true;
    ScreenManager.handleEvent({ type: 'nfc-tech-lost' });
    expect(ScreenManager.turnScreenOn.mock.calls[0]).toEqual(['nfc-tech-lost']);

    // handle unlocking-start
    jest.clearAllMocks();
    ScreenManager._unlocking = false;
    window.dispatchEvent(new CustomEvent('unlocking-start'));
    expect(ScreenManager._unlocking).toBe(true);

    // handle unlocking-stop
    window.dispatchEvent(new CustomEvent('unlocking-stop'));
    expect(ScreenManager._unlocking).toBe(false);

    // handle 'secure-appopened', 'secure-appterminated'
    jest.clearAllMocks();
    window.dispatchEvent(new CustomEvent('secure-appopened'));
    expect(ScreenManager._reconfigScreenTimeout).toBeCalledTimes(1);
    window.dispatchEvent(new CustomEvent('secure-appterminated'));
    expect(ScreenManager._reconfigScreenTimeout).toBeCalledTimes(2);

    // handle callschanged
    jest.clearAllMocks();
    navigator.b2g.telephony.calls = [];
    ScreenManager.handleEvent({ type: 'callschanged' });
    expect(window.removeEventListener.mock.calls[0][0])
      .toEqual('userproximity');

    navigator.b2g.telephony.calls = [{
      videoCallProvider: {},
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }]
    Service.set('hasVT', true)
    ScreenManager.handleEvent({ type: 'callschanged' });
    expect(navigator.b2g.telephony.calls[0].addEventListener.mock.calls[0][0])
      .toEqual('statechange');
    navigator.b2g.telephony.calls[0].videoCallProvider.onsessionmodifyrequest();
    expect(ScreenManager.turnScreenOn.mock.calls[0][0])
      .toEqual('vt-session-modify');

    // handle statechange
    jest.clearAllMocks();
    ScreenManager.handleEvent({ type: 'statechange', target: 'test' });
    expect(window.addEventListener).toBeCalledTimes(0);

    ScreenManager.handleEvent({ type: 'statechange', target: {
      state: 'dialing',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }});
    expect(window.addEventListener.mock.calls[0][0]).toEqual('userproximity');

    // handle 'lockscreen-appclosed', 'lockscreen-appclosing', 'lockpanelchange'
    jest.clearAllMocks();
    window.dispatchEvent(new CustomEvent('lockpanelchange'));
    expect(ScreenManager._setIdleTimeout).toBeCalledTimes(1);

    ScreenManager.handleEvent({ type: 'lockscreen-appclosing'});
    expect(ScreenManager._setIdleTimeout).toBeCalledTimes(2);

    ScreenManager.handleEvent({ type: 'lockscreen-appclosed'});
    expect(ScreenManager._setIdleTimeout).toBeCalledTimes(3);

    // handle lockmode-change
    window.dispatchEvent(new CustomEvent('lockmode-change',
      { detail: { mode: 'none' }}));
    expect(ScreenManager._reconfigScreenTimeout).toBeCalledTimes(0);

    window.dispatchEvent(new CustomEvent('lockmode-change',
      { detail: { mode: 'test' }}));
    expect(ScreenManager._reconfigScreenTimeout).toBeCalledTimes(1);

    // handle logohidden
    expect(ScreenManager._screenLock).not.toEqual(null);
    window.dispatchEvent(new CustomEvent('logohidden'));
    expect(ScreenManager._screenLock).toEqual(null);

    // handle requestshutdown
    const startPowerOff = jest.fn();
    window.dispatchEvent(new CustomEvent('requestshutdown', {
      detail: { startPowerOff: startPowerOff }}));
    expect(ScreenManager.turnScreenOn.mock.calls[0])
      .toEqual(['requestshutdown']);
    expect(startPowerOff.mock.calls[0]).toEqual([false, 'requestshutdown']);

  });
})
