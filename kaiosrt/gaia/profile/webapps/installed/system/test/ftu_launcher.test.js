require('./mocks/service');
require('./mocks/SettingsObserver');
require('./mocks/mock_appOrigin');
require('./mocks/AppsManager');
require('./mocks/asyncStorage');
require('./mocks/SettingsObserver');
require('./mocks/mock_applications');

global.tick = () => new Promise(res => setImmediate(res));

global.VersionHelper = {
   getVersionInfo: jest.fn(),
   updatePrevious: jest.fn()
};


describe('ftu_launcher test. init', () => {
  beforeAll(() => {
    jest.spyOn(window, 'addEventListener')
    require('../js/ftu_launcher.js');
    expect(Service.registerState.mock.calls[0][0]).toEqual('isFtuUpgrading');
    expect(Service.registerState.mock.calls[1][0]).toEqual('isFtuRunning');
    expect(window.addEventListener).toBeCalledTimes(3);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  test('ftu_launcher retrieve test', async () => {
    jest.spyOn(FtuLauncher, '_removeObserver').mockImplementation(jest.fn());
    jest.spyOn(FtuLauncher, 'launch').mockImplementation(jest.fn());
    jest.spyOn(FtuLauncher, 'skip').mockImplementation(jest.fn());
    jest.spyOn(VersionHelper, 'getVersionInfo')
      .mockResolvedValueOnce({ isUpgrade: ()=> true })
      .mockResolvedValueOnce({ isUpgrade: ()=> false })
      .mockRejectedValueOnce();

    // isUpgrade true
    expect(FtuLauncher.isFtuUpgrading()).toBe(false);
    FtuLauncher.retrieve();
    await tick();
    expect(FtuLauncher.isFtuUpgrading()).toBe(true);
    expect(FtuLauncher.launch).toBeCalledTimes(1);

    // isUpgrade false
    jest.clearAllMocks();
    FtuLauncher._isUpgrading = false;
    expect(FtuLauncher.isFtuUpgrading()).toBe(false);
    jest.spyOn(window.asyncStorage, 'getItem')
      .mockImplementation((key, callback) => callback(false));
    FtuLauncher.retrieve();
    await tick();
    expect(FtuLauncher.isFtuUpgrading()).toBe(true);
    expect(FtuLauncher.launch).toBeCalledTimes(1);

    // reject
    jest.clearAllMocks();
    jest.spyOn(FtuLauncher, 'skip');
    FtuLauncher._isUpgrading = false;
    expect(FtuLauncher.isFtuUpgrading()).toBe(false);
    FtuLauncher.retrieve();
    await tick();
    expect(FtuLauncher.isFtuUpgrading()).toBe(false);
    expect(FtuLauncher.skip).toBeCalledTimes(1);
  });

  test('ftu_launcher _handle_home / _handle_holdhome test', () => {
    Service.set('getTopMostWindow', {
      isBrowser: () => true,
    });
    FtuLauncher._isRunningFirstTime = true;
    expect(FtuLauncher.respondToHierarchyEvent({
      type: 'home', detail: { back: true }
    })).toBe(true);
    expect(FtuLauncher.respondToHierarchyEvent({ type: 'holdhome' })).toBe(false);

    Service.set('getTopMostWindow', {
      isBrowser: () => false,
    });
    expect(FtuLauncher.respondToHierarchyEvent({
      type: 'home', detail: { back: true }
    })).toBe(false);

    FtuLauncher._isRunningFirstTime = false;
    expect(FtuLauncher.respondToHierarchyEvent({
      type: 'home',  detail: { back: true }
    })).toBe(true);
    expect(FtuLauncher.respondToHierarchyEvent({ type: 'holdhome' })).toBe(true);
  });

  test('ftu_launcher launch test', async () => {
    jest.spyOn(FtuLauncher, '_removeObserver').mockImplementation(jest.fn());
    jest.spyOn(FtuLauncher, 'skip');
    jest.spyOn(SettingsObserver, 'getValue')
      .mockResolvedValue('http://ftu.local/manifest.webmanifest');
    FtuLauncher._isUpgrading = false;
    FtuLauncher.launch();
    await tick();
    expect(FtuLauncher._hasFTU).toBe(true);
    expect(window.AppsManager.launch).toBeCalledTimes(1);

    jest.clearAllMocks();
    FtuLauncher._isUpgrading = true;
    FtuLauncher._ftu.manifest.versionCode = '0.0.1';
    jest.spyOn(window.asyncStorage, 'getItem')
      .mockImplementation((key, callback) => callback('0.0.1'));
    FtuLauncher.launch();
    await tick();
    expect(FtuLauncher.skip).toBeCalledTimes(1);

    jest.clearAllMocks();
    FtuLauncher._isUpgrading = true;
    FtuLauncher._ftu.manifest.versionCode = '0.0.1';
    jest.spyOn(window.asyncStorage, 'getItem')
      .mockImplementation((key, callback) => callback('0.0.2'));
    FtuLauncher.launch();
    await tick();
    expect(window.AppsManager.launch).toBeCalledTimes(1);

    expect(FtuLauncher.getFtuManifestUrl()).toEqual(FtuLauncher._ftuManifestUrl);
    expect(FtuLauncher.isFtuRunning()).toEqual(FtuLauncher._isRunningFirstTime);
    expect(FtuLauncher.isFinished()).toEqual(FtuLauncher._isFinished);
  });

  test('ftu_launcher apploadtime test', () => {
    jest.spyOn(window, 'dispatchEvent');
    FtuLauncher._isRunningFirstTime = true;
    window.dispatchEvent(new CustomEvent('apploadtime', {
      detail: { src: 'http://ftu.local/manifest.webmanifest' }
    }));
    expect(window.dispatchEvent.mock.calls[1][0].type).toEqual('ftuopen');
    FtuLauncher._isRunningFirstTime = false;
  });

  test('ftu_launcher applocationchange test', () => {
    jest.spyOn(window, 'dispatchEvent');
    FtuLauncher._isRunningFirstTime = true;
    window.dispatchEvent(new CustomEvent('applocationchange', {
      detail: {
        manifestUrl: 'http://ftu.local/manifest.webmanifest',
        browser: { element: { dataset: { url: 'test-url' }}}
      }
    }));
    expect(window.dispatchEvent.mock.calls[1][0].type).toEqual('ftucomms');
    FtuLauncher._isRunningFirstTime = false;
  });

  test('ftu_launcher appterminated test', () => {
    jest.spyOn(window, 'dispatchEvent');
    jest.spyOn(FtuLauncher, '_removeObserver').mockImplementation(jest.fn());
    FtuLauncher._isRunningFirstTime = true;
    window.dispatchEvent(new CustomEvent('appterminated', {
      detail: {
        manifestUrl: 'http://ftu.local/manifest.webmanifest'
      }
    }));
    expect(window.dispatchEvent.mock.calls[1][0].type).toEqual('ftudone');
    FtuLauncher._isRunningFirstTime = false;
  });

  test('ftu_launcher _removeObserver test', () => {
    jest.spyOn(window, 'removeEventListener')
    FtuLauncher._removeObserver();
    expect(window.removeEventListener).toBeCalledTimes(3);
  });
});

