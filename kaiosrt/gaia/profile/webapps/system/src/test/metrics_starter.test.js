/* eslint-disable no-undef */
import '../../test/mocks/SettingsObserver';
import '../../test/mocks/lazy_loader';

jest.mock('../eventlogger/eventlogger_manager', () => {
  return jest.fn().mockImplementation(() => {
    return { start: jest.fn() };
  });
});

jest.mock('../silent_app_install_manager', () => {
  return jest.fn().mockImplementation(() => {
    return { start: jest.fn() };
  });
});

describe('metrics_starter.js test', () => {
  test('start function test', done => {
    jest.spyOn(global.SettingsObserver, 'unobserve')
    require('../metrics_starter');
    expect(window.evlm).not.toBeUndefined();
    expect(SettingsObserver.unobserve).toHaveBeenCalledTimes(1);
    done();
  });

  test('start function test for jio', done => {
    jest.spyOn(global.SettingsObserver, 'observe')
      .mockImplementationOnce((name, defaultValue, callbackHandle) => {
        callbackHandle('jio');
      });
    const AppUsageMetrics = jest.fn();
    AppUsageMetrics.prototype.start = jest.fn();
    window.AppUsageMetrics = AppUsageMetrics;
    require('../metrics_starter');
    expect(window.appUsageMetrics).not.toBeUndefined();
    expect(window.isJioApplication).toBeTruthy();
    expect(SettingsObserver.unobserve).toHaveBeenCalledTimes(1);
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.resetModules();
    done();
  });
});
