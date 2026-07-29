/* eslint-disable no-undef */
import MockNotificationService from '../../test/mocks/mock_notification_service.js';
import '../../test/mocks/mock_appOrigin';
import '../../test/mocks/l10n';
import '../../test/mocks/SettingsObserver';
import '../../test/mocks/simslot_manager';
import '../../test/mocks/service';

window.NotificationService = MockNotificationService;

describe('voicemail.js test', () => {
  let Voicemail = null;
  beforeAll(done => {
    navigator.b2g = {};
    Voicemail = require('../voicemail').default;
    done();
  });

  test('start function test with navigator.b2g.voicemail is undefined', done => {
    expect(Voicemail.icon).toBeNull();
    done();
  });

  test('start function test with navigator.b2g.voicemail is obj', done => {
    require('../../test/mocks/navigator/voicemail');
    const setupNotificationsSpy = jest.spyOn(Voicemail, 'setupNotifications')
      .mockImplementationOnce(() => {});
    Voicemail.start();
    expect(Voicemail.icon).toBe('http://system.localhost/style/icons/voicemail.png');
    expect(setupNotificationsSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('handleEvent function test', done => {
    const updateNotificationSpy = jest.spyOn(Voicemail, 'updateNotification')
      .mockImplementationOnce(() => {});
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const evt = {
      status: true
    };
    Voicemail.handleEvent(evt);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(updateNotificationSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('updateNotification function test', async done => {
    const showNotificationSpy = jest.spyOn(Voicemail, 'showNotification')
      .mockImplementationOnce(() => {});
    require('../../test/mocks/navigator/voicemail');
    navigator.b2g.voicemail.getNumber.mockReturnValueOnce('1111');
    // test for showNotification branch
    const status = {
      hasMessages: true,
      messageCount: 3,
      serviceId: 'testId'
    };
    await Voicemail.updateNotification(status);
    expect(showNotificationSpy).toHaveBeenCalledTimes(1);
    expect(showNotificationSpy.mock.calls[0]).toEqual([ 'newVoicemails', 'dialNumber', '‎1111', 'testId' ]);

    // test for hideNotification branch
    const hideNotificationSpy = jest.spyOn(Voicemail, 'hideNotification')
      .mockImplementationOnce(() => {});
    const status1 = {
      serviceId: 'testId'
    };
    await Voicemail.updateNotification(status1);
    expect(hideNotificationSpy).toHaveBeenCalledTimes(1);
    expect(hideNotificationSpy.mock.calls[0][0]).toBe('testId');
    done();
  });

  test('showNotification function test', async done => {
    // window.Notification is undefined
    Voicemail.showNotification();

    // window.Notification isn't undefined & click callback test
    require('../../test/mocks/Notification');
    require('../../test/mocks/navigator/telephony');
    Notification.prototype.addEventListener.mockImplementation((key, cb) => {
      key === 'click' && cb();
    });
    await Voicemail.showNotification('title', 'text', 'voicemailNumber');
    expect(Service.request).toHaveBeenCalledTimes(1);
    const spyObserver = jest
      .spyOn(SettingsObserver, 'getValue')
      .mockResolvedValueOnce(false);
    await Voicemail.showNotification('title', 'text', 'voicemailNumber');
    expect(spyObserver).toHaveBeenCalledTimes(1);
    expect(Service.request).toHaveBeenCalledTimes(2);
    expect(Service.request.mock.calls[0][0]).toEqual('DialogService:show');
    expect(Voicemail.notifications[0]).not.toBeNull();

    // close callback test
    Notification.prototype.addEventListener.mockImplementation((key, cb) => {
      key === 'close' && cb();
    });
    await Voicemail.showNotification('title', 'text', 'voicemailNumber');
    done();
  });

  test('hideNotification function test', done => {
    Voicemail.hideNotification(0);
    done();
  });

  test('checkVoicemailStatus function test', async done => {
    SettingsObserver.setValue([{
      name: 'notifications.resend',
      value: true
    }]);
    const updateNotificationSpy = jest.spyOn(Voicemail, 'updateNotification')
      .mockImplementationOnce(() => {});
    await Voicemail.checkVoicemailStatus();
    require('../../test/mocks/navigator/voicemail');
    require('../../test/mocks/navigator/mobileConnections');
    navigator.b2g.voicemail.getStatus.mockReturnValueOnce({ hasMessages: true });
    await Voicemail.checkVoicemailStatus();
    expect(updateNotificationSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('showVoicemailSettings function test', done => {
    const start = jest.fn();
    const WebActivity = jest.fn();
    WebActivity.prototype.start = start;
    window.WebActivity = WebActivity;
    Voicemail.showVoicemailSettings();
    expect(start).toHaveBeenCalledTimes(1);
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });

  afterAll(done => {
    navigator.b2g = undefined;
    done();
  });
});
