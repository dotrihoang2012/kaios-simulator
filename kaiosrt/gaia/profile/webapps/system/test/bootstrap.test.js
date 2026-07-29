require('./mocks/mock_appOrigin');
require('./mocks/SettingsObserver');
require('./mocks/performance');
require('./mocks/PowerManager');
require('./mocks/service');
require('./mocks/l10n');
require('./mocks/MessageChannel');
require('./mocks/external_screen_manager');
require('./mocks/asyncStorage');
require('./mocks/mock_appOrigin');
require('./mocks/navigator/getBattery');

document.body.innerHTML =
  `<div id="windows" data-z-index-level="app" />
   <div id="dialog-overlay" data-z-index-level="dialog-overlay"/>
   <iframe id="sw-proxy" src="../proxy.html" /iframe>
  `;

import Requester from 'hawk-requester';
global.Requester = Requester;
global.tick = () => new Promise(res => setImmediate(res));
global.LazyLoader = {
  skipBlockFile: false,
  load: (filePath, callback) => {
    // Becase ?. only need update jest to 26.x.x => node update to  v12...
    const blockFileArray = ['keyboard_manager', 'account_manager'];
    if (typeof filePath === 'string') {
      if (!filePath.includes('shared') && !filePath.includes('style')) {
        require('../' + filePath);
      }
    } else {
      filePath.forEach(path => {
        if (!path.includes('shared') &&
          !path.includes('style')) {
          if (!LazyLoader.skipBlockFile) {
            require('../' + path);
          } else {
            let isBlockFile = blockFileArray.find(key => {
              return path.includes(key)
            });
            if (!isBlockFile) {
              require('../' + path);
            }
          }
        }
      });
    }
    if (callback) {
      callback();
    }
  }
};

navigator.b2g = {};
navigator.b2g.addWakeLockListener = jest.fn();
navigator.b2g.getWakeLockState = jest.fn();
navigator.b2g.requestWakeLock = jest.fn();
global.navigator.b2g.getDeviceStorages = jest.fn(() => []);
global.ClientIdCustomizer = {
  parse: (value) => value
};
global.KeyboardManager = {
  init: jest.fn()
};

window.DUMP = jest.fn();
window.focus = jest.fn();


// Verify relate file base import without error
require('../js/base_ui.js');
require('../js/alarm_message_handler.js');
require('../js/power_save.js');
require('../js/base_module.js');
require('../js/idletimer.js');
require('../js/homescreen_launcher.js');
require('../js/homescreen_window_manager.js');
require('../js/browser_settings.js');
require('../js/browser.js');
require('../js/wallpaper_manager.js');
require('../js/applications.js');
require('../js/wake_lock_manager.js');
require('../js/screen_brightness_transition.js');
require('../js/screen_manager.js');
require('../js/ftu_launcher.js');
require('../js/app_window_manager.js');
require('../js/activity_window_manager.js');
require('../js/app_window_factory.js');
require('../js/attention_window_manager.js');
require('../js/secure_window_factory.js');
require('../js/secure_window_manager.js');
require('../js/system_dialog.js');
require('../js/system_dialog_manager.js');
require('../js/dialer_agent.js');
require('../js/visibility_manager.js');
require('../js/layout_manager.js');

describe('bootstrap test',  () => {
  beforeAll(async () => {
    require('../js/bootstrap.js');
    expect(window.browserSettings).not.toBe(undefined);
    await tick();
    expect(applications.ready).toBe(false);
    window.dispatchEvent(new CustomEvent('load'));
    expect(window.performance.mark).toBeCalledTimes(2);
    expect(window.performance.mark.mock.calls[0]).toEqual(['applications-start']);
    expect(window.performance.mark.mock.calls[1]).toEqual(['loadEnd']);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  test('bootstrap wallpaperchange', () => {
    jest.spyOn(document.documentElement.style, 'setProperty');
    window.dispatchEvent(new CustomEvent('wallpaperchange', {
      detail: { url: 'testurl'}
    }));
    expect(document.documentElement.style.setProperty.mock.calls[0])
      .toEqual(['--wallpaper-url', "url('testurl')"]);
  });

  test('bootstrap applicationready ', () => {
    jest.spyOn(FtuLauncher, 'retrieve').mockImplementation(() => {});
    jest.spyOn(window.homescreenLauncher, 'start').mockImplementation(() => {});
    expect(FtuLauncher.retrieve).toBeCalledTimes(0);
    window.dispatchEvent(new CustomEvent('applicationready'));
    expect(FtuLauncher.retrieve).toBeCalledTimes(1);
    expect(window.homescreenLauncher.start).toBeCalledTimes(1);
  });

  test('bootstrap ftudone/ftuskip ', () => {
    jest.spyOn(SettingsObserver, 'setValue');
    jest.spyOn(window, 'removeEventListener').mockImplementation(() => {});
    window.dispatchEvent(new CustomEvent('ftudone'));
    expect(window.performance.mark.mock.calls[0]).toEqual(['done-with-ftu']);
    expect(SettingsObserver.setValue.mock.calls[0]).toEqual([[{
      name: 'gaia.system.checkForUpdates',
      value: true
    }]]);

    window.dispatchEvent(new CustomEvent('ftuskip'));
    expect(window.performance.mark.mock.calls[1]).toEqual(['done-with-ftu']);
    expect(SettingsObserver.setValue.mock.calls[1]).toEqual([[{
      name: 'gaia.system.checkForUpdates',
      value: true
    }]]);
  });

  test('bootstrap homescreenloaded ', async () => {
    jest.spyOn(SettingsObserver, 'observe').mockImplementation(
      (key, defaultValue, callback, observeOnly) => {
      if (!observeOnly) {
        setTimeout(() => callback(defaultValue));
      }
    });
    LazyLoader.skipBlockFile = true;
    window.dispatchEvent(new CustomEvent('homescreenloaded'));
    expect(window.performance.mark.mock.calls[0]).toEqual(['delayed-launch']);
    expect(window.performance.mark.mock.calls[1]).toEqual(['fullyLoaded']);
    expect(KeyboardManager.init).toBeCalledTimes(1);
    expect(window.activities).not.toBe(undefined);
    expect(window.accessibility).not.toBe(undefined);
    expect(window.cpuManager).not.toBe(undefined);
    expect(window.developerHUD).not.toBe(undefined);
    expect(window.remoteDebugger).not.toBe(undefined);
    expect(window.places).not.toBe(undefined);
    expect(window.browserPinSitesStore).not.toBe(undefined);
    expect(window.ttlView).not.toBe(undefined);
    expect(window.externalStorageMonitor).not.toBe(undefined);
    expect(window.sleepMenu).not.toBe(undefined);
    expect(window.usbStorage).not.toBe(undefined);
    expect(window.deviceFinancingStore).not.toBe(undefined);
  });
});


