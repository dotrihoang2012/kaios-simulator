describe('<download_handler.js> test', () => {
  beforeAll((done) => {
    require('../mocks/l10n');
    require('../mocks/service');
    require('../../js/download/download_ui');
    require('../../js/download/download_handler');
    done();
  });

  const download = {
    totalBytes: 5242880,
    currentBytes: 755617,
    url: "http://web4host.net/5MB.zip",
    path: "/mnt/media_rw/9016-4EF8/downloads/5…",
    storageName: "sdcard",
    storagePath: "downloads/5MB.zip",
    state: "downloading",
    contentType: "application/zip",
    startTime: new Date('2020-12-12T00:00:00.000Z'),
    id: "download-0"
  };

  test('fileNotFoundDialog function test', (done) => {
    const {
      fileNotFoundDialog
    } = DownloadHandler;
    fileNotFoundDialog('test.js');
    expect(Service.request).toHaveBeenCalledTimes(1);
    done();
  });

  test('handlerOpenDownload function test', (done) => {
    const {
      handlerOpenDownload
    } = DownloadHandler;

    global.DownloadHelper = {
      open: jest.fn(() => {
        return {
          error: {
            message: 'cancelled',
          },
          set onerror(callback) {
            callback({
              filename: 'test.js',
              download: download,
              error: this.error
            });
          }
        };
      }),
    };

    handlerOpenDownload(download, 'test.js');
    expect(global.DownloadHelper.open).toHaveBeenCalledTimes(1);
    done();
  });

  test('handlerError &  showDownloadUI functions test', (done) => {
    const {
      handlerError
    } = DownloadHandler;

    handlerError({
      filename: 'test.js',
      download: download,
      error: {
        code: 'NO_SDCARD'
      }
    });
    expect(Service.request).toHaveBeenCalledTimes(1);
    expect(Service.request.mock.calls[0][1].content).toEqual('no_sdcard_found_2_download_message');

    handlerError({
      filename: 'test.js',
      download: download,
      error: {
        code: 'FILE_NOT_FOUND'
      }
    });
    expect(Service.request).toHaveBeenCalledTimes(2);
    expect(Service.request.mock.calls[1][1].content).toEqual('download_file_not_found_body');

    handlerError({
      filename: 'test.js',
      download: download,
      error: {
        code: 'FILE_OPEN_ERROR'
      }
    });
    expect(Service.request).toHaveBeenCalledTimes(3);
    expect(Service.request.mock.calls[2][1].content).toEqual('file_open_error_download_message');
    done();
  });


  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});