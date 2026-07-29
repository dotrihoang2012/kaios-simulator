/* eslint-disable no-undef, global-require */
require('./mocks/l10n.js')
require('./mocks/service')
require('./mocks/power_save')
require('./mocks/mock_appOrigin')
require('./mocks/SettingsObserver')
require('./mocks/Notification')
require('./mocks/navigator/getBattery')
require('./mocks/navigator/vibrate')


describe('battery_overlay test', () => {
  beforeAll(done => {
    jest.useFakeTimers();
    global.navigator.b2g = {};
    global.navigator.b2g.powerSupplyManager = {
      powerSupplyOnline: true,
      addEventListener: jest.fn()
    };
    require('../js/battery_overlay.js')
    global.batteryOverlay = new BatteryOverlay();
    batteryOverlay.start();
    done();
  });
  beforeEach(done => {
    jest.clearAllMocks()
    done();
  });
  test('handle screenchange test', (done) => {
    expect(batteryOverlay._battery).not.toBe(null);
    expect(batteryOverlay._screenOn).toBe(true);
    expect(batteryOverlay._wasEmptyBatteryNotificationDisplayed).toBe(false);

    window.dispatchEvent(new CustomEvent('screenchange',
      { detail: { screenEnabled: false }}));
    expect(batteryOverlay._screenOn).toBe(false);
    expect(batteryOverlay._wasEmptyBatteryNotificationDisplayed).toBe(false);

    batteryOverlay._battery.charging = false;
    batteryOverlay._battery.level = 0.1;

    HTMLMediaElement.prototype.play = jest.fn();
    HTMLMediaElement.prototype.pause = jest.fn();
    HTMLMediaElement.prototype.load = jest.fn();

    window.dispatchEvent(new CustomEvent('screenchange',
      { detail: { screenEnabled: true }}));
    expect(batteryOverlay._screenOn).toBe(true);
    expect(HTMLMediaElement.prototype.play).toBeCalledTimes(1);
    expect(batteryOverlay._wasEmptyBatteryNotificationDisplayed).toBe(true);
    expect(batteryOverlay.audio.hasAttribute('src')).toEqual(true);
    jest.advanceTimersByTime(batteryOverlay.TIMEOUT);
    expect(batteryOverlay.audio.hasAttribute('src')).toEqual(false);
    done();
  });

  test('handle levelchange test', (done) => {
    batteryOverlay._battery.charging = false;

    jest.spyOn(window, 'dispatchEvent');
    batteryOverlay._battery.level = batteryOverlay.AUTO_SHUTDOWN_LEVEL;
    batteryOverlay.handleEvent({ type: 'levelchange' });
    expect(window.dispatchEvent.mock.calls[0][0].type).toEqual('batteryshutdown');

    batteryOverlay._battery.level = 0.9;
    batteryOverlay.handleEvent({ type: 'levelchange' });
    expect(batteryOverlay._batteryFullNotification).toEqual(null);

    batteryOverlay._battery.level = 1;
    batteryOverlay.handleEvent({ type: 'levelchange' });
    expect(batteryOverlay._batteryFullNotification).toEqual({});

    done();
  });

  test('handle chargingchange test', (done) => {
    global.soundManager = { vibrationEnabled: true };
    batteryOverlay._battery.charging = true;
    batteryOverlay._wasEmptyBatteryNotificationDisplayed = true;
    batteryOverlay.handleEvent({ type: 'chargingchange' });
    expect(batteryOverlay._wasEmptyBatteryNotificationDisplayed).toBe(false);
    expect(navigator.vibrate).toBeCalledTimes(1);

    jest.spyOn(window, 'dispatchEvent');
    batteryOverlay._battery.charging = false;
    batteryOverlay._battery.level = batteryOverlay.AUTO_SHUTDOWN_LEVEL;
    batteryOverlay.handleEvent({ type: 'chargingchange' });
    expect(window.dispatchEvent.mock.calls[0][0].type).toEqual('batteryshutdown');
    done();
  });

  test('handle powersupplystatuschanged test', (done) => {
    batteryOverlay._screenOn = false;
    global.ScreenManager = { turnScreenOn: jest.fn() };
    batteryOverlay._batteryFullNotification = { close: () => {} };
    batteryOverlay.handleEvent({ type: 'powersupplystatuschanged' });
    expect(ScreenManager.turnScreenOn.mock.calls[0][0]).toEqual('powersupplystatuschanged');
    expect(batteryOverlay._batteryFullNotification).toEqual(null);
    done();
  });

});
