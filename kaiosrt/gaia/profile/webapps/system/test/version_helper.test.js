import '../js/version_helper';

describe('version helper', () => {

  beforeEach(done => {
    require('./mocks/SettingsObserver');
    done();
  });

  test('version_helper --> getVersionInfo', async (done) => {
    const { VersionHelper } = window;
    const spyObserver = jest
      .spyOn(SettingsObserver, 'getValue')
      .mockResolvedValueOnce('2.0.9')
      .mockResolvedValueOnce('1.5.1');
    const result = await VersionHelper.getVersionInfo();
    expect(result.current.major).toBe('2');
    expect(result.current.minor).toBe('0');
    expect(result.previous.major).toBe('1');
    expect(result.previous.minor).toBe('5');
    expect(result.isUpgrade()).toBe(true);
    expect(result.delta()).toBe('1.5..2.0');
    spyObserver.mockRestore();
    done();
  });

  test('version_helper --> updatePrevious', async (done) => {
    const { VersionHelper } = window;
    // current version
    const spyObserver = jest
      .spyOn(SettingsObserver, 'getValue')
      .mockResolvedValueOnce('10.0.1');
    const result = await VersionHelper.updatePrevious('11.1.1');
    expect(result.major).toBe('11');
    expect(result.minor).toBe('1');
    spyObserver.mockRestore();
    done();
  });
});
