require('./mocks/service');
require('./mocks/BrowserKeyEventManager');
require('./mocks/SettingsObserver');
require('./mocks/ScreenManager');
require('./mocks/BrowserKeyEventManager');
require('./mocks/mock_appOrigin');
require('./mocks/AppsManager');
require('./mocks/navigator/vibrate');
jest.useFakeTimers();

global.DUMP = jest.fn();
global.dialerAgent = {
  _callscreenWindow: { isActive: jest.fn() }
};
global.navigator.b2g = {
   virtualCursor: { isPanning: false }
};

describe('hardware_button test. init', () => {
  beforeAll(() => {
    SettingsObserver.setValue([{
      name: 'keypad.vibration',
      value: 'true'
    }]);
    require('../js/browser_key_event_manager.js');
    require('../js/hardware_buttons.js');
    expect(Service.request.mock.calls[0][0]).toEqual('SettingsCore:addObserver');
    expect(Service.request.mock.calls[0][1]).toEqual('keypad.vibration');
    expect(Service.register.mock.calls[0][0]).toEqual('handleEvent');
    hardwareButtons._vibrationEnabled = true;
  });
  beforeEach(() => {
    jest.runAllTimers();
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.spyOn(hardwareButtons.browserKeyEventManager, 'screenOff')
      .mockReturnValue(false);
  });
  test('hardware_button turnscreenOnHandle', () => {
    jest.spyOn(hardwareButtons.browserKeyEventManager, 'screenOff')
      .mockReturnValueOnce(true).mockReturnValueOnce(false);
    hardwareButtons._turnscreenOnHandle({
      type: 'keydown',
      'key': 'TestKey',
      stopPropagation: jest.fn(),
      preventDefault: jest.fn()
    });
    expect(Service.request.mock.calls[0][0]).toEqual('turnScreenOn');

    hardwareButtons._turnscreenOnHandle({
      type: 'keydown',
      'key': 'TestKey',
      stopPropagation: jest.fn(),
      preventDefault: jest.fn()
    });
    expect(Service.request).toBeCalledTimes(1);

  });

  test('hardware_button screenshot', () => {
    jest.spyOn(hardwareButtons, 'publish');

    window.dispatchEvent(new KeyboardEvent('keydown', {
      'key': '*'
    }));
    expect(navigator.vibrate).toBeCalledTimes(1);
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': '#' }));
    expect(hardwareButtons.publish).toBeCalledTimes(3);
    expect(hardwareButtons.publish.mock.calls[1][0]).toEqual('screenshot');
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': '#' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': '*' }));

    jest.clearAllMocks();
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': '#' }));
    expect(navigator.vibrate).toBeCalledTimes(1);
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': '*' }));
    expect(hardwareButtons.publish).toBeCalledTimes(3);
    expect(hardwareButtons.publish.mock.calls[1][0]).toEqual('screenshot');
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': '#' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': '*' }));

    // volume down + camera key
    jest.clearAllMocks();
    jest.spyOn(hardwareButtons, 'publish');
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'audiovolumedown' }));
    expect(hardwareButtons.stateValue).toEqual('volume');
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'camera' }));
    expect(hardwareButtons.publish.mock.calls[0]).toEqual(['screenshot']);
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'audiovolumedown' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'screenshot' }))
    expect(hardwareButtons.stateValue).toEqual('base');

    // volume down + power key
    jest.clearAllMocks();
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'audiovolumedown' }));
    expect(hardwareButtons.stateValue).toEqual('volume');
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Power' }));
    expect(hardwareButtons.publish.mock.calls[0]).toEqual(['screenshot']);
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'audiovolumedown' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'Power' }))

  });


  test('hardware_button hasKeyDown test ', () => {
    expect(hardwareButtons.hasKeyDown()).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'testkey' }));
    expect(hardwareButtons.hasKeyDown()).toBe(true);
    jest.advanceTimersByTime(3000);
    expect(hardwareButtons.hasKeyDown()).toBe(false);
  });

  test('hardware_button Backspace test', () => {
    // long press
    jest.spyOn(hardwareButtons, 'publish');
    expect(hardwareButtons.stateValue).toEqual('base');
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Backspace' }));
    expect(hardwareButtons.stateValue).toEqual('keypad');
    jest.advanceTimersByTime(hardwareButtons.HOME_INTERVAL);
    expect(hardwareButtons.publish.mock.calls[1][0]).toEqual('home');
    expect(hardwareButtons.stateValue).toEqual('base');
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'Backspace' }));

    // short press
    global.appWindowManager = {
      getActiveApp: () => {},
      isPlayingContent: () => false
    };
    jest.clearAllMocks();
    Service.set('isLowMemoryDevice', true);
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Backspace' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'Backspace' }));
    expect(hardwareButtons.publish.mock.calls[1]).toEqual(['home', { kill: true, back: true }]);

  });

  test('hardware_button canResponseVA test', () => {
    Service.set('canResponseVA', true);
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'MicrophoneToggle' }));
    jest.advanceTimersByTime(hardwareButtons.HOLD_INTERVAL);
    expect(Service.request.mock.calls[1][0]).toEqual('initialVA');
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'MicrophoneToggle' }));
  });

  test('hardware_button sms/camera button test', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'message' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'message' }));
    expect(window.AppsManager.launch).toBeCalledTimes(1);
    expect(window.AppsManager.launch.mock.calls[0][0].includes('sms')).toBe(true);

    // doesn't repeat launch app with 2s
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'camera' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'camera' }));
    expect(window.AppsManager.launch).toBeCalledTimes(1);

    jest.advanceTimersByTime(2000);
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'camera' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'camera' }));
    expect(window.AppsManager.launch).toBeCalledTimes(2);
    expect(window.AppsManager.launch.mock.calls[1][0].includes('camera')).toBe(true);
  });

  test('hardware_button home key test', () => {
    // short press
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'home' }));
    expect(hardwareButtons.stateValue).toEqual('home');
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'home' }));
    expect(navigator.vibrate).toBeCalledTimes(2);
    expect(hardwareButtons.stateValue).toEqual('base');

    // long press
    jest.clearAllMocks();
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'home' }));
    jest.advanceTimersByTime(500);
    expect(navigator.vibrate).toBeCalledTimes(2);
    expect(hardwareButtons.stateValue).toEqual('base');
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'home' }));

    // long press and press audiovolumeup
    jest.clearAllMocks();
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'home' }));
    expect(hardwareButtons.stateValue).toEqual('home');
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'audiovolumeup' }));
    expect(hardwareButtons.stateValue).toEqual('wake');

    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'home' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'audiovolumeup' }));

    // long press and press otherkey
    jest.clearAllMocks();
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'home' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Enter' }));
    expect(hardwareButtons.stateValue).toEqual('base');

    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'home' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'Enter' }));
  });

  test('hardware_button EndCall test', () => {
    jest.spyOn(hardwareButtons, 'publish');
    // short press
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'EndCall' }));
    expect(hardwareButtons.stateValue).toEqual('endcall');
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'EndCall' }));
    expect(hardwareButtons.stateValue).toEqual('base');
    expect(hardwareButtons.publish.mock.calls[1]).toEqual(['home', { kill: true }]);

    // long press EndCall and device 'hasEndCallKey' is false
    jest.clearAllMocks();
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'EndCall' }));
    expect(hardwareButtons.stateValue).toEqual('endcall');
    jest.advanceTimersByTime(hardwareButtons.LONG_HOLD_INTERVAL);
    expect(hardwareButtons.publish.mock.calls[1]).toEqual(['holdsleep']);
    expect(hardwareButtons.stateValue).toEqual('base');
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'EndCall' }));

    // long press EndCall and device 'hasEndCallKey' is true
    jest.clearAllMocks();
    Service.set('hasEndCallKey', true);
    Service.set('getTopMostWindow', { isHomescreen: true })
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'EndCall' }));
    expect(hardwareButtons.stateValue).toEqual('endcall');
    jest.advanceTimersByTime(500);
    expect(hardwareButtons.stateValue).toEqual('base');
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'EndCall' }));
  });

  test('hardware_button Power key test', () => {
    jest.spyOn(hardwareButtons, 'publish');
    ScreenManager.screenEnabled = false;
    expect(hardwareButtons.stateValue).toEqual('base');
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Power' }));
    expect(hardwareButtons.stateValue).toEqual('base');
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'Power' }));
    expect(hardwareButtons.publish.mock.calls[0]).toEqual(['wake']);
    expect(hardwareButtons.stateValue).toEqual('wake');
    jest.advanceTimersByTime(500);
    expect(hardwareButtons.stateValue).toEqual('base');

    ScreenManager.screenEnabled = true;
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'Power' }));
    expect(hardwareButtons.stateValue).toEqual('sleep');
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'Power' }));
    expect(hardwareButtons.publish.mock.calls[1]).toEqual(['sleep']);
  });

  test('hardware_button volume key mute alerting', () => {
    jest.spyOn(hardwareButtons, 'publish');
    Service.set('hasVolumeKey', false);
    Service.set('DialerAgent.isAlerting', true);
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowUp' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'ArrowUp' }));
    expect(hardwareButtons.publish.mock.calls[0]).toEqual(['mute-alert']);

    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'ArrowDown' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'ArrowDown' }));
    expect(hardwareButtons.publish.mock.calls[1]).toEqual(['mute-alert']);

    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'audiovolumedown' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'audiovolumedown' }));
    expect(hardwareButtons.publish.mock.calls[2]).toEqual(['mute-alert']);

    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'audiovolumeup' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'audiovolumeup' }));
    expect(hardwareButtons.publish.mock.calls[3]).toEqual(['mute-alert']);

    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': '#' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': '#' }));
    expect(hardwareButtons.publish.mock.calls[5]).toEqual(['mute-alert']);
    Service.set('DialerAgent.isAlerting', false);
  });

  test('hardware_button volume state', () => {
    jest.spyOn(hardwareButtons, 'publish');
    expect(hardwareButtons.stateValue).toEqual('base');
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'audiovolumedown' }));
    expect(hardwareButtons.stateValue).toEqual('volume');
    jest.advanceTimersByTime(hardwareButtons.REPEAT_DELAY);
    expect(hardwareButtons.publish.mock.calls[0]).toEqual(['volumedown']);
    jest.advanceTimersByTime(hardwareButtons.REPEAT_INTERVAL);
    expect(hardwareButtons.publish).toBeCalledTimes(2);
    expect(hardwareButtons.publish.mock.calls[1]).toEqual(['volumedown']);
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'audiovolumedown' }));

    jest.clearAllMocks();
    expect(hardwareButtons.stateValue).toEqual('base');
    window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'audiovolumeup' }));
    expect(hardwareButtons.stateValue).toEqual('volume');
    jest.advanceTimersByTime(hardwareButtons.REPEAT_DELAY);
    expect(hardwareButtons.publish.mock.calls[0]).toEqual(['volumeup']);
    jest.advanceTimersByTime(hardwareButtons.REPEAT_INTERVAL);
    expect(hardwareButtons.publish).toBeCalledTimes(2);
    expect(hardwareButtons.publish.mock.calls[1]).toEqual(['volumeup']);
    window.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'audiovolumeup' }));

  });

  test('hardware_button stop test', () => {
    hardwareButtons.stop();
    expect(hardwareButtons._started).toBe(false);
    expect(hardwareButtons.state).toBe(null);
  });
});
