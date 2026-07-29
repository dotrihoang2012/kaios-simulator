
global.tick = () => new Promise(res => setImmediate(res));
class WebActivity {
  start() {
    return new Promise (resolve => {
      resolve();
    })
  }
}
global.WebActivity = WebActivity;


describe('<download_helper.js> test', () => {
  const {
    mockB2gNavigator
  } = require('../mocks/navigator/b2g_navigator_mock');

  beforeAll((done) => {
    global.navigator.b2g = {};
    require('../mocks/navigator/getDeviceStorage');
    const mockgetDeviceStorages = () => {
      return [navigator.b2g.getDeviceStorage()]
    };
    mockB2gNavigator(global, 'getDeviceStorages', mockgetDeviceStorages);
    global.MimeMapper = {
      guessTypeFromFileProperties: jest.fn()
    };
    require('../mocks/navigator/downloadManager');
    require('../mocks/lazy_loader');
    require('../mocks/SettingsObserver');
    require('../../js/download/download_ui');
    require('../../js/download/download_formatter');
    require('../../js/download/download_helper');
    done();
  });

  beforeEach((done) => {
    jest
      .spyOn(console, 'error').mockImplementation(() => {});
    done();
  });

  const download = {
    totalBytes: 5242880,
    currentBytes: 755617,
    url: "http://web4host.net/5MB.zip",
    path: "/mnt/media_rw/9016-4EF8/downloads/5…",
    storageName: "sdcard",
    storagePath: "downloads/5MB.zip",
    state: "finalized",
    contentType: "application/zip",
    startTime: new Date('2020-12-12T00:00:00.000Z'),
    id: "download-0",
    pause: jest.fn()
  };

  test('open function test', (done) => {
    jest.useFakeTimers();
    const {
      open
    } = DownloadHelper;

    jest
      .spyOn(MimeMapper, 'guessTypeFromFileProperties')
      .mockReturnValue('application/zip');

    jest
      .spyOn(global, 'setTimeout');

    const getFileNameSpy = jest
      .spyOn(DownloadFormatter, 'getFileName');

    const value = open(download);

    value.onsuccess = jest.fn();
    value.done();
    expect(getFileNameSpy).toBeCalledTimes(0);
    expect(value.onsuccess).toBeCalledTimes(0);
    expect(setTimeout).toBeCalledTimes(2);
    expect(setTimeout).toBeCalledWith(expect.any(Function), 0);
    expect(typeof value).toBe('object');

    jest.runAllTimers();
    expect(getFileNameSpy).toBeCalledTimes(1);
    expect(value.onsuccess).toBeCalledTimes(1);
    done();
  });

  test('share function test', (done) => {
    jest.useFakeTimers();
    const {
      share
    } = DownloadHelper;

    const spy = jest
      .spyOn(MimeMapper, 'guessTypeFromFileProperties')
      .mockReturnValue('');

    const mockgetDeviceStorage = () => {
      const value = navigator.b2g.getDeviceStorage();
      value.storageName = '';
      return [value];
    };
    mockB2gNavigator(global, 'getDeviceStorages', mockgetDeviceStorage);

    const value = share(download);
    value.onerror = jest.fn();
    value.failed();
    expect(spy).toBeCalledTimes(0);
    expect(value.onerror).toBeCalledTimes(0);

    jest.runAllTimers();
    expect(spy).toBeCalledTimes(1);
    expect(value.onerror).toBeCalledTimes(1);
    done();
  });

  test(' get CODE function test', (done) => {
    const value = DownloadHelper.CODE;
    expect(value).toEqual({
      FILE_NOT_FOUND: 'FILE_NOT_FOUND',
      DEVICE_STORAGE: 'DEVICE_STORAGE',
      MIME_TYPE_NOT_SUPPORTED: 'MIME_TYPE_NOT_SUPPORTED',
      INVALID_STATE: 'INVALID_STATE',
      NO_SDCARD: 'NO_SDCARD',
      NO_PROVIDER: 'NO_PROVIDER',
      UNMOUNTED_SDCARD: 'UNMOUNTED_SDCARD'
    });
    done();
  });

  test('wallpaper function test', (done) => {
    jest.useFakeTimers();
    const download1 = {
      state: 'downloading'
    };
    const {
      wallpaper
    } = DownloadHelper;

    const value = wallpaper(download1);
    value.onerror = jest.fn();
    expect(value.onerror).toBeCalledTimes(0);

    jest.runAllTimers();
    expect(value.onerror).toBeCalledTimes(1);
    expect(value.onerror.mock.calls[0][0].target.error).toEqual({
      "code": "INVALID_STATE",
      "message": "Becareful, the download is not finished!"
    });
    done();
  });

  test('ringtone function test', (done) => {
    jest.useFakeTimers();
    const {
      ringtone
    } = DownloadHelper;
    const spy = jest
      .spyOn(MimeMapper, 'guessTypeFromFileProperties')
      .mockReturnValue('');

    const value = ringtone(download);
    value.onsuccess = jest.fn();
    value.done();
    expect(spy).toBeCalledTimes(0);

    jest.runAllTimers();
    expect(spy).toBeCalledTimes(1);
    done();
  });

  test('info function test', (done) => {
    jest.useFakeTimers();
    const {
      info
    } = DownloadHelper;
    jest
      .spyOn(MimeMapper, 'guessTypeFromFileProperties')
      .mockReturnValue('application/x-debian-package');

    const value = info(download);
    value.onsuccess = jest.fn();
    value.done();
    expect(value.onsuccess).toBeCalledTimes(0);

    jest.runAllTimers();
    expect(value.onsuccess).toBeCalledTimes(1);
    done();
  });

  test('getFreeSpace function test', (done) => {
    const {
      getFreeSpace
    } = DownloadHelper;
    const cb = jest.fn();

    getFreeSpace(cb);
    expect(cb).toHaveBeenCalled();

    let getDeviceStorageSpy = jest.spyOn(navigator.b2g, 'getDeviceStorage')
      .mockReturnValueOnce(false);
    getFreeSpace(cb);
    expect(getDeviceStorageSpy).toHaveBeenCalled();

    done();
  });

  //download.state !== "succeeded"
  test('remove function test when download.state !== "succeeded"', (done) => {
    jest.useFakeTimers();
    const pauseSpy = jest
      .spyOn(download, 'pause')
      .mockResolvedValueOnce('resolve')
      .mockRejectedValueOnce('reject')
      .mockResolvedValueOnce('resolve');
    const load = {
      path: "/downloads",
      state: "succeeded"
    };
    jest
      .spyOn(navigator.b2g.downloadManager, 'remove')
      .mockResolvedValueOnce(load)
      .mockRejectedValueOnce('reject');
    const {
      remove
    } = DownloadHelper;

    //download.pause -->  resolved  &  navigator.b2g.downloadManager.remove -->resolved
    remove(download);
    //download.pause -->  rejected
    remove(download);
    //download.pause -->  resolved & navigator.b2g.downloadManager.remove --> rejected
    remove(download);
    expect(pauseSpy).toBeCalledTimes(0);

    jest.runAllTimers();
    expect(pauseSpy).toBeCalledTimes(3);
    done();
  });

  //download.state === "succeeded" -->  doRemoveFromPhone(req, download);
  test('remove function test when download.state === "succeeded"', (done) => {
    jest.useFakeTimers();
    const download2 = {
      state: "succeeded",
    };
    const {
      remove
    } = DownloadHelper;

    const value = remove(download2);
    jest.runAllTimers();
    expect(typeof value).toBe('object');
    done();
  });

  test('handlerError function test', (done) => {
    const {
      handlerError
    } = DownloadHelper;
    const cb = jest.fn();
    const req = {
      done: jest.fn(),
      failed: jest.fn(),
      onsuccess: jest.fn(),
      onerror: jest.fn()
    };
    const showSpy = jest
      .spyOn(DownloadUI, 'show')
      .mockReturnValue(req);

    const error1 = {
      message: 'errorCancelled'
    };
    handlerError(error1, download, cb);
    expect(cb.mock.calls[0][0]).toEqual(null);

    const error2 = {
      code: 'NO_SDCARD'
    };
    handlerError(error2, download, cb);
    expect(showSpy).toBeCalledTimes(1);
    expect(showSpy.mock.calls[0][0].name).toEqual('no_sdcard_found_2');

    const error3 = {
      code: 'MIME_TYPE_NOT_SUPPORTED'
    };
    handlerError(error3, download, cb);
    expect(showSpy).toBeCalledTimes(2);
    expect(showSpy.mock.calls[1][0].name).toEqual('unsupported_file_type');

    const error4 = {
      code: 'else'
    };
    handlerError(error4, download, cb);
    expect(showSpy).toBeCalledTimes(3);
    expect(showSpy.mock.calls[2][0].name).toEqual('file_open_error');
    done();
  });

  test('open function test 2', async (done) => {
    jest.useFakeTimers();
    const {
      open
    } = DownloadHelper;

    jest
      .spyOn(MimeMapper, 'guessTypeFromFileProperties')
      .mockReturnValue('application/zip');

    jest
      .spyOn(global, 'setTimeout');

    const getFileNameSpy = jest
      .spyOn(DownloadFormatter, 'getFileName');

    const value = open(download);
    value.onsuccess = jest.fn();
    value.done();
    jest.advanceTimersByTime(100);
    jest.advanceTimersByTime(100);

    expect(getFileNameSpy).toBeCalledTimes(1);
    expect(value.onsuccess).toBeCalledTimes(1);
    expect(setTimeout).toBeCalledTimes(2);
    expect(setTimeout).toBeCalledWith(expect.any(Function), 0);
    expect(typeof value).toBe('object');
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});