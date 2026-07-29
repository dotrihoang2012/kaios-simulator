describe('<download_formatter.js> test', () => {
  beforeAll((done) => {
    require('../mocks/l10n');
    require('../../js/download/download_formatter');
    done();
  });

  beforeEach((done) => {
    jest
      .spyOn(window.api.l10n, 'get')
      .mockImplementation((name, obj) => {
        return obj;
      });
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
    startTime: new Date(),
    id: "download-0",
    addEventListener: () => {}
  };

  test('DownloadFormatter test', (done) => {
    expect(typeof DownloadFormatter).toBe('object');
    done();
  });

  test('getFileName function test', (done) => {
    const {
      getFileName
    } = DownloadFormatter;
    const value = getFileName({
      path: '/home/user/test/test1.txt'
    });
    expect(value).toBe('test1.txt');
    done();
  });

  test('getUUID function test', (done) => {
    const {
      getUUID
    } = DownloadFormatter;

    //1,If there is an id, return the id
    const value1 = getUUID({
      id: '44e0744c-69f1'
    });

    //2,If no id, call the getFileName function
    const value2 = getUUID({
      path: 'test.txt'
    });
    expect(value1).toBe('44e0744c-69f1');
    expect(value2).toBe('test.txt');
    done();
  });

  test('getDate function test', (done) => {
    const {
      getDate
    } = DownloadFormatter;
    const cb = jest.fn();

    window.api.l10n.DateTimeFormat.mockImplementation(() => {
      function fromNow(date) {
        return '2020 | 12 | 25 | 23:00';
      }
      return {
        fromNow
      };
    });

    getDate({
      startTime: '2020 | 12 | 24 | 18:00'
    }, cb);

    expect(cb).toHaveBeenCalledTimes(1);
    done();
  });

  test('getPercentage function test', (done) => {
    const {
      getPercentage
    } = DownloadFormatter;
    const value1 = getPercentage(download);
    const value2 = getPercentage({
      currentBytes: 695,
      totalBytes: 0
    });
    expect(value1).toBe(14)
    expect(value2).toBe(0)
    done();
  });

  test('getFormattedSize function test', (done) => {
    const {
      getFormattedSize
    } = DownloadFormatter;

    //1,bytes === undefined || isNaN(bytes)  --> return null
    const value1 = getFormattedSize(undefined);
    const value2 = getFormattedSize('t');
    expect(value1).toBe(null);
    expect(value2).toBe(null);

    //2,bytes is number
    const value3 = getFormattedSize(3076);
    expect(value3.size).toBe('3.0');
    done();
  });

  test('getTotalSize function test', (done) => {
    const {
      getTotalSize
    } = DownloadFormatter;

    const value = getTotalSize({
      totalBytes: 8754
    });
    expect(value.size).toBe('8.5');
    done();
  });

  test('getDownloadedSize function test', (done) => {
    const {
      getDownloadedSize
    } = DownloadFormatter;

    const value = getDownloadedSize({
      currentBytes: 1865
    });
    expect(value.size).toBe('1.8');
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});