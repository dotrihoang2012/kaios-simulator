/* eslint-disable no-undef */
import '../../test/mocks/SettingsObserver';
import '../../test/mocks/navigator/downloadManager';
import '../../test/mocks/service';

describe('media_storage_monitor.js test', () => {
  let instance = null;
  let SettingsObserver = null;
  let downloadManagerSpy = null;
  beforeAll(done => {
    SettingsObserver = jest.spyOn(global.SettingsObserver, 'observe')
      .mockImplementation((key, defaultValue, callback) => {
        callback(key);
      });
    downloadManagerSpy = jest.spyOn(navigator.b2g.downloadManager, 'addEventListener');
    instance = require('../media_storage_monitor').default;
    done();
  });

  test('start event test', done => {
    expect(SettingsObserver).toHaveBeenCalledTimes(1);
    expect(downloadManagerSpy).toHaveBeenCalledTimes(1);
    done();
  });

  test('downloadStart event test', done => {
    const evt = {
      download: { addEventListener: jest.fn() }
    };
    instance.downloadStart(evt);
    expect(evt.download.addEventListener).toHaveBeenCalledTimes(1);
    done();
  });

  test('stateChange event test', done => {
    const WebActivity = jest.fn();
    WebActivity.prototype.start = jest.fn();
    window.WebActivity = WebActivity;
    Service.request.mockImplementation((service, obj) => {
      obj.onOk();
    });
    const evt = {
      download: {
        id: 'id',
        state: 'stopped',
        error: { message: '2152857616' }
      }
    };
    instance.stateChange(evt);
    done();
  });

  afterEach(done => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});
