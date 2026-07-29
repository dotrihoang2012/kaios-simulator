/* eslint-disable no-undef */
import '../../test/mocks/l10n';
import '../../test/mocks/navigator/getDeviceStorage';
import '../../test/mocks/service';
import '../../test/mocks/Notification';
import DeviceStorageWatcher from '../storage_watcher';
import MockNotificationService from '../../test/mocks/mock_notification_service.js';

window.NotificationService = MockNotificationService;

describe('storage_watcher.js test', () => {
  test('start function test', done => {
    expect(DeviceStorageWatcher._firstCheck).toBeTruthy();
    expect(window.dsw).not.toBeUndefined();
    done();
  });

  test('start function test without getDeviceStorage function', done => {
    window.dsw = undefined;
    DeviceStorageWatcher._firstCheck = false;
    jest.spyOn(navigator.b2g, 'getDeviceStorage').mockReturnValueOnce(undefined);
    DeviceStorageWatcher.start();
    expect(DeviceStorageWatcher._firstCheck).toBeFalsy();
    expect(window.dsw).toBeUndefined();
    done();
  });

  test('_handle_homescreenopened function test', done => {
    const spy = jest.spyOn(Service, 'query');
    const evt = { detail: { isHomescreen: true}};
    window.dispatchEvent(new CustomEvent('homescreenopened', evt));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toEqual('getTopMostWindow');
    done();
  });

  test('_handle_almost-low-disk-space function test', done => {
    const notif = {
      tag: 'phone-almost-full',
      close: jest.fn()
    };
    const evt = { detail: { value: true}};
    window.dispatchEvent(new CustomEvent('almost-low-disk-space', evt));
    expect(Service.request).toHaveBeenCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('DialogService:show');
    const evt1 = { detail: { value: false}};
    window.dispatchEvent(new CustomEvent('almost-low-disk-space', evt1));
    done();
  });

  test('getFreeSpaceSize function test', async done => {
    DeviceStorageWatcher.start();
    await DeviceStorageWatcher.getFreeSpaceSize();
    done();
  });

  test('launchSettings function test', done => {
    const spy = jest.spyOn(Service, 'query');
    const WebActivity = jest.fn();
    WebActivity.prototype.start = (cb1) => {
      cb1();
    };
    window.WebActivity = WebActivity;
    DeviceStorageWatcher.launchSettings();
    WebActivity.prototype.start = (cb1, cb2) => {
      cb2();
    };
    window.WebActivity = WebActivity;
    DeviceStorageWatcher.launchSettings();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0]).toEqual('getTopMostWindow');
    expect(spy.mock.calls[1][0]).toEqual('getTopMostWindow');
    done();
  });

  test('_handle_change function test with low-disk-space', done => {
    const spy = jest.spyOn(Service, 'query')
      .mockReturnValueOnce({ isHomescreen: true });
    const evt = {
      reason: 'low-disk-space'
    };
    DeviceStorageWatcher._handle_change(evt);
    expect(DeviceStorageWatcher._hitLowestLevel).toBeTruthy();
    expect(DeviceStorageWatcher._firstCheck).toBeFalsy();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(Service.request).toHaveBeenCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('DialogService:show');
    done();
  });

  test('_handle_change function test with available-disk-space', done => {
    const evt = {
      reason: 'available-disk-space'
    };
    DeviceStorageWatcher._handle_change(evt);
    expect(DeviceStorageWatcher._hitLowestLevel).toBeFalsy();
    expect(Service.request).toHaveBeenCalledTimes(1);
    expect(Service.request.mock.calls[0][0]).toEqual('DialogService:hide');
    expect(Service.request.mock.calls[0][1]).toEqual('low-storage-warning');
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});
