import mockAudioContext from '../mocks/mock_AudioContext';

describe('<notify.js> test', () => {
  const {
    mockB2gNavigator
  } = require('../mocks/navigator/b2g_navigator_mock');
  const oldAudioContext = window.AudioContext;

  beforeAll((done) => {
    window.AudioContext = mockAudioContext;
    global.navigator.b2g = {};
    const mockaudioChannelManager = {
      headphones: null
    };
    mockB2gNavigator(global, 'audioChannelManager', mockaudioChannelManager);
    require('../mocks/SettingsObserver');
    require('../../js/cmas/notify');
    done();
  });

  test('Notify test', (done) => {
    expect(typeof Notify).toBe('object');
    done();
  });

  test('notify function test', (done) => {
    jest
      .spyOn(SettingsObserver, 'getValue')
      .mockResolvedValueOnce('audio.volume.notification')
      .mockResolvedValueOnce('vibration.enabled');

    const spy = jest
      .spyOn(Promise, 'all');

    const {
      notify
    } = Notify;

    notify();
    expect(SettingsObserver.getValue).toBeCalledTimes(2);
    expect(spy).toBeCalledTimes(1);
    done();
  });

  afterAll(() => {
    window.AudioContext = oldAudioContext;
  });

  afterEach((done) => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    done();
  });
});