describe('<download_notification_store.js> test', () => {
  beforeAll((done) => {
    require('../mocks/asyncStorage.js');
    require('../../js/download/download_notification_store');
    done();
  });

  test('DownloadNotificationStore test', (done) => {
    expect(typeof DownloadNotificationStore).toBe('object');
    done();
  });

  test('init function test if there is a cache', (done) => {
    const {
      init
    } = DownloadNotificationStore;

    const cache = '{"storageName":"sdcard"}';

    const getSpy = jest
      .spyOn(window.asyncStorage, 'getItem')
      .mockImplementation((key, callback) => {
        callback(cache);
      });

    const setSpy = jest
      .spyOn(window.asyncStorage, 'setItem');

    init();
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy.mock.calls[0][1]).toEqual('{\"storageName\":\"true\"}');
    done();
  });

  test('addNotification & removeNotification & isDeletedNotification functions test', (done) => {
    const {
      addNotification,
      removeNotification,
      isDeletedNotification
    } = DownloadNotificationStore;

    const setSpy = jest
      .spyOn(window.asyncStorage, 'setItem');

    addNotification('test');
    const value1 = isDeletedNotification('test');
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(value1).toBe(false);

    removeNotification('test');
    const value2 = isDeletedNotification('test');
    expect(setSpy).toHaveBeenCalledTimes(2);
    expect(value2).toBe(true);
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});