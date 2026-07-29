/* eslint-disable no-undef */
import '../../test/mocks/service';
import '../../test/mocks/mock_applications.js';
import '../../test/mocks/mock_hardware_buttons.js';

describe('voice_assistant.js test', () => {
  let instance;
  beforeEach((done) => {
    instance = require('../voice_assistant').default;
    jest.useFakeTimers();
    done();
  });

  test('start function test', (done) => {
    expect(Service.registerState).toHaveBeenCalledTimes(6);
    expect(Service.registerState.mock.calls[0][0]).toEqual('canResponseVA');
    expect(Service.registerState.mock.calls[1][0]).toEqual('getVAInAppIcon');
    expect(Service.registerState.mock.calls[2][0]).toEqual('isVAEnabled');
    expect(Service.registerState.mock.calls[3][0]).toEqual('isVIInstalled');
    expect(Service.registerState.mock.calls[4][0]).toEqual('selectedVAManifestURL');
    expect(Service.registerState.mock.calls[5][0]).toEqual('selectedVIManifestURL');
    expect(Service.register).toHaveBeenCalledTimes(3);
    expect(Service.register.mock.calls[0][0]).toEqual('initialVA');
    expect(Service.register.mock.calls[1][0]).toEqual('launchVA');
    expect(Service.register.mock.calls[2][0]).toEqual('cancelVA');
    done();
  });

  test('canResponseVA & inBlockVAModule function test', (done) => {
    const bool = instance.canResponseVA();
    expect(bool).toBeFalsy();
    const evt = {
      key: 'MicrophoneToggle',
      defaultPrevented: false,
      type: 'keydown',
      defaultPrevented: false,
      checkAfterkeydown: false,
      timeStamp: 100000000000000000,
    };
    jest.spyOn(instance, 'inBlockVAModule').mockReturnValueOnce(false);
    const bool2 = instance.canResponseVA(evt);
    expect(bool2).toBeTruthy();
    jest.spyOn(instance, 'inBlockVAModule').mockReturnValueOnce(true);
    const bool3 = instance.canResponseVA(evt);
    expect(bool3).toBeFalsy();
    done();
  });

  test('launchVA function test when inBlockVAModule is false', (done) => {
    const WebActivity = jest.fn();
    WebActivity.prototype.start = jest.fn();
    window.WebActivity = WebActivity;
    jest.spyOn(Service, 'query').mockReturnValueOnce({
      manifest: { name: 'name' },
      isHomescreen: false,
    });
    jest.spyOn(instance, 'inBlockVAModule').mockReturnValueOnce(false);
    instance.launchVA();
    expect(Service.query).toHaveBeenCalledTimes(2);
    expect(instance.inBlockVAModule).toHaveBeenCalledTimes(1);
    expect(WebActivity.prototype.start).toHaveBeenCalledTimes(1);
    done();
  });

  test('initialVA function test', () => {
    jest.spyOn(Service, 'query').mockReturnValueOnce({
      manifest: { name: 'name' },
      isHomescreen: false,
    });
    jest.spyOn(instance, 'cancelVA');
    jest.spyOn(instance, 'launchVA');
    instance.initialVA();
    expect(instance.cancelVA).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(hardwareButtons.HOLD_INTERVAL);
    expect(instance.launchVA).toHaveBeenCalledTimes(1);
  });

  test('cancelVA function test', () => {
    instance.cancelVA();
    expect(clearTimeout).toHaveBeenCalledTimes(1);
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});
