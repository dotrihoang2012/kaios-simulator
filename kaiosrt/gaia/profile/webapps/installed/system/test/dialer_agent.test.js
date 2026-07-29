require('./mocks/SettingsObserver');
require('./mocks/SettingsURL');
require('./mocks/service');
require('./mocks/CallscreenWindow');
require('./mocks/l10n');
require('./mocks/external_screen_manager');
require('./mocks/mock_appOrigin.js');
require('./mocks/mock_applications');
require('./mocks/navigator/getDeviceStorage');
require('./mocks/navigator/telephony');
require('./mocks/navigator/vibrate');

jest.useFakeTimers();
global.Contacts = {
  findByNumber: (number, callback) => {
    if (number === '12345678') return Promise.resolve(callback());
    return Promise.resolve(callback({
      ringtone: 'testringtone'
    }));
  },
  isBlockedNumber: (number) => {
    if (number === '11111111') return Promise.resolve(true);
    return Promise.resolve(false);
  }
};

function AudioChannelClient() {}
AudioChannelClient.prototype = {
  abandonChannel: jest.fn(),
  requestChannel: jest.fn()
};
global.AudioChannelClient = AudioChannelClient;

describe('dialer_agent test. init', () => {
  beforeAll(() => {
    require('../js/dialer_agent.js');
  });
  beforeEach(() => {
    jest.runAllTimers();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('dialer_agent start', () => {
    global.dialerAgent = new DialerAgent();
    dialerAgent._telephony.conferenceGroup.addEventListener =
      jest.fn((name, callback) => dialerAgent._telephony.handler = callback);
    expect(dialerAgent.start()).not.toBeUndefined();

    window.dispatchEvent(new CustomEvent('applicationready'));
    expect(dialerAgent._callscreenWindow).not.toBeUndefined();
    expect(dialerAgent._callscreenWindow.hide).toBeCalledTimes(1);

    dialerAgent._telephony.handler();
    jest.advanceTimersByTime(dialerAgent._callEndPromptTime);
    expect(dialerAgent._callscreenWindow.closeWindow).toBeCalledTimes(1);
  });

  test('dialer_agent vibration.enabled change', () => {
    dialerAgent._alerting = true;
    SettingsObserver.setValue([{
      name: 'vibration.enabled',
      value: true
    }]);
    expect(navigator.vibrate).toBeCalledTimes(1);
    jest.advanceTimersByTime(600);
    expect(navigator.vibrate).toBeCalledTimes(2);
    expect(dialerAgent._shouldVibrate).toBe(true);
    dialerAgent._alerting = false;

    SettingsObserver.setValue([{
      name: 'vibration.enabled',
      value: false
    }])
    expect(dialerAgent._shouldVibrate).toBe(false);
  });


  test('dialer_agent handle event test', async () => {
    window.dispatchEvent(new CustomEvent('homescreenloaded'));
    expect(dialerAgent._callscreenWindow.ensure).toBeCalledTimes(1);

    jest.spyOn(window, 'clearInterval');
    window.dispatchEvent(new CustomEvent('mute-alert'));
    expect(window.clearInterval).toBeCalledTimes(1);

    dialerAgent._alerting = true;
    window.dispatchEvent(new CustomEvent('sleep'));
    expect(dialerAgent.isAlerting()).toBe(false);
    expect(window.clearInterval).toBeCalledTimes(2);

    dialerAgent.audioChannelClient = {
      abandonChannel: jest.fn
    };
    window.dispatchEvent(new CustomEvent('attentionopened', {
      detail: { isCallscreenWindow: true }
    }));
    jest.advanceTimersByTime(10);
    expect(dialerAgent._callscreenWindow.closeWindow).toBeCalledTimes(1);
    expect(dialerAgent.audioChannelClient).toBe(null);

    jest.spyOn(dialerAgent, 'handleCallschanged');
    dialerAgent.handleEvent({ type: 'callschanged' });
    expect(dialerAgent.handleCallschanged).toBeCalledTimes(1);

    dialerAgent._telephony.calls = [{
      state: 'testState',
    }];
    dialerAgent.handleEvent({ type: 'callschanged' });
    expect(dialerAgent.handleCallschanged).toBeCalledTimes(2);

    dialerAgent._telephony.calls = [{
      state: 'incoming',
      secondId: { number: '12345678' }
    }];
    await dialerAgent.handleEvent({ type: 'callschanged' });
    expect(dialerAgent.handleCallschanged).toBeCalledTimes(3);

    dialerAgent._telephony.calls = [{
      state: 'incoming',
      secondId: { number: '11111111' },
      hangUp: jest.fn()
    }];
    await dialerAgent.handleEvent({ type: 'callschanged' });
    expect(dialerAgent.handleCallschanged).toBeCalledTimes(3);
    expect(dialerAgent._telephony.calls[0].hangUp).toBeCalledTimes(1);
  });

  test('dialer_agent handleCallschanged test', async () => {
    jest.spyOn(Service, 'request');

    dialerAgent._isBlockedNumber = true;
    dialerAgent.handleCallschanged();
    expect(Service.request).toBeCalledTimes(0);
    expect(dialerAgent._isBlockedNumber).toBe(false);

    dialerAgent._telephony.conferenceGroup = {
      state: 'connected',
      calls: [{ serviceId: 0 }]
    };
    dialerAgent.handleCallschanged();
    expect(Service.request).toBeCalledTimes(3);
    expect(Service.request.mock.calls[2][0]).toEqual('updateWifiCallState');

    jest.clearAllMocks();

    dialerAgent._telephony.conferenceGroup = { calls: [] };
    dialerAgent._telephony.calls = [];
    dialerAgent.handleCallschanged();
    jest.advanceTimersByTime(dialerAgent._callEndPromptTime);
    expect(Service.request).toBeCalledTimes(2);
    expect(dialerAgent._callscreenWindow.closeWindow).toBeCalledTimes(1);

    jest.clearAllMocks();
    dialerAgent._telephony.calls = [{
      handler: null,
      state: 'incoming',
      secondId: { number: '11111111' },
      addEventListener: jest.fn((name, callback) => dialerAgent.handler = callback),
      removeEventListener: jest.fn(),
      hangUp: jest.fn()
    }];
    dialerAgent._alerting = false;
    Service.set('Accessibility.screenReaderEnabled', true);
    dialerAgent.handleCallschanged();
    expect(dialerAgent._telephony.calls[0].addEventListener).toBeCalledTimes(1);
    expect(ExternalScreenManager.send.mock.calls[0][0].type).toEqual('incomingcall');
    expect(Service.request.mock.calls[3][0]).toEqual('BgCallNotice:show');
    jest.advanceTimersByTime(1200);
    expect(Service.request.mock.calls[4][0]).toEqual('Accessibility:speak');

    jest.clearAllMocks();
    dialerAgent.handler();
    expect(ExternalScreenManager.send).toBeCalledTimes(0);
    dialerAgent._telephony.calls = [];
    dialerAgent.handler();
    expect(ExternalScreenManager.send.mock.calls[0][0].type).toEqual('incomingcall');
  });

  test('dialer_agent freeCallscreenWindow test', () => {
    dialerAgent._telephony.conferenceGroup = { calls: [] };
    dialerAgent._telephony.calls = [];
    jest.spyOn(dialerAgent._callscreenWindow, 'isVisible')
      .mockImplementation(() => false);
    dialerAgent.freeCallscreenWindow();
    expect(dialerAgent._callscreenWindow.free).toBeCalledTimes(1);
  });
});
