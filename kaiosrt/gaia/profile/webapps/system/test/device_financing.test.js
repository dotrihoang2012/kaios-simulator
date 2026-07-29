import Service from '../js/service.js';
import './mocks/asyncStorage';
import MockNavigatorFinancing from './mocks/mock_navigator_financing.js';
import MockLocalStorage from './mocks/mock_localStorage.js';
import MockNavigatorMozAlarms from './mocks/mock_navigator_mozAlarms.js';
import MockAlarmMessageHandler from './mocks/mock_alarmMessageHandler.js';
import MockNotificationService from './mocks/mock_notification_service.js';

import './mocks/Notification.js';
import './mocks/l10n.js';
import './mocks/mock_appOrigin.js';
import './mocks/AppsManager';
window.localStorage = MockLocalStorage;
global.InitLogoHandler = {
  finished: true
};
global.navigator.mozAlarms = MockNavigatorMozAlarms;
global.navigator.dfc = MockNavigatorFinancing;
global.AlarmMessageHandler = MockAlarmMessageHandler;
window.NotificationService = MockNotificationService;

require('../js/device_financing');

describe('device financing init ', () => {
  const DeviceFinancingStore = window.DeviceFinancingStore;
  const deviceFinancingStore = new DeviceFinancingStore();
  //  var showDueNotice = sinon.stub(deviceFinancingStore, 'showDueNotice');
  //  var showOfflineWarningNotice =
  //    sinon.stub(deviceFinancingStore, 'showOfflineWarningNotice');
  deviceFinancingStore.deviceFinancingEnabled = true;
  test('device financing start', (done) => {
    let backUp = deviceFinancingStore.getDeviceFinancingInfo;
    deviceFinancingStore.getDeviceFinancingInfo = jest.fn();
    deviceFinancingStore.debug = jest.fn();
    deviceFinancingStore.start();
    deviceFinancingStore.init();

    expect(deviceFinancingStore.getDeviceFinancingInfo.mock.calls.length).toBe(1);
    done();
    deviceFinancingStore.getDeviceFinancingInfo = backUp;
  });

  // Level: -1:unkown, 0:normal, 1:remind, 2:due, 3: warn, 4:overdue1, 5: overdue2, 6: lock
  // state: 0: UNCONFIGURED, 1: CONFIGURED, 2:  DEACTIVATED,
  /*  'normal',
   *  'due-remind', // 1~3 Days Before Due Date, notification
   *  'due-today',  // due today, notification
   *  'overdue-level1', // 1~6 Days overdue, prompt
   *  'overdue-level2', // 7~13 Days overdue, prompt and restrict app
   *  'overdue-level3-lock', // lock device, modem can work
   *  'overdue-level1-no-internet', // ???
   *  'overdue-modem-lock', // lock device, modem lock
   *  'inactivation-lock', // device lock, modem lock
   *  'unlocked-permanently'
   */

  test('device financing level -1 test', (done) => {
    navigator.dfc.set({
      level: -1
    });
    deviceFinancingStore.getDeviceFinancingInfo().then(() => {
      expect(deviceFinancingStore.info.level).toBe('normal');
      done();
    });
  });

  test('device financing level 0 test', (done) => {
    navigator.dfc.set({
      level: 0
    });
    deviceFinancingStore.getDeviceFinancingInfo().then(() => {
      expect(deviceFinancingStore.info.level).toBe('normal');
      done();
    });
  });

  describe('device financing level 1 test', () => {
    test('device financing due-remind 1 day test', (done) => {
      navigator.dfc.set({
        level: 1,
        nextLevelOffset: 0
      });
      deviceFinancingStore.getDeviceFinancingInfo().then(() => {
        expect(deviceFinancingStore.info.level).toBe('due-remind');
        expect(deviceFinancingStore.info.leftDays).toBe(1);
        done();
      });
    });
    test('device financing due-remind 2 day test', (done) => {
      navigator.dfc.set({
        level: 1,
        nextLevelOffset: 86400
      });
      deviceFinancingStore.getDeviceFinancingInfo().then(() => {
        expect(deviceFinancingStore.info.level).toBe('due-remind');
        expect(deviceFinancingStore.info.leftDays).toBe(2);
        done();
      });
    });
    test('device financing due-remind 3 day test', (done) => {
      navigator.dfc.set({
        level: 1,
        nextLevelOffset: 86400 * 3 - 1
      });
      deviceFinancingStore.getDeviceFinancingInfo().then(() => {
        expect(deviceFinancingStore.info.level).toBe('due-remind');
        expect(deviceFinancingStore.info.leftDays).toBe(3);
        done();
      });
    });
    test('device financing due-remind nextLevelOffset overflow test', (done) => {
      navigator.dfc.set({
        level: 1,
        nextLevelOffset: 86400 * 4
      });
      deviceFinancingStore.getDeviceFinancingInfo().then(() => {
        expect(deviceFinancingStore.info.level).toBe('due-remind');
        expect(deviceFinancingStore.info.leftDays).toBe(3);
        done();
      });
    });
  });

  test('device financing level 2 test', (done) => {
    navigator.dfc.set({
      level: 2,
      nextLevelOffset: 84300
    });
    deviceFinancingStore.getDeviceFinancingInfo().then(() => {
      expect(deviceFinancingStore.info.level).toBe('due-today');
      expect(deviceFinancingStore.info.leftDays).toBe(0);
      done();
    });
  });

  test('device financing level 3 test', (done) => {
    navigator.dfc.set({
      level: 3,
      lastUpdate: 123456789,
      nextLevelOffset: 86400 * 4
    });
    deviceFinancingStore.getDeviceFinancingInfo().then(() => {
      expect(deviceFinancingStore.info.level).toBe('overdue-level1');
      done();
    });
  });
  test('device financing level 3 test', (done) => {
    navigator.dfc.set({
      level: 3,
      lastUpdate: 12345678,
      nextLevelOffset: 86400 * 5
    });
    deviceFinancingStore.getDeviceFinancingInfo().then(() => {
      expect(deviceFinancingStore.offlineDays).toBe(-1);
      navigator.dfc.set({
        level: 3,
        lastUpdate: 12345678,
        nextLevelOffset: 86400 * 5 - 14400 - 1
      });
      deviceFinancingStore.getDeviceFinancingInfo().then(() => {
        expect(deviceFinancingStore.offlineDays).toBe(0);
        navigator.dfc.set({
          level: 3,
          lastUpdate: 12345678,
          nextLevelOffset: 86400 * 4 + 1
        });
        deviceFinancingStore.getDeviceFinancingInfo().then(() => {
          expect(deviceFinancingStore.offlineDays).toBe(0);
          navigator.dfc.set({
            level: 3,
            lastUpdate: 12345678,
            nextLevelOffset: 86400 * 4 - 1
          });
          deviceFinancingStore.getDeviceFinancingInfo().then(() => {
            expect(deviceFinancingStore.offlineDays).toBe(1);
            navigator.dfc.set({
              level: 3,
              lastUpdate: 12345678,
              nextLevelOffset: 86400 * 3 + 1000
            });
            deviceFinancingStore.getDeviceFinancingInfo().then(() => {
              expect(deviceFinancingStore.offlineDays).toBe(1);
              navigator.dfc.set({
                level: 3,
                lastUpdate: 12345678,
                nextLevelOffset: 86400 - 1
              });
              deviceFinancingStore.getDeviceFinancingInfo().then(() => {
                expect(deviceFinancingStore.offlineDays).toBe(4);
                done();
              });
            });
          });
        });
      });
    });
  });

  test('device financing level 4 test', (done) => {
    navigator.dfc.set({
      level: 4
    });
    deviceFinancingStore.getDeviceFinancingInfo().then(() => {
      expect(deviceFinancingStore.info.level).toBe('overdue-level2');
      expect(deviceFinancingStore.promptRestrictedAppDialog({
        manifestUrl: 'http://camera.localhost/manifest.webmanifest'
      })).toBe(true);
      expect(deviceFinancingStore.promptRestrictedAppDialog({
        manifestUrl: 'http://gallery.localhost/manifest.webmanifest'
      })).toBe(false);
      done();
    });
  });
  test('device financing level 4 applist test', (done) => {
    navigator.dfc.set({
      level: 4,
      appList: ['https://gallery.local/manifest.webapp']
    });
    deviceFinancingStore.getDeviceFinancingInfo().then(() => {
      expect(deviceFinancingStore.info.level).toBe('overdue-level2');
      expect(deviceFinancingStore.promptRestrictedAppDialog({
        manifestUrl: 'https://camera.local/manifest.webapp'
      })).toBe(false);
      expect(deviceFinancingStore.promptRestrictedAppDialog({
        manifestUrl: 'https://gallery.local/manifest.webapp'
      })).toBe(true);
      done();
    });
  });
  test('device financing level 5 test', (done) => {
    navigator.dfc.set({
      level: 5,
      state: 1
    });
    deviceFinancingStore.getDeviceFinancingInfo().then(() => {
      expect(deviceFinancingStore.info.level).toBe('overdue-level3-lock');
      expect(deviceFinancingStore.promptRestrictedAppDialog({
        manifestURL: 'app://camera.gaiamobile.org/manifest.webapp'
      })).toBe(false);
      expect(deviceFinancingStore.promptRestrictedAppDialog({
        manifestURL: 'app://gallery.gaiamobile.org/manifest.webapp'
      })).toBe(false);
      done();
    });
  });
  describe('device financing state 0 test', () => {
    test('device financing inactivaty lock test', (done) => {
      navigator.dfc.set({
        level: 6,
        state: 0
      });
      deviceFinancingStore.getDeviceFinancingInfo().then(() => {
        expect(deviceFinancingStore.info.level).toBe('inactivation-lock');
        done();
      });
    });
    test('device financing inactivaty normal test', (done) => {
      navigator.dfc.set({
        level: 3,
        state: 0
      });
      deviceFinancingStore.getDeviceFinancingInfo().then(() => {
        expect(deviceFinancingStore.info.level).toBe('normal');
        done();
      });
    });
  });
  test('device financing unlock test', (done) => {
    navigator.dfc.set({
      level: 3,
      state: 2
    });
    deviceFinancingStore.getDeviceFinancingInfo().then(() => {
      expect(deviceFinancingStore.info.level).toBe('unlocked-permanently');
      done();
    });
  });
  test('device financing level 6 test', (done) => {
    navigator.dfc.set({
      level: 6,
      state: 1
    });
    deviceFinancingStore.getDeviceFinancingInfo().then(() => {
      expect(deviceFinancingStore.info.level).toBe('overdue-modem-lock');
      done();
    });
  });
});
