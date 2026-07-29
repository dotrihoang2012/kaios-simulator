import '../../test/mocks/mock_appOrigin.js';
import '../../test/mocks/SettingsObserver';
import '../../test/mocks/service';
import Voicemail from '../voicemail';
import MockApplications from '../../test/mocks/mock_applications';
import MockDownloadNotificationStore from '../../test/mocks/DownloadNotificationStore';
import NotificationStore from '../notification_store';

jest.mock('../voicemail', () => {
  return { icon: 'VoicemailIcon' };
});

describe('NotificationStore', () => {
  const sendCB = jest.fn();
  const storeReadyCB = jest.fn();
  const clickCB = jest.fn();
  const notiCloseCB = jest.fn();
  const resendAllCB = jest.fn();
  beforeAll(done => {
    global.applications = MockApplications;
    global.DownloadNotificationStore = MockDownloadNotificationStore;
    window.ExternalScreenManager = {
      send: sendCB
    };
    done();
  });

  describe('start function test', () => {
    const resendSpy = jest.spyOn(NotificationStore, '_resendStoredNotifications')
      .mockImplementation(() => {});
    const resetSpy = jest.spyOn(NotificationStore, 'resetNewComingCount')
      .mockImplementation(() => {});
    const observeSpy = jest.spyOn(SettingsObserver, 'observe');

    beforeAll(done => {
      window.dispatchEvent(new CustomEvent('load'));
      done();
    });

    test('function execute test', done => {
      expect(NotificationStore.notificationMap instanceof Map).toBeTruthy();
      expect(NotificationStore.newComingCountMap instanceof Map).toBeTruthy();
      expect(NotificationStore.newComingCountSize).toBe(0);
      expect(resendSpy).toBeCalledTimes(0);
      expect(resetSpy).toBeCalledTimes(1);
      expect(Service.register).toBeCalledTimes(5);
      expect(Service.register.mock.calls[0][0]).toEqual('handleEvent');
      expect(Service.register.mock.calls[1][0]).toEqual('add');
      expect(Service.register.mock.calls[2][0]).toEqual('remove');
      expect(Service.register.mock.calls[3][0]).toEqual('clearAppNotice');
      expect(Service.register.mock.calls[4][0]).toEqual('removeSystemNoticeByTag');

      expect(Service.registerState).toBeCalledTimes(4);
      expect(Service.registerState.mock.calls[0][0]).toEqual('getAll');
      expect(Service.registerState.mock.calls[1][0]).toEqual('isResending');
      expect(Service.registerState.mock.calls[2][0]).toEqual('unreadCount');
      expect(Service.registerState.mock.calls[3][0]).toEqual('lockscreenContentShow');

      expect(observeSpy).toBeCalledTimes(2);
      expect(observeSpy.mock.calls[0][0]).toEqual('lockscreen.notifications-preview.enabled');
      expect(observeSpy.mock.calls[1][0]).toEqual('lockscreen.notifications.content.enabled');
      done();
    });
    test('resend notice test', done => {
      window.dispatchEvent(new CustomEvent('applicationready'));
      expect(resendSpy).toBeCalledTimes(0);
      done();
    });
    test('applicationenabledstatechange callback test', done => {
      const evt = {
        detail: {
          application: {
            manifest: 'manifest',
            enabled: false
          },
          role: 'invisible'
        }
      };
      window.dispatchEvent(new CustomEvent('applicationenabledstatechange', evt));
      done();
    });
  });

  test('add function test', done => {
    NotificationStore.start();
    jest.spyOn(MockApplications, 'getByManifestURL').mockReturnValue({
      manifest: 'https://settings.local/manifest.webapp'
    });
    jest.spyOn(Date.prototype, 'getTime').mockImplementation(() => 1608530615437);
    const detail = {
      manifestURL: 'manifestUrl',
      mozbehavior: 'mozbehavior',
      id: "1111",
      type: 'certified'
    };
    NotificationStore.add(detail);
    expect(NotificationStore.notificationMap.get("1111")).toEqual({
      "dismissable": true,
      "id": "1111",
      "manifestURL": "manifestUrl",
      "mozbehavior": "mozbehavior",
      "timestamp": 1608530615437,
      "type": "certified"
    });
    expect(Service.request).toHaveBeenCalledWith('NotificationToaster:show', NotificationStore.notificationMap.get("1111"));

    const detail1 = {
      manifestURL: 'manifestUrl222',
      mozbehavior: { noclear: true },
      id: "2222",
      type: 'certified',
      requireInteraction: true
    };
    NotificationStore.add(detail1);
    expect(NotificationStore.notificationMap.get("2222")).toEqual({
      "dismissable": false,
      "id": "2222",
      "manifestURL": "manifestUrl222",
      "mozbehavior": { noclear: true },
      "requireInteraction": true,
      "timestamp": 1608530615437,
      "type": "certified"
    });
    expect(Service.request).toHaveBeenCalledWith('NotificationDialogView:show', NotificationStore.notificationMap.get("2222"));
    expect(NotificationStore.notificationMap.size).toBe(2);
    done();
  });

  test('clearAppNotice function test', done => {
    const removeSpy = jest.spyOn(NotificationStore, 'remove')
      .mockImplementation(() => {});
    NotificationStore.notificationMap = new Map();
    NotificationStore.notificationMap.set("test11", {
      id: "test11",
      manifestURL: 'manifestUrl111'
    });
    NotificationStore.clearAppNotice('manifestUrl111');
    expect(removeSpy).toBeCalledTimes(1);
    done();
  });

  test('unreadCount/getAll function test', done => {
    NotificationStore.notificationMap = new Map();
    NotificationStore.notificationMap.set("test22", {
      id: "test22",
      manifestURL: 'manifestUrl111'
    });
    const unreadCount = NotificationStore.unreadCount();
    expect(unreadCount).toBe(1);
    const notis = NotificationStore.getAll();
    expect(notis instanceof Map).toBeTruthy();
    expect(notis.size).toBe(1);
    done();
  });

  test('_observe_lockscreen.notifications-preview.enabled function test', done => {
    NotificationStore['_observe_lockscreen.notifications-preview.enabled']('value11');
    expect(NotificationStore.lockscreenPreview).toBe('value11');
    expect(sendCB).toBeCalledTimes(1);
    done();
  });

  test('_observe_lockscreen.notifications.content.enabled function test', done => {
    NotificationStore['_observe_lockscreen.notifications.content.enabled']('value11');
    expect(NotificationStore.lockscreenContentShow).toBe('value11');
    NotificationStore['_observe_lockscreen.notifications.content.enabled']();
    expect(NotificationStore.lockscreenContentShow).toBeTruthy();
    done();
  });

  test('isImage function test', done => {
    const bool = NotificationStore.isImage('test.png');
    expect(bool).toBeTruthy();

    const bool1 = NotificationStore.isImage('test.jpg');
    expect(bool1).toBeFalsy();
    done();
  });

  test('storeReady function test', done => {
    window.addEventListener('notification-store-ready', storeReadyCB);
    NotificationStore.storeReady();
    expect(storeReadyCB).toBeCalledTimes(1);
    done();
  });

  test('click function test', done => {
    NotificationStore.notificationMap = new Map();
    NotificationStore.notificationMap.set("test11", {
      id: "test22",
      requireInteraction: true
    });
    NotificationStore.click('test11');
    expect(Service.request.mock.calls[0][0]).toBe('NotificationDialogView:show');

    const notiCB = jest.fn();
    NotificationStore.notificationMap.set("test22", {
      id: "test22",
      callback: notiCB
    });
    NotificationStore.click('test22');
    expect(notiCB).toBeCalledTimes(1);

    NotificationStore.notificationMap.set("test33", {
      id: "test22",
    });
    window.addEventListener('desktop-notification-click', clickCB);
    NotificationStore.click('test33');
    expect(clickCB).toBeCalledTimes(1);
    done();
  });

  test('removeAll function test', done => {
    const removeSpy = jest.spyOn(NotificationStore, 'remove')
      .mockImplementation(() => {});
    NotificationStore.notificationMap = new Map();
    NotificationStore.notificationMap.set("test11", {
      id: "test22",
      requireInteraction: true
    });
    NotificationStore.notificationMap.set("test22", {
      id: "test22",
      callback: jest.fn()
    });
    NotificationStore.removeAll();
    expect(removeSpy).toBeCalledTimes(2);
    done();
  });

  test('remove function test', done => {
    NotificationStore.notificationMap = new Map();
    NotificationStore.notificationMap.set("test11", {
      id: "test22",
      type: 'download-notification-11'
    });
    NotificationStore.notificationMap.set("test22", {
      id: "test22",
      type: "type"
    });
    window.addEventListener('desktop-notification-close', notiCloseCB);
    NotificationStore.remove("test11");
    NotificationStore.remove("test22", true);
    expect(DownloadNotificationStore.removeNotification).toBeCalledTimes(1);
    expect(NotificationStore.notificationMap.get("test11")).toBeUndefined();
    expect(NotificationStore.notificationMap.get("test22")).toBeUndefined();
    expect(notiCloseCB).toBeCalledTimes(2);
    done();
  });

  test('_resendStoredNotifications function test', async done => {
    const storeReadySpy = jest.spyOn(NotificationStore, 'storeReady')
      .mockImplementation(() => {});
    window.addEventListener('desktop-notification-resend-all', resendAllCB);
    await NotificationStore._resendStoredNotifications();
    jest.spyOn(SettingsObserver, 'getValue')
      .mockResolvedValueOnce(false);
    await NotificationStore._resendStoredNotifications();
    done();
  });

  test('handleEvent function test', done => {
    const addSpy = jest.spyOn(NotificationStore, 'add')
      .mockImplementation(() => {});
    const removeSpy = jest.spyOn(NotificationStore, 'remove')
      .mockImplementation(() => {});
    jest.spyOn(MockApplications, 'getByManifestURL').mockReturnValue({
      manifest: {
        icons: []
      }
    });
    MockApplications.getSuitableIconSrc.mockReturnValue('');
    const evt = {
      detail: {
        type: 'desktop-notification',
        id: 'null11',
        icon: 'chrome://system/icon/icon.png'
      }
    };
    NotificationStore.handleEvent(evt);
    const evt2= {
      detail: { type: 'desktop-notification-remove' }
    };
    NotificationStore.handleEvent(evt2);
    expect(removeSpy).toBeCalledTimes(1);
    done();
  });

  test('addNewComingCount function test', done => {
    NotificationStore.start();
    const detail = {
      manifestURL: 'http://system.localhost/manifest.webmanifest',
      appIcon: '',
      icon: 'VoicemailIcon',
      id: ''
    };
    NotificationStore.addNewComingCount(detail);
    expect(NotificationStore.newComingCountMap.get('Voicemail')).toEqual({
      "count": 1,
      "icon": "VoicemailIcon"
    });
    const detail1 = {
      manifestURL: 'manifestURL',
      appIcon: '',
      icon: 'style/bluetooth_transfer/images/icon_bluetooth.png',
      id: ''
    };
    NotificationStore.addNewComingCount(detail1);
    expect(NotificationStore.newComingCountMap.get('Bluetooth')).toEqual({
      "count": 1,
      "icon": "style/bluetooth_transfer/images/icon_bluetooth.png"
    });
    const detail2 = {
      manifestURL: 'manifestURL',
      appIcon: '',
      icon: 'icon',
      id: '',
      data: {
        systemMessageTarget: 'system-download'
      }
    };
    NotificationStore.addNewComingCount(detail2);
    expect(NotificationStore.newComingCountMap.get('Download')).toEqual({
      "count": 1,
      "icon": "icon"
    });
    const detail3 = {
      manifestURL: 'manifestURL',
      appIcon: '',
      icon: 'icon',
      id: 'batteryFull'
    };
    NotificationStore.addNewComingCount(detail3);
    expect(NotificationStore.newComingCountMap.get('BatteryFull')).toEqual({
      "count": 1,
      "icon": "style/notifications/images/battery_full.png"
    });
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  afterAll(done => {
    global.applications = undefined;
    window.ExternalScreenManager = undefined;
    window.removeEventListener('notification-store-ready', storeReadyCB);
    window.removeEventListener('desktop-notification-click', clickCB);
    window.removeEventListener('desktop-notification-close', notiCloseCB);
    window.removeEventListener('desktop-notification-resend-all', resendAllCB);
    done();
  });
});
