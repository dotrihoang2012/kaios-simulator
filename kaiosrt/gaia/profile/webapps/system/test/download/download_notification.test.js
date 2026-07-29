// eslint-disable-next-line
import '../mocks/l10n.js';
import '../mocks/asyncStorage.js';
import '../mocks/mock_appOrigin.js';
import '../mocks/service.js';
import '../mocks/mock_download_formatter.js';
import '../mocks/mock_download_ui.js';
import '../mocks/mock_download_handler.js';

require('../../js/download/download_notification');
require('../../js/download/download_notification_store');

class WebActivity {
  start() {
    return new Promise (resolve => {
      resolve();
    })
  }
}
global.WebActivity = WebActivity;

describe('download notification', () => {
  let DownloadNotification;
  let ERRORS = {
    NO_MEMORY: 2152857616,
    NO_SDCARD: 2152857618,
    UNMOUNTED_SDCARD: 2152857621
  };

  beforeAll((done) => {
    DownloadNotification =  new window.DownloadNotification({
      totalBytes: 5242880,
      currentBytes: 755617,
      url: "http://web4host.net/5MB.zip",
      path: "/mnt/media_rw/9016-4EF8/downloads/5MB.zip",
      storageName: "sdcard",
      storagePath: "downloads/5MB.zip",
      state: "downloading",
      contentType: "application/zip",
      startTime: new Date(),
      id: "download-0",
      error: null,
      addEventListener: () => {},
      removeEventListener: () => {}
     });
    done();
  });

  test('download notification _wontNotify', (done) => {
    expect(DownloadNotification._wontNotify()).toBe(true);
    expect( DownloadNotification.state).toBe('downloading');
    done();
  });

  test('download notification _onStopped', (done) => {
    window.isOnline = () => false;
    DownloadNotification._onStopped();
    expect(DownloadNotification.state).toBe('downloading');

    done()
  });

  test('download notification _onStopped 2', (done) => {
    DownloadNotification.download.error = {
      message: ERRORS.NO_MEMORY
    };
    DownloadNotification._onStopped();
    expect(DownloadNotification.state).toBe('failed');

    DownloadNotification.download.error.message = ERRORS.NO_SDCARD;
    DownloadNotification._onStopped();
    expect(DownloadNotification.state).toBe('failed');

    DownloadNotification.download.error.message = ERRORS.UNMOUNTED_SDCARD;
    DownloadNotification._onStopped();
    expect(DownloadNotification.state).toBe('failed');

    DownloadNotification.download.error.message = '00';
    DownloadNotification._onStopped();
    expect(DownloadNotification.state).toBe('failed');

    done()
  });

  test('download notification statechange event', (done) => {
    window.DownloadObject = () => { return true; };
    window.NotificationService = {
      send: jest.fn()
    }
    DownloadNotification.download.state = 'finalized';
    DownloadNotification._update();

    DownloadNotification.download.state = 'succeeded';
    DownloadNotification._update();

    DownloadNotification.download.state = 'stopped';
    DownloadNotification._update({});

    expect(DownloadNotification.download.state).toEqual('stopped');
    done()
  });

  test('download notification showDownloadUI', (done) => {
    let type = {
      name: 'open'
    }

    DownloadNotification.showDownloadUI(type, jest.fn());
    expect(Service.request).toHaveBeenCalled();

    done()
  });

  test('download notification onClick', (done) => {
    DownloadNotification.download.state = 'downloading';
    DownloadNotification.onClick();

    DownloadNotification.download.state = 'succeeded';
    DownloadNotification.onClick();

    expect(DownloadHandler.handlerOpenDownload).toHaveBeenCalledTimes(1);
    done()
  });
});
