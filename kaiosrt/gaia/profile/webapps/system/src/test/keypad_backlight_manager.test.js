/* eslint-disable no-undef */
import '../../test/mocks/service';
import '../../test/mocks/PowerManager';
import KeypadBacklightManager from '../keypad_backlight_manager';

describe('keypad_backlight_manager.js test', () => {
  test('start function test', done => {
    expect(Service.register).toHaveBeenCalledTimes(1);
    expect(Service.register.mock.calls[0][0]).toEqual('turnKeypadBacklightOn');
    done();
  });

  test('_handle_screenchange test when screenEnabled is true', done => {
    const options = {
      detail: { screenEnabled : true }
    };
    window.dispatchEvent(new CustomEvent('screenchange', options));
    expect(PowerManager.setKeyLightEnabled).toHaveBeenCalledTimes(1);
    expect(PowerManager.setKeyLightEnabled.mock.calls[0][0]).toEqual(true);
    expect(PowerManager.setKeyLightBrightness).toHaveBeenCalledTimes(1);
    expect(PowerManager.setKeyLightBrightness.mock.calls[0][0]).toEqual(50);
    done();
  });

  test('_handle_screenchange test when screenEnabled is false', done => {
    const options = {
      detail: { screenEnabled : false }
    };
    window.dispatchEvent(new CustomEvent('screenchange', options));
    expect(PowerManager.setKeyLightEnabled).toHaveBeenCalledTimes(1);
    expect(PowerManager.setKeyLightEnabled.mock.calls[0][0]).toEqual(false);
    done();
  });

  test('createTimer function test', done => {
    jest.useFakeTimers();
    KeypadBacklightManager.createTimer();
    jest.runAllTimers();
    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(PowerManager.setKeyLightEnabled).toHaveBeenCalledTimes(1);
    expect(PowerManager.setKeyLightEnabled.mock.calls[0][0]).toEqual(false);
    expect(PowerManager.setKeyLightBrightness).toHaveBeenCalledTimes(1);
    expect(PowerManager.setKeyLightBrightness.mock.calls[0][0]).toEqual(10);
    expect(KeypadBacklightManager._turnOffTimer).not.toBeNull();
    expect(KeypadBacklightManager._decreaseBrightnessTimer).not.toBeNull();
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    done();
  });
});
