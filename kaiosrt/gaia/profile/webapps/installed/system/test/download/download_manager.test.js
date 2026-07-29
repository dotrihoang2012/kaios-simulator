global.tick = () => new Promise(res => setImmediate(res));
describe('<download_manager.js> test', () => {

  beforeAll((done) => {
    require('../mocks/navigator/downloadManager');
    require('../mocks/service');
    require('../mocks/lazy_loader');
    require('../mocks/Notification');
    require('../mocks/mock_download_notification_store.js')
    require('../mocks/mock_download_handler');
    require('../../js/download/download_manager');

    done();
  });

  test('logohidden event test', (done) => {
    const download = {
      path: "/downloads",
      state: "succeeded"
    };
    const getDownloadsSpy = jest
      .spyOn(navigator.b2g.downloadManager, 'getDownloads')
      .mockResolvedValue([download]);
    const message = {
      tag: '/downloads',
      title: 'title'
    };
    const notif = {
      tag: '/downloads',
      close: jest.fn()
    };
    const requestSpy = jest
      .spyOn(Service, 'request')
      .mockImplementation((parm1, parm2, obj) => {
        if (typeof obj !== 'undefined' && typeof obj !== 'boolean') {
          obj.handleSystemMessageNotification(message);
        }
      });
    window.dispatchEvent(new CustomEvent('logohidden'));
    navigator.b2g.downloadManager.dispatchEvent(new CustomEvent('downloadstart'));
    expect(requestSpy).toHaveBeenCalledTimes(2);
    expect(getDownloadsSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('init-download-notifications event test', async (done) => {
    let download = {
      path: "/downloads",
      state: "started"
    };
    const getDownloadsSpy = jest
      .spyOn(navigator.b2g.downloadManager, 'getDownloads')
      .mockResolvedValue([download]);

    const requestSpy = jest.spyOn(Service, 'request');
    window.DownloadNotification = jest.fn();

    window.dispatchEvent(new CustomEvent('init-download-notifications'));
    await tick();
    expect(requestSpy).toHaveBeenCalledTimes(1);
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});
