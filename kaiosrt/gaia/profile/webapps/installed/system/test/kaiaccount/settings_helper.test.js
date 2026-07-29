describe('<settings_helper.js> test', () => {
  beforeAll((done) => {
    require('../mocks/SettingsObserver');
    require('../../js/kaiaccount/settings_helper');
    done();
  });

  test('KaiAccountSettingsHelper test', (done) => {
    expect(typeof KaiAccountSettingsHelper).toBe('object');
    done();
  });

  test('getValue test', async (done) => {
    jest
      .spyOn(SettingsObserver, 'getValue')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValue('kkk');

    const value1 = KaiAccountSettingsHelper.getValue('key');
    const value2 = KaiAccountSettingsHelper.getValue('deviceinfo.build_number', '30', true);
    const value3 = KaiAccountSettingsHelper.getValue('deviceinfo.build_number', '30', false);

    await expect(value1).resolves.toEqual('');
    await expect(value2).resolves.toEqual({
      'deviceinfo.build_number': '30'
    });
    await expect(value3).resolves.toEqual('30');
    done();
  });

  test('getValues test', async (done) => {
    const settingsObj = {
      a: 'testA',
      b: 'testB'
    };
    SettingsObserver.setValue([{
      name: 'a',
      value: 'test'
    }]);
    const value = KaiAccountSettingsHelper.getValues(settingsObj);

    await expect(value).resolves.toEqual({
      a: 'test',
      b: 'testB'
    });
    done();
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});
