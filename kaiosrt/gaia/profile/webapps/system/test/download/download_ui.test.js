describe('<download_ui.js> test', () => {
  beforeAll((done) => {
    global.SettingsSoftkey = {
      init: jest.fn(),
      show: jest.fn()
    };
    global.MimeMapper = {
      guessTypeFromFileProperties: jest.fn()
    };

    require('../mocks/mock_download_formatter')
    require('../mocks/navigator/downloadManager');
    require('../mocks/lazy_loader');
    require('../../js/download/download_ui');
    done();
  });

  beforeEach((done) => {
    document.body.innerHTML = `
      <div id='download-confirm-dialog'>
        <header id='downloads-header'>
          <h3>header</h3>
        </header>
      <div id='downloadList'>
        <ul id='downloads' class='edit'><li></li></ul>
      </div>
      <footer>footer</footer>
    </div>
      `;
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

  //Confirmation type === null
  test('show function test when Confirmation type === null', (done) => {
    jest.useFakeTimers();
    const download1 = {
      state: 'stopped',
      error: 'error'
    };
    const {
      show
    } = DownloadUI;
    const spy = jest
      .spyOn(LazyLoader, 'load');

    show(null, [download], false);
    show(null, download1, true);

    jest.runAllTimers();
    expect(spy).toBeCalledTimes(2);
    expect(spy.mock.calls[0][0].length).toBe(3);
    expect(spy.mock.calls[1][0].length).toBe(1);
    done();
  });

  //Confirmation type.isPlainMessage === true & type.name === 'stopped' || type.name === 'failed'
  test("when Confirmation type.isPlainMessage === true & (type.name === 'stopped' || type.name === 'failed') --> create confirm ", (done) => {
    jest.useFakeTimers();
    const {
      show
    } = DownloadUI;
    const type = {
      isPlainMessage: true,
      name: 'stopped'
    };
    const spy = jest
      .spyOn(window, 'dispatchEvent');

    show(type, [download], true);

    jest.runAllTimers();
    expect(SettingsSoftkey.init).toBeCalledTimes(1);
    const cancleMethod = SettingsSoftkey.init.mock.calls[0][0].items[0].method;
    const resumeMethod = SettingsSoftkey.init.mock.calls[0][0].items[1].method;
    cancleMethod();
    expect(spy).toBeCalledTimes(1);
    resumeMethod();
    jest.runOnlyPendingTimers();
    expect(spy).toBeCalledTimes(2);
    done();
  });

  //Confirmation type.name === 'file_not_found'
  test("when Confirmation type.name === 'file_not_found'--> create confirm ", (done) => {
    jest.useFakeTimers();
    const {
      show
    } = DownloadUI;
    const type = {
      name: 'file_not_found'
    };
    const spy = jest
      .spyOn(window, 'dispatchEvent');

    show(type, [download], true);

    jest.runAllTimers();
    expect(SettingsSoftkey.init).toBeCalledTimes(1);
    const skOkMethod = SettingsSoftkey.init.mock.calls[0][0].items[0].method;
    skOkMethod();
    expect(spy).toBeCalledTimes(1);
    done();
  });

  //Confirmation type.name === 'file_open_error'
  test("when Confirmation type.name === 'file_open_error'--> create confirm ", (done) => {
    jest.useFakeTimers();
    const {
      show
    } = DownloadUI;
    const type = {
      name: 'file_open_error'
    };
    const spy = jest
      .spyOn(window, 'dispatchEvent');

    show(type, [download], true);

    jest.runAllTimers();
    expect(SettingsSoftkey.init).toBeCalledTimes(1);
    const skLCancelMethod = SettingsSoftkey.init.mock.calls[0][0].items[0].method;
    const skRDeleteMethod = SettingsSoftkey.init.mock.calls[0][0].items[1].method;
    skLCancelMethod();
    expect(SettingsSoftkey.init.mock.calls[0][0].items[0].method).toBe(null);
    skRDeleteMethod();
    expect(SettingsSoftkey.init.mock.calls[0][0].items[1].method).toBe(null);
    expect(spy).toBeCalledTimes(2);
    done();
  });

  //Confirmation type.name === 'stop'
  test("when Confirmation type.name === 'stop'--> create confirm ", (done) => {
    jest.useFakeTimers();
    const {
      show
    } = DownloadUI;
    const type = {
      name: 'stop'
    };

    show(type, [download], true);

    jest.runAllTimers();
    expect(SettingsSoftkey.init).toBeCalledTimes(1);
    const skNoMethod = SettingsSoftkey.init.mock.calls[0][0].items[0].method;
    const skYesMethod = SettingsSoftkey.init.mock.calls[0][0].items[1].method;
    expect(typeof skNoMethod).toBe('function');
    skNoMethod();
    expect(SettingsSoftkey.init.mock.calls[0][0].items[0].method).toBe(null);
    skYesMethod();
    jest.runOnlyPendingTimers();
    expect(SettingsSoftkey.init.mock.calls[0][0].items[1].method).toBe(null);
    done();
  });

  //Confirmation type.name === 'delete_all'
  test("when Confirmation type.name === 'delete_all'--> create confirm ", (done) => {
    jest.useFakeTimers();
    const {
      show
    } = DownloadUI;
    const type = {
      name: 'delete_all'
    };
    const downPanel = document.getElementById('downloads');
    const downLoadList = document.getElementById('downloadList');
    const firChildNode = downLoadList.firstElementChild.childNodes[0];
    expect(downPanel.classList.contains('edit')).toBe(true);
    expect(firChildNode.classList.contains('focus')).toBe(false);
    show(type, [download], true);

    jest.runAllTimers();
    expect(SettingsSoftkey.init).toBeCalledTimes(1);
    expect(downPanel.classList.contains('edit')).toBe(false);
    const skLCancelMethod = SettingsSoftkey.init.mock.calls[0][0].items[0].method;
    const skRDeleteMethod = SettingsSoftkey.init.mock.calls[0][0].items[1].method;
    skLCancelMethod();
    skRDeleteMethod();
    jest.runOnlyPendingTimers();
    expect(firChildNode.classList.contains('focus')).toBe(true);
    done();
  });

  test('showActions & hide functions test', (done) => {
    jest.useFakeTimers();
    const {
      showActions,
      hide
    } = DownloadUI;
    jest
      .spyOn(MimeMapper, 'guessTypeFromFileProperties')
      .mockReturnValue('image/x-3ds');

    showActions(download);

    jest.runAllTimers();
    const form = document.getElementById('downloadActionMenuUI');
    expect(form.hasAttribute('role')).toBe(true);
    expect(form.getAttribute('data-type')).toBe('action');
    expect(form.style.display).toBe('block');

    hide();
    expect(form.style.display).toBe('none');
    done();
  });

  test(' get ERRORS test', (done) => {
    const value = DownloadUI.ERRORS;
    expect(value).toEqual({
      NO_MEMORY: 2152857616,
      NO_SDCARD: 2152857618,
      UNMOUNTED_SDCARD: 2152857621
    });
    done();
  });

  test(' get TYPE test', (done) => {
    const value = DownloadUI.TYPE;
    const keys = Object.keys(value);
    expect(keys).toEqual(["STOP", "STOPPED", "FAILED", "DELETE", "DELETE_ALL", "UNSUPPORTED_FILE_TYPE", "FILE_NOT_FOUND", "FILE_OPEN_ERROR", "NO_SDCARD", "UNMOUNTED_SDCARD", "NO_PROVIDER", "NO_MEMORY"]);
    done();
  });

  afterEach((done) => {
    document.body.innerHTML = '';
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});